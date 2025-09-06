const express = require("express");
const crypto = require("crypto");
const Lock = require("../models/Lock");
const verifyClerkOidc = require("../middleware/verifyClerkOidc");

const router = express.Router();

/**
 * POST /api/claim
 * body: { lockId:number, claimCode:string }
 */
router.post("/", verifyClerkOidc, async (req, res) => {
  try {
    const { userId } = req; // from middleware
    const { lockId, claimCode } = req.body || {};
    if (typeof lockId !== "number" || !claimCode) {
      return res.status(400).json({ error: "lockId and claimCode required" });
    }

    const lock = await Lock.findOne({ lockId });
    if (!lock) return res.status(404).json({ error: "Lock not found" });

    const h = crypto
      .createHash("sha256")
      .update(claimCode, "utf8")
      .digest("hex");
    if (lock.claimCodeHash !== h)
      return res.status(403).json({ error: "Invalid claim code" });

    if (lock.claimed && lock.ownerAccountId && lock.ownerAccountId !== userId) {
      return res
        .status(409)
        .json({ error: "Lock already claimed by another account" });
    }

    lock.ownerAccountId = userId;
    lock.claimed = true;
    await lock.save();

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

module.exports = router;
