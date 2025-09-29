const express = require("express");
const router = express.Router();
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const User = require("../models/User");

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").toLowerCase();

router.put("/me/public-keys", verifyClerkOidc, async (req, res, next) => {
  try {
    const { persona, publicKeyB64 } = req.body || {};
    if (!persona || !publicKeyB64) {
      return res
        .status(400)
        .json({ ok: false, error: "persona and publicKeyB64 required" });
    }
    if (!["user", "admin"].includes(persona)) {
      return res.status(400).json({ ok: false, error: "invalid_persona" });
    }

    // normalize base64 (accept base64url)
    let b64 = String(publicKeyB64).trim();
    b64 = b64.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4 !== 0) b64 += "=";

    let bytes;
    try {
      bytes = Buffer.from(b64, "base64");
    } catch {
      return res.status(400).json({ ok: false, error: "invalid_base64" });
    }
    if (bytes.length !== 65) {
      return res
        .status(400)
        .json({ ok: false, error: "invalid_key_len", len: bytes.length });
    }

    // upsert user to avoid races; set role on first sighting
    const role =
      req.auth.email && req.auth.email.toLowerCase() === ADMIN_EMAIL
        ? "admin"
        : "user";

    await User.findOneAndUpdate(
      { clerkId: req.auth.clerkId },
      {
        $set: {
          email: req.auth.email ?? null,
          [`publicKeys.${persona}`]: publicKeyB64, // store exactly what client sends
        },
        $setOnInsert: { role },
      },
      { upsert: true }
    );

    return res.status(204).send();
  } catch (e) {
    next(e);
  }
});

module.exports = router;
