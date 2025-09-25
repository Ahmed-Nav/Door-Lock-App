const path = require("path");
const fs = require("fs");
const express = require("express");
const { connectDB } = require("../services/db");
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const { requireAdmin } = require("../middleware/requireRole");

const AclVersion = require("../models/AclVersion");
const Group = require("../models/Group");
const User = require("../models/User");
let UserPub;
try {
  UserPub = require("../models/UserPub");
} catch {
  UserPub = null;
}

const { signPayloadWithAdmin } = require("../services/payloadService");

const ADMIN_PRIV_PEM_PATH = path.join(__dirname, "..", "ADMIN_PRIV.pem");

const router = express.Router();

async function buildUsersForLock(lockId) {
  const groups = await Group.find({ lockIds: Number(lockId) }).lean();
  const userIds = [
    ...new Set(groups.flatMap((g) => g.userIds?.map(String) || [])),
  ];
  if (userIds.length === 0) return { users: [], missing: [] };

  const users = await User.find(
    { _id: { $in: userIds } },
    { email: 1, pubB64: 1 }
  ).lean();

  const idToEmail = new Map(users.map((u) => [String(u._id), u.email]));
  const foundPubs = new Map();

  if (UserPub) {
    const pubs = await UserPub.find(
      { userId: { $in: userIds } },
      { userId: 1, pubB64: 1 }
    ).lean();
    for (const p of pubs) foundPubs.set(String(p.userId), p.pubB64);
  }
  for (const u of users) {
    if (!foundPubs.has(String(u._id)) && u.pubB64) {
      foundPubs.set(String(u._id), u.pubB64);
    }
  }

  const usersOut = [];
  const missing = [];
  for (const uid of userIds) {
    const email = idToEmail.get(String(uid)) || "(unknown)";
    const pub = foundPubs.get(String(uid));
    if (pub) usersOut.push({ kid: email, pub });
    else missing.push({ id: uid, email });
  }
  return { users: usersOut, missing };
}

async function nextVersion(lockId) {
  const last = await AclVersion.findOne({ lockId: Number(lockId) })
    .sort({ version: -1 })
    .lean();
  return (last?.version || 0) + 1;
}

// POST /api/locks/:lockId/acl/rebuild
router.post(
  "/locks/:lockId/acl/rebuild",
  verifyClerkOidc,
  requireAdmin,
  async (req, res) => {
    try {
      await connectDB();
      const lockId = Number(req.params.lockId || 0);
      if (!lockId)
        return res.status(400).json({ ok: false, err: "bad-lockId" });

      const { users, missing } = await buildUsersForLock(lockId);
      if (missing.length > 0) {
        return res
          .status(409)
          .json({ ok: false, err: "missing-userpubs", missing });
      }

      const version = await nextVersion(lockId);
      const payload = { lockId, version, users };

      const { payloadJson, sigB64 } = signPayloadWithAdmin(
        payload,
        ADMIN_PRIV_PEM_PATH
      );
      const envelope = { sig: sigB64, payload: JSON.parse(payloadJson) };

      const doc = await AclVersion.findOneAndUpdate(
        { lockId, version },
        { lockId, version, envelope, updatedAt: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      res.json({ ok: true, id: doc._id.toString(), envelope: doc.envelope });
    } catch (e) {
      console.error("POST /locks/:lockId/acl/rebuild failed:", e);
      res.status(500).json({ ok: false, err: "server-error" });
    }
  }
);

// GET /api/locks/:lockId/acl/latest
router.get(
  "/locks/:lockId/acl/latest",
  verifyClerkOidc,
  requireAdmin,
  async (req, res) => {
    try {
      await connectDB();
      const lockId = Number(req.params.lockId || 0);
      if (!lockId)
        return res.status(400).json({ ok: false, err: "bad-lockId" });

      const doc = await AclVersion.findOne({ lockId })
        .sort({ version: -1 })
        .lean();
      if (!doc) return res.status(404).json({ ok: false, err: "no-acl" });

      res.json({ ok: true, envelope: doc.envelope });
    } catch (e) {
      console.error("GET /locks/:lockId/acl/latest failed:", e);
      res.status(500).json({ ok: false, err: "server-error" });
    }
  }
);

module.exports = router;
