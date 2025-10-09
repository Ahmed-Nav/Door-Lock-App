// backend/routes/aclRoutes.js (excerpt)
const express = require("express");
const { connectDB } = require("../services/db");
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({ windowMs: 60_000, max: 120 });
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const { requireAdmin } = require("../middleware/requireRole");
const { buildAndStore } = require("../services/aclBuildService");
const { parseLockId } = require("../middleware/validate");

const router = express.Router();

router.post(
  "/locks/:lockId/acl/rebuild", limiter,
  verifyClerkOidc,
  requireAdmin,
  async (req, res, next) => {
    try {
      await connectDB();
      const lockId = parseLockId(req.params.lockId);
      if (!lockId)
        return res.status(400).json({ ok: false, err: "bad-lockId" });

      const envelope = await buildAndStore(lockId);
      return res.json({ ok: true, envelope });
    }  catch (e) {
      if (e.code === "MISSING_USERPUBS") {
        e.status = 409;
      }
      next(e);
    }
  }
);

router.get(
  "/locks/:lockId/acl/latest",
  verifyClerkOidc,
  requireAdmin,
  async (req, res, next) => {
    try {
      await connectDB();
      const lockId = parseLockId(req.params.lockId);
      if (!lockId)
        return res.status(400).json({ ok: false, err: "bad-lockId" });

      const AclVersion = require("../models/AclVersion");
      const doc = await AclVersion.findOne({ lockId })
        .sort({ version: -1 })
        .lean();
      if (!doc) {
        const e = new Error("no-acl");
        e.code = "NOT_FOUND";
        e.status = 404;
        throw e;
      }

      return res.json({ ok: true, envelope: doc.envelope });
    } catch (e) {
      console.error("GET /locks/:lockId/acl/latest failed:", e);
      return res.status(500).json({ ok: false, err: "server-error" });
    }
    next(e);
  }
);

module.exports = router;
