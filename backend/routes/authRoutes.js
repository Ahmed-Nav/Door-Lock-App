const router = require("express").Router();
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const User = require("../models/User");

router.get('/health', (_req, res) => res.json({ ok: true, router: 'auth' }));

// Upsert user on first login
router.post('/sync', verifyClerkOidc, async (req, res) => {
  const { userId, userEmail } = req;
  const doc = await User.findOneAndUpdate(
    { clerkId: userId },
    { $setOnInsert: { clerkId: userId, email: userEmail } },
    { upsert: true, new: true, }
  );
  res.json({ ok: true, user: { id: doc._id, clerkId: doc.clerkId, email: doc.email } });
});

module.exports = router;