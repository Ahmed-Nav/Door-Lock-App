// backend/routes/aclRoutes.js
const express = require("express");
const { connectDB } = require("../services/db");
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const { requireAdmin } = require("../middleware/requireRole");
const { buildAndStore } = require("../services/aclBuildService"); // <-- NEW

const router = express.Router();

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

      const envelope = await buildAndStore(lockId); // <-- use the new service
      return res.json({ ok: true, envelope });
    } catch (e) {
      if (e.code === "MISSING_USERPUBS") {
        // Service attaches e.missing = [{ email, clerkId }]
        return res
          .status(409)
          .json({ ok: false, err: "missing-userpubs", missing: e.missing });
      }
      console.error("POST /locks/:lockId/acl/rebuild failed:", e);
      return res.status(500).json({ ok: false, err: "server-error" });
    }
  }
);

// GET /api/locks/:lockId/acl/latest (can stay as-is, it just reads)
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

      const AclVersion = require("../models/AclVersion");
      const doc = await AclVersion.findOne({ lockId })
        .sort({ version: -1 })
        .lean();
      if (!doc) return res.status(404).json({ ok: false, err: "no-acl" });

      return res.json({ ok: true, envelope: doc.envelope });
    } catch (e) {
      console.error("GET /locks/:lockId/acl/latest failed:", e);
      return res.status(500).json({ ok: false, err: "server-error" });
    }
  }
);

module.exports = router;
