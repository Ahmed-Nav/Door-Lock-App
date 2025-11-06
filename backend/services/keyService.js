// backend/services/keyService.js
const crypto = require("crypto");
const { generateKeyPairSync, createPrivateKey } = require("crypto");
const LockKey = require("../models/LockKey");

const ENC_KEY = Buffer.from(process.env.ADMIN_KEY_ENC_SECRET || "", "base64");
if (ENC_KEY.length !== 32) {
  console.warn(
    "[WARN] ADMIN_KEY_ENC_SECRET not 32 bytes base64 – set it in .env!"
  );
}

function aesGcmEncrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENC_KEY, iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encB64: Buffer.concat([enc, tag]).toString("base64"),
    ivB64: iv.toString("base64"),
  };
}

function aesGcmDecrypt(encB64, ivB64) {
  const buf = Buffer.from(encB64, "base64");
  const iv = Buffer.from(ivB64, "base64");
  const tag = buf.slice(buf.length - 16);
  const enc = buf.slice(0, buf.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", ENC_KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]);
}

function pubPointToUncompressed(keyObj) {
  const pub = crypto
    .createPublicKey(keyObj)
    .export({ type: "spki", format: "der" });
  // Make uncompressed 65-byte (0x04|X|Y)
  // Use Node’s JWK to extract X/Y reliably:
  const jwk = crypto.createPublicKey(keyObj).export({ format: "jwk" });
  const x = Buffer.from(jwk.x, "base64url");
  const y = Buffer.from(jwk.y, "base64url");
  return Buffer.concat([
    Buffer.from([0x04]),
    Buffer.concat([Buffer.alloc(32 - x.length), x]),
    Buffer.concat([Buffer.alloc(32 - y.length), y]),
  ]);
}

function generateP256KeyPairPEM() {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const privPem = privateKey.export({ type: "pkcs8", format: "pem" });
  const pubRaw = pubPointToUncompressed(privateKey); // 65B
  return { privPem, pubB64: pubRaw.toString("base64") };
}

async function getOrCreateLockKey(lockId, workspaceId) {
  if (!lockId || !workspaceId) {
    throw new Error(
      "lockId and workspaceId are required for Creating Lock Key"
    );
  }

  let doc = await LockKey.findOne({
    lockId: lockId,
    workspace_id: workspaceId,
    active: true,
  }).lean();
  if (doc) return doc;

  const { privPem, pubB64 } = generateP256KeyPairPEM();
  const { encB64, ivB64 } = aesGcmEncrypt(Buffer.from(privPem, "utf8"));

  try {
    doc = await LockKey.create({
      lockId: lockId,
      workspace_id: workspaceId,
      adminPubB64: pubB64,
      adminPrivEnc: encB64,
      adminPrivIv: ivB64,
      alg: "P-256",
      active: true,
    });
    return doc.toObject();
  } catch (e) {
    if (e.code === 11000) {
      return await LockKey.findOne({
        lockId: lockId,
        workspace_id: workspaceId,
        active: true,
      }).lean();
    }
    throw e;
  }
}

async function getActiveKey(lockId, workspaceId) {

  if (!lockId || !workspaceId) {
    throw new Error("lockId and workspaceId are required for getting Active Key");
  }

  const doc = await LockKey.findOne({
    lockId: lockId,
    workspace_id: workspaceId,
    active: true,
  }).lean();
  if (!doc) return null;
  const privPem = aesGcmDecrypt(doc.adminPrivEnc, doc.adminPrivIv).toString(
    "utf8"
  );
  return { privPem, adminPubB64: doc.adminPubB64, alg: doc.alg };
}

module.exports = { getOrCreateLockKey, getActiveKey };
