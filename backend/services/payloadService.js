// backend/services/payloadService.js
const fs = require("fs");
const crypto = require("crypto");

function canonicalJson(obj) {
  // Stable key ordering (recursively)
  const sorter = (o) =>
    Array.isArray(o)
      ? o.map(sorter)
      : o && typeof o === "object"
      ? Object.keys(o)
          .sort()
          .reduce((acc, k) => ((acc[k] = sorter(o[k])), acc), {})
      : o;

  return JSON.stringify(sorter(obj));
}

function derToRawRS(derBuf) {
  if (derBuf[0] !== 0x30) throw new Error("bad der");
  let i = 2;
  if (derBuf[i] !== 0x02) throw new Error("bad int1");
  i++;
  const rlen = derBuf[i++];
  const r = derBuf.slice(i, i + rlen);
  i += rlen;
  if (derBuf[i] !== 0x02) throw new Error("bad int2");
  i++;
  const slen = derBuf[i++];
  const s = derBuf.slice(i, i + slen);
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

function signPayloadWithAdmin(payloadObj, adminPrivPemPath) {
  const payloadJson = canonicalJson(payloadObj);
  const adminPrivPem = fs.readFileSync(adminPrivPemPath, "utf8");

  const sign = crypto.createSign("SHA256");
  sign.update(Buffer.from(payloadJson, "utf8"));
  sign.end();

  const der = sign.sign({ key: adminPrivPem, dsaEncoding: "der" });
  const rawSig = derToRawRS(der);
  return { payloadJson, sigB64: rawSig.toString("base64") };
}

module.exports = { canonicalJson, signPayloadWithAdmin };
