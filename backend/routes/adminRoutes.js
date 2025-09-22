// backend/routes/adminRoutes.js
const router = require("express").Router();
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const requireRole = require("../middleware/requireRole");
const { buildAndStore } = require("../services/aclBuildService");

router.post(
  "/locks/:lockId/acl/rebuild",
  verifyClerkOidc,
  requireRole("admin"),
  async (req, res) => {
    const lockId = Number(req.params.lockId);
    if (!lockId) return res.status(400).json({ ok: false, err: "bad-lockId" });
    try {
      const envelope = await buildAndStore(lockId);
      res.json({ ok: true, envelope });
    } catch (e) {
      res.status(500).json({ ok: false, err: e.message });
    }
  }
);

module.exports = router;
