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
    try {
      await connectDB();

      const lockId = Number(req.params.lockId || 0);
      const claimCode = String(req.body?.claimCode || "").trim();
      
      const kid =
        typeof req.body?.kid === "string" ? req.body.kid.trim() : null;

      if (!lockId || !claimCode) {
        return res.status(400).json({ ok: false, err: "missing-fields" });
      }

      const lock = await Lock.findOne({ lockId }).lean();
      if (!lock)
        return res.status(404).json({ ok: false, err: "lock-not-found" });
      if (lock.claimed)
        return res.status(409).json({ ok: false, err: "already-claimed" });

      
      const want = (lock.claimCodeHash || "").trim();
      const gotHex = sha256Hex(claimCode);
      const gotB64 = sha256B64(claimCode);
      const match =
        want.toLowerCase() === gotHex.toLowerCase() ||
        want.replace(/=+$/, "") === gotB64.replace(/=+$/, "");
      if (!match) return res.status(403).json({ ok: false, err: "bad-claim" });

      
      const k = await getOrCreateLockKey(lockId);

      
      await Lock.updateOne({ lockId }, { $set: { claimed: true } });

      
      const ownersName = `Owners-${lockId}`;
      const g = await Group.findOneAndUpdate(
        { name: ownersName },
        {
          $setOnInsert: {
            name: ownersName,
            userIds: [req.userId],
            lockIds: [lockId],
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
     
      await Group.updateOne(
        { _id: g._id },
        { $addToSet: { userIds: req.userId, lockIds: lockId } }
      );

      

      
      return res.json({ ok: true, adminPub: k.adminPubB64 });
    } catch (e) {
      console.error("POST /locks/:lockId/claim failed:", e);
      return res.status(500).json({ ok: false, err: "server-error" });
    }
  }
);

module.exports = router;
