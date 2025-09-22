// backend/routes/groupRoutes.js
const router = require("express").Router();
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const requireRole = require("../middleware/requireRole");
const Group = require("../models/Group");
const User = require("../models/User");

router.use(verifyClerkOidc);

// create group
router.post("/groups", requireRole("admin"), async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) return res.status(400).json({ ok: false, err: "bad-name" });
  const g = await Group.create({ name });
  res.json({ ok: true, group: g });
});

// list groups
router.get("/groups", requireRole("admin"), async (_req, res) => {
  const gs = await Group.find().lean();
  res.json({ ok: true, groups: gs });
});

// add/remove user to group
router.post("/groups/:id/users", requireRole("admin"), async (req, res) => {
  const id = req.params.id;
  const { userEmail, remove } = req.body || {};
  const u = await User.findOne({ email: userEmail });
  if (!u) return res.status(404).json({ ok: false, err: "user-not-found" });
  const op = remove
    ? { $pull: { userIds: u._id } }
    : { $addToSet: { userIds: u._id } };
  await Group.updateOne({ _id: id }, op);
  res.json({ ok: true });
});

// assign/unassign lock to group
router.post("/groups/:id/locks", requireRole("admin"), async (req, res) => {
  const id = req.params.id;
  const { lockId, remove } = req.body || {};
  if (!lockId) return res.status(400).json({ ok: false, err: "bad-lockId" });
  const op = remove
    ? { $pull: { lockIds: Number(lockId) } }
    : { $addToSet: { lockIds: Number(lockId) } };
  await Group.updateOne({ _id: id }, op);
  res.json({ ok: true });
});

module.exports = router;
