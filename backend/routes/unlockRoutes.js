const express = require("express");
const router = express.Router();
const { generatePayload } = require("../services/payloadService");
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const crypto = require("crypto");


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

router.post("/token", verifyClerkOidc, async (req, res) => {
  try {
    const base64 = process.env.LOCK_SECRET_BASE64;
    if (!base64)
      return res.status(500).json({ error: "LOCK_SECRET_BASE64 not set" });
    const Kd = Buffer.from(base64, "base64"); // 32 bytes

    const V = Buffer.from([0x01]); // 1
    const ts = Buffer.alloc(4);
    ts.writeUInt32BE(Math.floor(Date.now() / 1000), 0); // 4
    const nonce = crypto.randomBytes(4); // 4
    const data = Buffer.concat([V, ts, nonce]); // 9 bytes

    const mac = crypto
      .createHmac("sha256", Kd)
      .update(data)
      .digest()
      .subarray(0, 8); // 8
    const payload = Buffer.concat([data, mac]); // 17 bytes total

    res.json({ payload: payload.toString("base64") });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

module.exports = router;
