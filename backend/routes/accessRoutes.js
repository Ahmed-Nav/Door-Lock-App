const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Access = require("../models/Access");

function requireAdmin(req, res, next) {
  if (req.header("x-admin-secret") === process.env.ADMIN_SECRET) return next();
  return res.status(401).json({ error: "admin auth required" });
}

router.post("/allow", requireAdmin, async (req, res) => {
  const { email, lockId } = req.body || {};
  if (!email || !Number.isInteger(lockId))
    return res.status(400).json({ error: "email & lockId required" });
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "user not found" });
  await Access.updateOne(
    { userId: user._id, lockId },
    { $set: { canUnlock: true } },
    { upsert: true }
  );
  res.json({ ok: true });
});

router.post("/revoke", requireAdmin, async (req, res) => {
  const { email, lockId } = req.body || {};
  if (!email || !Number.isInteger(lockId))
    return res.status(400).json({ error: "email & lockId required" });
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "user not found" });
  await Access.deleteOne({ userId: user._id, lockId });
  res.json({ ok: true });
});

module.exports = router;
