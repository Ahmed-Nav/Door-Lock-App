// backend/routes/lockRoutes.js
const express = require("express");
const router = express.Router();
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const { requireAdmin } = require("../middleware/requireRole");
const Lock = require("../models/Lock"); 

router.get("/locks", verifyClerkOidc, requireAdmin, async (req, res) => {
  try {
    const ownerId = req.user.id; middleware
    const docs = await Lock.find({ ownerId }).lean();
    const locks = (docs || []).map((d) => ({
      lockId: d.lockId,
      name: d.name || `Lock #${d.lockId}`,
      claimed: !!d.claimed,
    }));
    return res.json({ ok: true, locks });
  } catch (e) {
    console.error("GET /locks failed", e);
    return res.status(500).json({ ok: false, err: "server-error" });
  }
});

module.exports = router;
