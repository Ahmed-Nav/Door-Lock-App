// backend/routes/claimRoutes.js
const express = require("express");
const crypto = require("crypto");
const { connectDB } = require("../services/db");
const Lock = require("../models/Lock");
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
      const lockId = Number(req.params.lockId);
      const claimCode = String(req.body?.claimCode || "");

      if (!lockId || !claimCode)
        return res.status(400).json({ ok: false, err: "missing-fields" });

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

      // Ensure a server-side keypair exists for this lock:
      const k = await getOrCreateLockKey(lockId);

      // Do NOT mark claimed here; mark claimed after BLE Owner write succeeds,
      // or keep as-is if your app marks claimed after the BLE success roundtrip.
      // Keeping your previous logic:
      await Lock.updateOne({ lockId }, { $set: { claimed: true } });

      // Return the adminPub the phone must write into the lock
      return res.json({ ok: true, adminPub: k.adminPubB64 });
    } catch (e) {
      return res.status(500).json({ ok: false, err: e.message });
    }
  }
);

module.exports = router;
