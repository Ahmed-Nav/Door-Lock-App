// backend/routes/claimRoutes.js
const express = require("express");
const crypto = require("crypto");
const { connectDB } = require("../services/db");
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({ windowMs: 60_000, max: 120 });
const Lock = require("../models/Lock");
const Group = require("../models/Group");
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const { requireAdmin } = require("../middleware/requireRole");
const { getOrCreateLockKey } = require("../services/keyService");
const { parseLockId, requireString, bad } = require("../middleware/validate");

const router = express.Router();

const sha256Hex = (s) =>
  crypto.createHash("sha256").update(s, "utf8").digest("hex");
const sha256B64 = (s) =>
  crypto.createHash("sha256").update(s, "utf8").digest("base64");

router.post(
  "/locks/:lockId/claim",
  verifyClerkOidc,
  requireAdmin,
  async (req, res, next) => {
    try {
      await connectDB();
      const lockId = parseLockId(req.params.lockId);
      const claimCode = requireString(req.body?.claimCode ?? "", "claimCode", {
        min: 3,
        max: 64,
      });
      console.log("[CLAIM] start", { lockId, user: req.userEmail });

      const lock = await Lock.findOne({ lockId }).lean();
      if (!lock)
        throw Object.assign(new Error("not-found"), {
          code: "NOT_FOUND",
          status: 404,
        });
      if (lock.claimed)
        throw Object.assign(new Error("already-claimed"), {
          code: "CLAIM_CONFLICT",
          status: 409,
        });

      
      const wantHex = String(lock.claimCodeHash || "")
        .trim()
        .toLowerCase();
      const gotHex = sha256Hex(claimCode).toLowerCase();
      const a = Buffer.from(wantHex, "utf8");
      const b = Buffer.from(gotHex, "utf8");
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        throw Object.assign(new Error("bad-claim"), { code: "FORBIDDEN", status: 403 });
      }
      
      const k = await getOrCreateLockKey(lockId);
      console.log("[CLAIM] key ok");

      
      await Lock.updateOne(
        { lockId },
        { $set: { claimed: true, ownerAccountId: req.userId } }
      );

      console.log("[CLAIM] success");
      return res.json({ ok: true, adminPubB64: k.adminPubB64 });
    } catch (e) {
      console.error("[CLAIM] error", e);
      return res.status(500).json({ ok: false, err: "server-error" });
    }
    next(e);
  }
);

module.exports = router;
