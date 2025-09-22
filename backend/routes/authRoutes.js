// backend/routes/authRoutes.js
const router = require("express").Router();
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const { connectDB } = require("../services/db");
const User = require("../models/User");

// quick probe
router.get("/health", (_req, res) => res.json({ ok: true }));

/**
 * Returns (and upserts) the current user.
 * Role comes from verifyClerkOidc (admin/user) based on OAuth client.
 */
router.get("/me", verifyClerkOidc, async (req, res) => {
  try {
    await connectDB();
    const { userId, userEmail, role } = req;

    const doc = await User.findOneAndUpdate(
      { clerkId: userId },
      {
        // keep email current on every hit
        $set: { email: userEmail },
        // set role only on first insert; do not downgrade/override existing role
        $setOnInsert: { clerkId: userId, role: role || "user" },
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

/**
 * Optional: explicit sync endpoint (same semantics as /me).
 */
router.post("/sync", verifyClerkOidc, async (req, res) => {
  try {
    await connectDB();
    const { userId, userEmail, role } = req;

    const doc = await User.findOneAndUpdate(
      { clerkId: userId },
      {
        $set: { email: userEmail },
        $setOnInsert: { clerkId: userId, role: role || "user" },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      ok: true,
      user: { id: doc._id.toString(), email: doc.email, role: doc.role },
    });
  } catch (e) {
    console.error("POST /auth/sync failed:", e);
    res.status(500).json({ ok: false, err: "server-error" });
  }
});

module.exports = router;
