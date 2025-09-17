const fs = require('fs');
const crypto = require('crypto');

const lockId = Number(process.argv[2]);
const version = Number(process.argv[3]);
const adminPrivPath = process.argv[4];

if (!lockId || !version || !adminPrivPath) {
  console.error('Usage: node build_acl_envelope.js <lockId> <version> <adminPrivPath>');
  process.exit(1);
}

// replace with real users
const users = [
  {
    kid: "naveed",
    pub: "BLHyCuPXq9hEJ/2dowQ/YZdis0NbftROqVOFU3MXFPyIiTuh4iO5+8QbFlzjW3uJ5jONmMK8ItJmU4FHq6KnnMY=",
  }
];

const payload = { lockId, version, users };
const payloadJson = JSON.stringify(payload);

const adminPrivPem = fs.readFileSync(adminPrivPath, 'utf8');
const sign = crypto.createSign('SHA256');
sign.update(Buffer.from(payloadJson, 'utf8'));
sign.end();
const der = sign.sign({ key: adminPrivPem, dsaEncoding: 'der' });


// Convert DER r|s to raw 64B
function derToRawRS(derBuf) {
  // very small ASN.1 DER decoder for ECDSA sig
  let i = 3; // skip SEQUENCE 0x30 len
  if (derBuf[0] !== 0x30) throw new Error('bad der');
  if (derBuf[2] !== 0x02) throw new Error("bad int1");
  const rlen = derBuf[3];
  const r = derBuf.slice(4, 4 + rlen);
  let o = 4 + rlen;
  if (derBuf[o] !== 0x02) throw new Error("bad int2");
  const slen = derBuf[o + 1];
  const s = derBuf.slice(o + 2, o + 2 + slen);
  const zr = Buffer.concat([
    Buffer.alloc(Math.max(0, 32 - r.length)),
    r.slice(-32),
  ]);
  const zs = Buffer.concat([
    Buffer.alloc(Math.max(0, 32 - s.length)),
    s.slice(-32),
  ]);
  return Buffer.concat([zr, zs]);
}

const rawSig = derToRawRS(der);
const envelope = { sig: rawSig.toString('base64'), payload };
console.log(JSON.stringify(envelope, null, 2));