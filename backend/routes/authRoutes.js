// backend/routes/authRoutes.js
const router = require("express").Router();
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const { connectDB } = require("../services/db");
const User = require("../models/User");

router.get("/me", verifyClerkOidc, async (req, res) => {
  try {
    await connectDB();
    const { userId, userEmail, role } = req;

    const doc = await User.findOneAndUpdate(
      { clerkId: userId },
      {
        $setOnInsert: {
          clerkId: userId,
          email: userEmail,
          role: role || "user",
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

module.exports = router;
