const express = require("express");
const { connectDB } = require("../services/db");
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const { requireAdmin } = require("../middleware/requireRole");
const Lock = require("../models/Lock"); 

const router = express.Router();

router.patch(
  "/locks/:lockId",
  verifyClerkOidc,
  requireAdmin,
  async (req, res) => {
    try {
      await connectDB();
      const lockId = Number(req.params.lockId || 0);
      const { name } = req.body || {};
      if (!lockId || !name)
        return res.status(400).json({ ok: false, err: "bad-input" });
      await Lock.findOneAndUpdate(
        { lockId },
        { name, updatedAt: new Date() },
        { upsert: true }
      );
      res.json({ ok: true });
    } catch (e) {
      console.error("PATCH /locks/:lockId failed:", e);
      res.status(500).json({ ok: false, err: "server-error" });
    }
  }
);

module.exports = router;
