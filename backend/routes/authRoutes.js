const router = require("express").Router();
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const User = require("../models/User");

router.get("/health", (_req, res) => res.json({ ok: true, router: "auth" }));

// POST /api/auth/sync  — call right after login
router.post("/sync", verifyClerkOidc, async (req, res) => {
  try {
    const { userId, userEmail, role } = req;
    const now = new Date();
    const doc = await User.findOneAndUpdate(
      { clerkId: userId },
      {
        $setOnInsert: {
          clerkId: userId,
          email: userEmail,
          role,
          createdAt: now,
        },
        $set: { email: userEmail, role, updatedAt: now },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({
      ok: true,
      user: { id: String(doc._id), email: doc.email, role: doc.role },
    });
  } catch (e) {
    res.status(500).json({ ok: false, err: e.message });
  }
});

// GET /api/auth/me — validate token, return current user
router.get("/me", verifyClerkOidc, async (req, res) => {
  try {
    const doc = await User.findOne({ clerkId: req.userId }).lean();
    res.json({
      ok: true,
      user: doc
        ? { id: String(doc._id), email: doc.email, role: doc.role }
        : null,
    });
  } catch (e) {
    res.status(500).json({ ok: false, err: e.message });
  }
});

module.exports = router;
