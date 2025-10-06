// backend/routes/authRoutes.js
const router = require("express").Router();
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const { connectDB } = require("../services/db");
const User = require("../models/User");
const { requireAdmin } = require("../middleware/requireRole");

router.get("/me", verifyClerkOidc, async (req, res) => {
  try {
    await connectDB();
    const { userId, userEmail, role } = req;

    const existing = await User.findOne({ clerkId: userId });

    let finalRole = "user";
    if (existing) {
      finalRole = existing.role;
    }

    const doc = await User.findOneAndUpdate(
      { clerkId: userId },
      {
        $setOnInsert: {
          clerkId: userId,
          email: userEmail,
          role: finalRole,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      ok: true,
      user: { id: doc._id.toString(), email: doc.email, role: doc.role },
    });
  } catch (e) {
    console.error("GET /auth/me failed:", e);
    res.status(500).json({ ok: false, err: "server-error" });
  }
});

router.get(
  "/admin/pub",
  verifyClerkOidc,
  requireAdmin,
  async (req, res) => {
    try {
      const pub = (process.env.ADMIN_PUB_RAW_B64 || "").trim();
      if (!pub)
        return res.status(500).json({ ok: false, err: "admin-pub-missing" });
      return res.json({ ok: true, pub });
    } catch (e) {
      console.error("GET /auth/admin/pub failed:", e);
      return res.status(500).json({ ok: false, err: "server-error" });
    }
  }
);

module.exports = router;
