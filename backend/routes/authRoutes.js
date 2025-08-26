const express = require("express");
const { getAuth, requireAuth } = require("@clerk/express");
const { clerkClient } = require("@clerk/clerk-sdk-node");
const UsersService = require("../services/userService");
const router = express.Router();

router.post('/sync', requireAuth(), async (req, res) => {
  try {
    const { userId } = getAuth(req); // requires Authorization header
    if(!userId) return res.status(400).json({ error: "Not authenticated" });

    const user = await clerkClient.users.getUser(userId);
    const email = user.emailAddresses?.[0]?.emailAddress || user?.primaryEmailAddress || user?.email;
    if (!email) return res.status(400).json({ error: "No email found" });
    await UsersService.upsert({ clerkId: userId, email });
    res.json({ ok:true, email });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'server error' });
  }
});

module.exports = router;