// backend/routes/aclRoutes.js
const path = require("path");
const express = require("express");
const { connectDB } = require("../services/db");

const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const { requireAdmin } = require("../middleware/requireRole");

const AclVersion = require("../models/AclVersion");
const Group = require("../models/Group");
const User = require("../models/User");

// If you already have a UserPub model, keep this import.
// If not, create backend/models/UserPub.js with fields: userId (ObjectId), pubB64 (String).
let UserPub;
try {
  UserPub = require("../models/UserPub");
} catch (_) {
  // Optional fallback to avoid crash if model not present
  UserPub = null;
}

const { signPayloadWithAdmin } = require("../services/payloadService");

const router = express.Router();

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

// Collect the user public keys for a given lockId based on group assignments
async function buildUsersForLock(lockId) {
  // All groups that include this lock
  const groups = await Group.find(
    { lockIds: Number(lockId) },
    { userIds: 1 }
  ).lean();

  // Collect unique userIds
  const userIdSet = new Set();
  for (const g of groups)
    for (const u of g.userIds || []) userIdSet.add(String(u));
  const userIds = [...userIdSet];

  if (userIds.length === 0) return [];

  // Look up users (for kid = email)
  const users = await User.find({ _id: { $in: userIds } }, { email: 1 }).lean();

  // Look up pubs if model exists
  let pubMap = new Map();
  if (UserPub) {
    const pubs = await UserPub.find(
      { userId: { $in: userIds } },
      { userId: 1, pubB64: 1 }
    ).lean();
    pubMap = new Map(pubs.map((p) => [String(p.userId), p.pubB64]));
  }

  // Build the users[] array expected by firmware: [{ kid, pub }]
  const out = [];
  for (const u of users) {
    const pub = pubMap.get(String(u._id));
    if (pub && typeof pub === "string" && pub.length > 0) {
      out.push({ kid: u.email, pub });
    }
  }
  return out;
}

async function nextVersionFor(lockId) {
  const last = await AclVersion.findOne({ lockId: Number(lockId) })
    .sort({ version: -1 })
    .lean();
  return (last?.version || 0) + 1;
}

/* ------------------------------------------------------------------ *
 * Routes
 * ------------------------------------------------------------------ */

/**
 * POST /api/locks/:lockId/acl/rebuild
 * Admin-only. Builds users[] from groups, bumps version, signs with ADMIN_PRIV_PEM,
 * stores in AclVersion, returns the fresh envelope.
 */
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

      // 1) Build payload users[] from groups/assignments
      const users = await buildUsersForLock(lockId);
      // NOTE: If users.length === 0, firmware auth will have nobody to verify.
      // That’s OK for P0 if you’re only testing push; add keys later in P1.

      // 2) Determine next version
      const version = await nextVersionFor(lockId);

      // 3) Canonicalize + sign with admin private key
      const pemPath =
        process.env.ADMIN_PRIV_PEM_PATH ||
        path.join(__dirname, "..", "ADMIN_PRIV.pem"); // default local file
      const payload = { lockId, version, users };
      const { payloadJson, sigB64 } = signPayloadWithAdmin(payload, pemPath);

      // 4) Store (upsert) the signed envelope
      const envelope = { sig: sigB64, payload: JSON.parse(payloadJson) };
      const doc = await AclVersion.findOneAndUpdate(
        { lockId, version },
        { lockId, version, envelope, updatedAt: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      res.json({ ok: true, version: doc.version, envelope: doc.envelope });
    } catch (e) {
      console.error("POST /locks/:lockId/acl/rebuild failed:", e);
      res.status(500).json({ ok: false, err: "server-error" });
    }
  }
);

/**
 * GET /api/locks/:lockId/acl/latest
 * Returns the newest signed envelope for a lock.
 * You can leave this open (no token) for convenience, or protect it—your call.
 */
router.get("/locks/:lockId/acl/latest", verifyClerkOidc,
  requireAdmin, async (req, res) => {
  try {
    await connectDB();
    const lockId = Number(req.params.lockId || 0);
    if (!lockId) return res.status(400).json({ ok: false, err: "bad-lockId" });

    const doc = await AclVersion.findOne({ lockId })
      .sort({ version: -1 })
      .lean();
    if (!doc) return res.status(404).json({ ok: false, err: "no-acl" });

    res.json({ ok: true, envelope: doc.envelope });
  } catch (e) {
    console.error("GET /locks/:lockId/acl/latest failed:", e);
    res.status(500).json({ ok: false, err: "server-error" });
  }
});

/**
 * (Optional, dev tool)
 * POST /api/locks/:lockId/acl
 * Accept a *manual* envelope and upsert it. Admin-only, handy for debugging.
 */
router.post(
  "/locks/:lockId/acl",
  verifyClerkOidc,
  requireAdmin,
  async (req, res) => {
    try {
      await connectDB();
      const lockId = Number(req.params.lockId || 0);
      const envelope = req.body?.envelope;
      if (!lockId || !envelope?.payload || !envelope?.sig) {
        return res.status(400).json({ ok: false, err: "bad-body" });
      }

      const version = Number(envelope.payload.version || 0);
      if (!version)
        return res.status(400).json({ ok: false, err: "no-version" });

      const doc = await AclVersion.findOneAndUpdate(
        { lockId, version },
        { lockId, version, envelope, updatedAt: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      res.json({ ok: true, id: doc._id.toString() });
    } catch (e) {
      console.error("POST /locks/:lockId/acl failed:", e);
      res.status(500).json({ ok: false, err: "server-error" });
    }
  }
);

module.exports = router;
