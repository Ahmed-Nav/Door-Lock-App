// backend/routes/unlockRoutes.js
const express = require("express");
const { getAuth } = require("@clerk/express");
const { clerkClient } = require("@clerk/clerk-sdk-node");
const router = express.Router();
const { generatePayload } = require("../services/payloadService");

// (Optional) quick health check for debugging
router.get("/health", (req, res) => res.json({ ok: true, router: "unlock" }));

// JSON-only auth guard (no redirects)
function requireAuthJSON(req, res, next) {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.userId = userId;
  next();
}

// POST /api/unlock/payload
router.post("/payload", requireAuthJSON, async (req, res) => {
  try {
    const user = await clerkClient.users.getUser(req.userId);
    const email =
      user.emailAddresses?.[0]?.emailAddress ||
      user.primaryEmailAddress ||
      user?.email;
    if (!email) return res.status(400).json({ error: "No email found" });

    const payload = generatePayload(email);
    res.json({ payload });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "server error" });
  }
});

module.exports = router;
