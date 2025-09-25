// backend/routes/groupRoutes.js
const router = require("express").Router();
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const { requireAdmin } = require("../middleware/requireRole");
const Group = require("../models/Group");
const User = require("../models/User");

router.use(verifyClerkOidc);

// ---------- create/list ----------
router.post("/groups", requireAdmin, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) return res.status(400).json({ ok: false, err: "bad-name" });
  const g = await Group.create({ name, userIds: [], lockIds: [] });
  res.json({ ok: true, group: g });
});

router.get("/groups", requireAdmin, async (_req, res) => {
  const gs = await Group.find().lean();
  // include counts
  const withCounts = await Promise.all(
    gs.map(async (g) => ({
      ...g,
      userCount: g.userIds?.length || 0,
      lockCount: g.lockIds?.length || 0,
    }))
  );
  res.json({ ok: true, groups: withCounts });
});

// ---------- details (emails expanded) ----------
router.get("/groups/:id", requireAdmin, async (req, res) => {
  const id = req.params.id;
  const g = await Group.findById(id).lean();
  if (!g) return res.status(404).json({ ok: false, err: "not-found" });

  const users = await User.find(
    { _id: { $in: g.userIds || [] } },
    { email: 1 }
  ).lean();
  res.json({
    ok: true,
    group: {
      _id: g._id,
      name: g.name,
      lockIds: g.lockIds || [],
      users: users.map((u) => ({ id: u._id.toString(), email: u.email })),
    },
  });
});

// ---------- add/remove user ----------
router.post("/groups/:id/users", requireAdmin, async (req, res) => {
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

// ---------- assign/unassign lock ----------
router.post("/groups/:id/locks", requireAdmin, async (req, res) => {
  const id = req.params.id;
  const { lockId, remove } = req.body || {};
  if (!lockId) return res.status(400).json({ ok: false, err: "bad-lockId" });

  const op = remove
    ? { $pull: { lockIds: Number(lockId) } }
    : { $addToSet: { lockIds: Number(lockId) } };
  await Group.updateOne({ _id: id }, op);
  res.json({ ok: true });
});

// ---------- delete group ----------
router.delete("/groups/:id", requireAdmin, async (req, res) => {
  const id = req.params.id;
  await Group.deleteOne({ _id: id });
  res.json({ ok: true });
});

module.exports = router;
