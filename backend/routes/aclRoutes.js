const crypto = require("crypto");
const Group = require("../models/Group");
const User = require("../models/User"); 
const UserKey = require("../models/UserKey");
const AclVersion = require("../models/AclVersion");

const ADMIN_PRIV_PEM = process.env.ADMIN_PRIV_PEM;
if (!ADMIN_PRIV_PEM)
  console.warn("ADMIN_PRIV_PEM missing (ACL signing will fail)");

function canonicalJson(obj) {
  const sort = (o) =>
    Array.isArray(o)
      ? o.map(sort)
      : o && typeof o === "object"
      ? Object.keys(o)
          .sort()
          .reduce((a, k) => ((a[k] = sort(o[k])), a), {})
      : o;
  return JSON.stringify(sort(obj));
}

async function collectUsersForLock(lockId) {
  const lid = Number(lockId);

  
  const groups = await Group.find({ lockIds: lid }).lean();
  const userIdOs = [...new Set(groups.flatMap((g) => g.userIds || []))]; 

  if (userIdOs.length === 0) return [];

  
  const users = await User.find(
    { _id: { $in: userIdOs } },
    { clerkId: 1 } 
  ).lean();

  const clerkIds = users
    .map((u) => u.clerkId || String(u._id)) 
    .filter(Boolean);

  if (clerkIds.length === 0) return [];

  
  const keys = await UserKey.find(
    { userId: { $in: clerkIds }, active: true },
    { kid: 1, pubB64: 1 }
  ).lean();

  
  return keys.map((k) => ({ kid: k.kid, pub: k.pubB64 }));
}

async function nextVersion(lockId) {
  const last = await AclVersion.findOne({ lockId: Number(lockId) })
    .sort({ version: -1 })
    .lean();
  return (last?.version || 0) + 1;
}

function signPayload(payloadObj) {
  if (!ADMIN_PRIV_PEM) throw new Error("no-admin-priv-pem");
  const payloadJson = canonicalJson(payloadObj);
  const sigRaw = crypto.sign("sha256", Buffer.from(payloadJson, "utf8"), {
    key: ADMIN_PRIV_PEM,
    dsaEncoding: "ieee-p1363",
  });
  if (sigRaw.length !== 64) throw new Error("bad-sig-len");
  return { payloadJson, sigB64: sigRaw.toString("base64") };
}

async function buildAndStore(lockId) {
  const users = await collectUsersForLock(lockId);
  const version = await nextVersion(lockId);
  const payload = { lockId: Number(lockId), version, users };

  const { payloadJson, sigB64 } = signPayload(payload);
  const envelope = { sig: sigB64, payload: JSON.parse(payloadJson) };

  await AclVersion.findOneAndUpdate(
    { lockId: Number(lockId), version },
    { lockId: Number(lockId), version, envelope, updatedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return envelope;
}

module.exports = { buildAndStore };
