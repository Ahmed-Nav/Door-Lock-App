const express = require("express");
const { connectDB } = require("../services/db");
const rateLimit = require("express-rate-limit");
const verifyClerkOidc = require("../middleware/verifyClerkOidc");


const { requireAdmin, requireOwner } = require("../middleware/requireRoleInWorkspace");
const extractActiveWorkspace = require("../middleware/extractActiveWorkspace");

const { buildAndStore } = require("../services/aclBuildService");
const { parseLockId } = require("../middleware/validate");
const AclVersion = require("../models/AclVersion");

const router = express.Router();
const limiter = rateLimit({ windowMs: 60_000, max: 120 });

router.post(
  "/locks/:lockId/acl/rebuild",
    limiter,
    verifyClerkOidc,
    extractActiveWorkspace,
    requireAdmin,
    async (req, res, next) => {    try {
      await connectDB();
      const lockId = parseLockId(req.params.lockId);
      if (!lockId)
        return res.status(400).json({ ok: false, err: "bad-lockId" });

      const envelope = await buildAndStore(lockId, req.workspaceId);

      return res.json({ ok: true, envelope });
    } catch (e) {
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
  extractActiveWorkspace,
  requireAdmin,
  async (req, res, next) => {
    try {
      await connectDB();
      const lockId = parseLockId(req.params.lockId);
      if (!lockId)
        return res.status(400).json({ ok: false, err: "bad-lockId" });

      const doc = await AclVersion.findOne({
        lockId: lockId,
        workspace_id: req.workspaceId, 
      })
        .sort({ version: -1 })
        .lean();

      if (!doc) {
        const e = new Error("no-acl-found-in-workspace");
        e.code = "NOT_FOUND";
        e.status = 404;
        throw e;
      }

      return res.json({ ok: true, envelope: doc.envelope });
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;
