// backend/routes/userRoutes.js
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

    // Accept base64 or base64url
    let b64 = String(publicKeyB64).trim().replace(/-/g, "+").replace(/_/g, "/");
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

    const role =
      req.auth.email && req.auth.email.toLowerCase() === ADMIN_EMAIL
        ? "admin"
        : "user";

    const u = await User.findOneAndUpdate(
      { clerkId: req.auth.clerkId },
      {
        $set: {
          email: req.auth.email ?? null,
          [`publicKeys.${persona}`]: publicKeyB64, // store as provided
        },
        $setOnInsert: { role },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res
      .status(200)
      .json({ ok: true, userId: u._id, persona, len: bytes.length });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
