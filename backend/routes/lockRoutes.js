// backend/routes/lockRoutes.js
const express = require("express");
const router = express.Router();

const { connectDB } = require("../services/db");
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const { requireAdmin } = require("../middleware/requireRole");
const Lock = require("../models/Lock");


router.get("/locks", verifyClerkOidc, requireAdmin, async (req, res) => {
  try {
    await connectDB();

    
    const ownerId = req.userId;
    if (!ownerId)
      return res.status(401).json({ ok: false, err: "unauthorized" });

    const docs = await Lock.find({ ownerId }).lean();

    const locks = (docs || []).map((d) => ({
      lockId: d.lockId,
      name: d.name || `Lock #${d.lockId}`,
      claimed: !!d.claimed,
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
      const lockId = Number(req.params.lockId || 0);
      const name = (req.body?.name || "").trim();
      const ownerId = req.userId;

      if (!lockId || !name)
        return res.status(400).json({ ok: false, err: "bad-input" });

      const doc = await Lock.findOneAndUpdate(
        { lockId, ownerId },
        { name },
        { new: true }
      ).lean();

      if (!doc) return res.status(404).json({ ok: false, err: "not-found" });

      return res.json({ ok: true });
    } catch (e) {
      console.error("PATCH /api/locks/:lockId failed:", e?.stack || e);
      return res.status(500).json({ ok: false, err: "server-error" });
    }
  }
);

module.exports = router;
