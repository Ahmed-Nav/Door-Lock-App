const express = require("express");
const router = express.Router();
const { generatePayload } = require("../services/payloadService");
const verifyClerkOidc = require("../middleware/verifyClerkOidc");

router.get("/health", (_req, res) => res.json({ ok: true, router: "unlock" }));

router.post("/payload", verifyClerkOidc, async (req, res) => {
  try {
    const email = req.userEmail;
    if (!email) return res.status(400).json({ error: "No email in token" });
    const payload = generatePayload(email);
    res.json({ payload });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "server error" });
  }
});

module.exports = router;
