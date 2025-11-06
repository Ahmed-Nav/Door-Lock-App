// backend/routes/lockRoutes.js
const express = require("express");
const router = express.Router();

const { connectDB } = require("../services/db");
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const { requireAdmin } = require("../middleware/requireRole");
const Lock = require("../models/Lock");

const AclVersion = require("../models/AclVersion");
const LockKey = require("../models/LockKey");
const Group = require("../models/Group");

router.get("/locks", verifyClerkOidc, requireAdmin, async (req, res) => {
  try {
    await connectDB();

    
    const ownerId = req.userId;
    if (!ownerId)
      return res.status(401).json({ ok: false, err: "unauthorized" });

    const docs = await Lock.find({ claimed: true })
      .select({ _id: 0, lockId: 1, name: 1, claimed: 1, setupComplete: 1 })
      .lean();

    const locks = (docs || []).map((d) => ({
      lockId: d.lockId,
      name: d.name || `Lock #${d.lockId}`,
      claimed: !!d.claimed,
      setupComplete: !!d.setupComplete,
    }));


    return res.json({ ok: true, locks });
  } catch (e) {
    console.error("GET /api/locks failed:", e?.stack || e);
    return res.status(500).json({ ok: false, err: "server-error" });
  }
});


router.patch(
  "/locks/:lockId",
  verifyClerkOidc,
  requireAdmin,
  async (req, res) => {
    try {
      await connectDB();
      const lockId = Number(req.params.lockId);
      if (!Number.isFinite(lockId)) {
        return res.status(400).json({ ok: false, err: "bad-lockId" });
      }

      const updates = {};
      if (typeof req.body?.name === "string")
        updates.name = String(req.body.name).trim();
      if (typeof req.body?.setupComplete === "boolean")
        updates.setupComplete = req.body.setupComplete;

      const doc = await Lock.findOneAndUpdate(
        { lockId },
        { $set: updates },
        { new: true }
      ).lean();

      if (!doc) {
        return res
          .status(404)
          .json({ ok: false, err: "not-found-or-not-owner" });
      }
      return res.json({ ok: true, lock: doc });
    } catch (e) {
      console.error("PATCH /locks/:lockId failed:", e);
      return res.status(500).json({ ok: false, err: "server-error" });
    }
  }
);

router.get('/locks/my', verifyClerkOidc, async (req, res) => {
  try {
    await connectDB();

    const userId = req.dbUser?._id;
    if (!userId) {
      return res.status(401).json({ ok: false, err: 'unauthorized' });
    }

    const userGroups = await Group.find({ userIds: userId }).lean();

    const myLockIds = new Set();
    for (const group of userGroups) {
      group.lockIds.forEach(id => myLockIds.add(id));
    }
    const lockIdArray = Array.from(myLockIds);

    const docs = await Lock.find({
      lockId: { $in: lockIdArray },
      claimed: true,
    })
      .select({ _id: 0, lockId: 1, name: 1, claimed: 1, setupComplete: 1 })
      .lean();

    const locks = (docs || []).map((d) => ({
      lockId: d.lockId,
      name: d.name || `Lock #${d.lockId}`,
      claimed: !!d.claimed,
      setupComplete: !!d.setupComplete,
    }));

    return res.json({ ok: true, locks });

  } catch (e) {
    console.error('GET /api/locks/my failed:', e?.stack || e);
    return res.status(500).json({ ok: false, err: 'server-error' });
  }
});


router.delete(
  "/locks/:lockId",
  verifyClerkOidc,
  requireAdmin,
  async (req, res) => {
    try {
      await connectDB();
      const lockId = Number(req.params.lockId);
      if (!Number.isFinite(lockId))
        return res.status(400).json({ ok: false, err: "bad-lockId" });

      const lock = await Lock.findOne({ lockId }).lean();
      if (!lock) return res.status(404).json({ ok: false, err: "not-found" });

      await Promise.all([
        AclVersion.deleteMany({ lockId }),
        LockKey.deleteMany({ lockId }),
        Group.updateMany({}, { $pull: { lockIds: lockId } }),
        Lock.deleteOne({ lockId }),
      ]);

      res.json({ ok: true });
    } catch (e) {
      console.error("DELETE /locks/:lockId failed:", e);
      res.status(500).json({ ok: false, err: "server-error" });
    }
  }
);




module.exports = router;
