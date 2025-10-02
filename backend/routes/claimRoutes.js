// backend/routes/claimRoutes.js
const express = require("express");
const crypto = require("crypto");
const { connectDB } = require("../services/db");
const Lock = require("../models/Lock");
const Group = require("../models/Group");
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const { requireAdmin } = require("../middleware/requireRole");
const { getOrCreateLockKey } = require("../services/keyService");

const router = express.Router();

const sha256Hex = (s) =>
  crypto.createHash("sha256").update(s, "utf8").digest("hex");
const sha256B64 = (s) =>
  crypto.createHash("sha256").update(s, "utf8").digest("base64");

router.post(
  "/locks/:lockId/claim",
  verifyClerkOidc,
  requireAdmin,
  async (req, res) => {
    const lockId = Number(req.params.lockId);
    const claimCode = String(req.body?.claimCode ?? "");
    try {
      await connectDB();
      console.log("[CLAIM] start", { lockId, user: req.userEmail });

      const lock = await Lock.findOne({ lockId }).lean();
      if (!lock)
        return res.status(404).json({ ok: false, err: "lock-not-found" });
      if (lock.claimed)
        return res.status(409).json({ ok: false, err: "already-claimed" });

      
      const wantHex = (lock.claimCodeHash || "").trim().toLowerCase();
      const gotHex = crypto
        .createHash("sha256")
        .update(claimCode, "utf8")
        .digest("hex")
        .toLowerCase();
      const okCode = wantHex === gotHex;
      if (!okCode) return res.status(403).json({ ok: false, err: "bad-claim" });

      
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
  }
);

module.exports = router;
