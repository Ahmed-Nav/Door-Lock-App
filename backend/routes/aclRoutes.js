const express = require("express");
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const Lock = require("../models/Lock");

const router = express.Router();

/** PUT /api/locks/:lockId/acl  { payload, sig } */
router.put("/:lockId/acl", verifyClerkOidc, async (req, res) => {
  try {
    const { userId } = req;
    const lockId = Number(req.params.lockId);
    const { payload, sig } = req.body || {};
    if (!payload || typeof payload.lockId !== "number" || !sig) {
      return res
        .status(400)
        .json({ error: "payload{lockId} and sig required" });
    }
    if (payload.lockId !== lockId)
      return res.status(400).json({ error: "lockId mismatch" });

    const lock = await Lock.findOne({ lockId });
    if (!lock) return res.status(404).json({ error: "Lock not found" });
    if (!lock.claimed || lock.ownerAccountId !== userId) {
      return res.status(403).json({ error: "Not owner of this lock" });
    }

    lock.aclBlob = payload;
    lock.aclVersion = payload.version || lock.aclVersion;
    await lock.save();
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

/** GET /api/locks/:lockId/acl */
router.get("/:lockId/acl", verifyClerkOidc, async (req, res) => {
  try {
    const { userId } = req;
    const lockId = Number(req.params.lockId);
    const lock = await Lock.findOne({ lockId });
    if (!lock) return res.status(404).json({ error: "Lock not found" });
    if (!lock.claimed || lock.ownerAccountId !== userId) {
      return res.status(403).json({ error: "Not owner of this lock" });
    }
    res.json({ payload: lock.aclBlob, version: lock.aclVersion });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

module.exports = router;
