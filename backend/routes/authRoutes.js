// backend/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const UsersService = require("../services/userService");

// POST /api/auth/sync
// Mobile sends Authorization: Bearer <idToken|accessToken> (Clerk)
// This will upsert the user in your Mongo "users" collection.
router.post("/sync", verifyClerkOidc, async (req, res) => {
  try {
    const email = req.userEmail;
    const sub = req.userSub; // Clerk "sub" (stable user id)
    if (!email) return res.status(400).json({ error: "No email in token" });

    // Upsert on clerkId; store email for querying by seed/access tools
    await UsersService.upsert({ clerkId: sub || email, email });

    // tiny debug to server logs
    console.log(`[AUTH/SYNC] upsert ok email=${email} sub=${sub}`);
    res.json({ ok: true, email });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "server error" });
  }
});

module.exports = router;
