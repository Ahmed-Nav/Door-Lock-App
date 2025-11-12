const crypto = require("crypto");
const Group = require("../models/Group");
const User = require("../models/User"); 
const UserKey = require("../models/UserKey");
const AclVersion = require("../models/AclVersion");

const ADMIN_PRIV_PEM = process.env.ADMIN_PRIV_PEM;
console.log("ACL_BUILD_SERVICE: ADMIN_PRIV_PEM loaded:", !!ADMIN_PRIV_PEM); // Added log
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

async function collectUsersForLock(lockId, workspaceId) {
  const lid = Number(lockId);

  
  const groups = await Group.find({
    lockIds: lid,
    workspace_id: workspaceId,
  }).lean();
  const userIds = [...new Set(groups.flatMap((g) => g.userIds || []))]; 

  if (userIds.length === 0) return [];

  
  const keys = await UserKey.find(
    { userId: { $in: userIds }, active: true },
    { kid: 1, pubB64: 1 }
  ).lean();

  
  return keys.map((k) => ({ kid: k.kid, pub: k.pubB64 }));
}

async function nextVersion(lockId, workspaceId) {
  const last = await AclVersion.findOne({
    lockId: Number(lockId),
    workspace_id: workspaceId,
  })
    .sort({ version: -1 })
    .lean();
  return (last?.version || 0) + 1;
}

function signPayload(payloadObj) {
  console.log("ACL_BUILD_SERVICE: Entering signPayload function."); // Added log
  if (!ADMIN_PRIV_PEM) {
    console.error("ADMIN_PRIV_PEM is missing. ACL signing cannot proceed.");
    throw new Error("ADMIN_PRIV_PEM-missing");
  }
  console.log("ACL_BUILD_SERVICE: ADMIN_PRIV_PEM length:", ADMIN_PRIV_PEM.length); // Added log
  const payloadJson = canonicalJson(payloadObj);
  let sigRaw;
  try {
    console.log("ACL_BUILD_SERVICE: Attempting crypto.sign."); // Added log
    sigRaw = crypto.sign("sha256", Buffer.from(payloadJson, "utf8"), {
      key: ADMIN_PRIV_PEM,
      dsaEncoding: "ieee-p1363",
    });
    console.log("ACL_BUILD_SERVICE: crypto.sign successful."); // Added log
  } catch (e) {
    console.error("crypto.sign failed:", e);
    throw new Error("admin-sig-creation-failed");
  }
  if (sigRaw.length !== 64) {
    console.error("Signature raw length is not 64:", sigRaw.length);
    throw new Error("bad-sig-len");
  }
  console.log("ACL_BUILD_SERVICE: Exiting signPayload successfully."); // Added log
  return { payloadJson, sigB64: sigRaw.toString("base64") };
}

async function buildAndStore(lockId, workspaceId) {
  console.log(`ACL_BUILD_SERVICE: Entering buildAndStore for lockId ${lockId}, workspaceId ${workspaceId}.`); // Added log
  const users = await collectUsersForLock(lockId, workspaceId);
  console.log(`ACL_BUILD_SERVICE: Collected ${users.length} users.`); // Added log
  const version = await nextVersion(lockId, workspaceId);
  console.log(`ACL_BUILD_SERVICE: Next ACL version: ${version}.`); // Added log
  const payload = { lockId: Number(lockId), version, users };
  console.log("ACL_BUILD_SERVICE: Payload created:", JSON.stringify(payload)); // Added log

  const { payloadJson, sigB64 } = signPayload(payload);
  const envelope = { sig: sigB64, payload: JSON.parse(payloadJson) };

  await AclVersion.findOneAndUpdate(
    {
      lockId: Number(lockId),
      version,
      workspace_id: workspaceId,
    },
    {
      lockId: Number(lockId),
      version,
      envelope,
      workspace_id: workspaceId,
      updatedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log("ACL_BUILD_SERVICE: ACL stored successfully."); // Added log

  return envelope;
}

module.exports = { buildAndStore };
