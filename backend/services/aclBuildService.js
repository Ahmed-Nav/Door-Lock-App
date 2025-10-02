// backend/services/aclBuildService.js
const crypto = require("crypto");
const Group = require("../models/Group");
const User = require("../models/User");
const UserKey = require("../models/UserKey");
const AclVersion = require("../models/AclVersion");
const Lock = require("../models/Lock");

const ADMIN_PRIV_PEM = process.env.ADMIN_PRIV_PEM; 
if (!ADMIN_PRIV_PEM)
  console.warn("ADMIN_PRIV_PEM missing (ACL signing will fail)");

function b64raw(buf) {
  return Buffer.from(buf).toString("base64");
}


async function collectUsersForLock(lockId) {
  const groups = await Group.find({ lockIds: lockId }).lean();
  const userIds = [...new Set(groups.flatMap((g) => g.userIds.map(String)))];
  if (userIds.length === 0) return [];
  const keys = await UserKey.find({ userId: { $in: userIds },active: true }).select({ kid: 1, pubB64: 1 }).lean();
  return keys.map(k => ({ kid: k.kid, pubB64: k.pubB64 }));
}

async function nextVersion(lockId) {
  const last = await AclVersion.findOne({ lockId })
    .sort({ version: -1 })
    .lean();
  return (last?.version || 0) + 1;
}

function signPayload(payloadJson) {
  const key = crypto.createPrivateKey(ADMIN_PRIV_PEM);
  // ECDSA P-256 with raw r||s (64 bytes)
  const derSig = crypto.sign(null, Buffer.from(payloadJson, "utf8"), {
    key,
    dsaEncoding: "der",
  });
  // Convert DER -> raw (r||s) 32+32; quick parse:
  // node >=16 supports dsaEncoding:'ieee-p1363' to get raw directly:
  const raw = crypto.sign(null, Buffer.from(payloadJson, "utf8"), {
    key,
    dsaEncoding: "ieee-p1363",
  });
  return b64raw(raw); // base64 for firmware
}

async function buildAndStore(lockId) {
  const users = await collectUsersForLock(lockId);
  const version = await nextVersion(lockId);
  const payload = { lockId, version, users };
  const payloadJson = JSON.stringify(payload);
  const sig = signPayload(payloadJson);

  const envelope = { sig, payload };
  await AclVersion.findOneAndUpdate(
    { lockId, version },
    { lockId, version, envelope, updatedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return envelope;
}

module.exports = { buildAndStore };
