const express = require('express');
const router = express.Router();
const { generatePayload } = require('../services/payloadService');

// POST /api/unlock/payload
router.post('/payload', (req,res) => {
  const { userName, yearOfBirth } = req.body;

  // Simple validation
  if(!userName || !yearOfBirth) {
    return res.status(400).json({ error: "userName and yearOfBirth required" });
  }

  const payload = generatePayload(userName, yearOfBirth);
  res.json({ payload });
});

module.exports = router;