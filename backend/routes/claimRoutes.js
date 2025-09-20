// backend/routes/claimRoutes.js
const express = require("express");
const crypto = require("crypto");
const { connectDB } = require("../services/db");
const Lock = require("../models/Lock");

const router = express.Router();

function sha256Hex(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}
function sha256B64(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("base64");
}

router.post("/locks/:lockId/claim", async (req, res) => {
  try {
    await connectDB();
    const lockId = Number(req.params.lockId);
    const claimCode = String(req.body?.claimCode || "");
    const adminPubB64 = req.body?.adminPubB64
      ? String(req.body.adminPubB64)
      : null;

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

    const update = { claimed: true };
    if (adminPubB64) update.adminPubB64 = adminPubB64;

    await Lock.updateOne({ lockId }, { $set: update });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, err: e.message });
  }
});

module.exports = router;
