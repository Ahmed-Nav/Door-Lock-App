// backend/routes/aclRoutes.js
const express = require("express");
const { connectDB } = require("../services/db");
const AclVersion = require("../models/AclVersion");

const router = express.Router();

// POST /api/locks/:lockId/acl   { envelope }
router.post("/locks/:lockId/acl", async (req, res) => {
  try {
    await connectDB();
    const lockId = Number(req.params.lockId);
    const envelope = req.body?.envelope;
    if (!lockId || !envelope?.payload || !envelope?.sig) {
      return res.status(400).json({ ok: false, err: "bad-body" });
    }
    const version = Number(envelope.payload.version || 0);
    if (!version) return res.status(400).json({ ok: false, err: "no-version" });

    const doc = await AclVersion.findOneAndUpdate(
      { lockId, version },
      { lockId, version, envelope, updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ ok: true, id: doc._id.toString() });
  } catch (e) {
    res.status(500).json({ ok: false, err: e.message });
  }
});

// GET /api/locks/:lockId/acl/latest
router.get("/locks/:lockId/acl/latest", async (req, res) => {
  try {
    await connectDB();
    const lockId = Number(req.params.lockId);
    const doc = await AclVersion.findOne({ lockId })
      .sort({ version: -1 })
      .lean();
    if (!doc) return res.status(404).json({ ok: false, err: "no-acl" });
    res.json({ ok: true, envelope: doc.envelope });
  } catch (e) {
    res.status(500).json({ ok: false, err: e.message });
  }
});

module.exports = router;
