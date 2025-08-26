const express = require('express');
const { requireAuth, getAuth } = require('@clerk/express');
const { clerkClient } = require('@clerk/clerk-sdk-node');
const router = express.Router();
const { generatePayload } = require('../services/payloadService');

// POST /api/unlock/payload
router.post('/payload', requireAuth(), async (req,res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(400).json({ error: "Not authenticated" });
    const user = await clerkClient.users.getUser(userId);
    const email = user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress || user?.email;
    if (!email) return res.status(400).json({ error: "No email found" });

    const payload = generatePayload(email);
    res.json({ payload });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'server error' });
  }
});

module.exports = router;