// backend/services/aclBuildService.js
const crypto = require("crypto");
const Group = require("../models/Group");
const User = require("../models/User");
const UserKey = require("../models/UserKey");
const AclVersion = require("../models/AclVersion");

function loadAdminPrivPem() {
  const pem = process.env.ADMIN_PRIV_PEM;
  if (!pem) throw new Error("ADMIN_PRIV_PEM missing");
  
  return pem.replace(/\\n/g, "\n");
}

function signPayload(payloadObj) {
  const payloadJson = JSON.stringify(payloadObj);

  const keyPem = loadAdminPrivPem();
  // raw 64-byte (r||s) using ieee-p1363
  const sigRaw = crypto.sign(null, Buffer.from(payloadJson, "utf8"), {
    key: crypto.createPrivateKey(keyPem),
    dsaEncoding: "ieee-p1363",
  });

  return { payloadJson, sigB64: Buffer.from(sigRaw).toString("base64") };
}

async function collectUsersForLock(lockId) {
  const groups = await Group.find({ lockIds: lockId }).lean();

  
  const memberIds = [
    ...new Set(
      groups.flatMap((g) => (g.userIds || []).map((id) => String(id)))
    ),
  ];

  

  if (memberIds.length === 0) return { users: [], missing: [] };
  

  
  const members = await User.find(
    { _id: { $in: memberIds } } 
  )
    .select({ clerkId: 1, email: 1 })
    .lean();

  const clerkIds = members.map((u) => u.clerkId).filter(Boolean);

  
  const keys = await UserKey.find({ userId: { $in: clerkIds }, active: true })
    .select({ kid: 1, pubB64: 1, userId: 1 })
    .lean();

  const keyByClerk = new Map(keys.map((k) => [k.userId, k]));
  const missing = members
    .filter((u) => !keyByClerk.has(u.clerkId))
    .map((u) => ({ email: u.email, clerkId: u.clerkId }));

  const users = keys.map((k) => ({ kid: k.kid, pubB64: k.pubB64 }));
  return { users, missing };
}

async function nextVersion(lockId) {
  const last = await AclVersion.findOne({ lockId })
    .sort({ version: -1 })
    .lean();
  return (last?.version || 0) + 1;
}



async function buildAndStore(lockId) {
  const { users, missing } = await collectUsersForLock(lockId);

  if (missing.length) {
    const err = new Error("missing-userpubs");
    err.code = "MISSING_USERPUBS";
    err.missing = missing;
    throw err;
  }

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
