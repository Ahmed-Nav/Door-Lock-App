const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const qrcode = require("qrcode");
const Lock = require("../models/Lock");
const { connectDB } = require("../services/db");

const limiter = rateLimit({ windowMs: 60_000, max: 120 });

const sha256Hex = (s) =>
  crypto.createHash("sha256").update(s, "utf8").digest("hex");
const codeFromRandom = () => {
  const b = crypto
    .randomBytes(16)
    .toString("base32")
    .replace(/=+$/, "")
    .toUpperCase();
  return `${b.slice(0, 4)}-${b.slice(4, 8)}-${b.slice(8, 12)}`;
};

router.post("/mfg/locks/batch", limiter, async (req, res) => {
  try {
    await connectDB();
    const token = req.get("X-Factory-Token") || "";
    if (token !== process.env.FACTORY_TOKEN)
      return res.status(401).json({ ok: false, err: "unauthorized" });

    const { lockIds = [] } = req.body || {};
    if (!Array.isArray(lockIds) || lockIds.length === 0)
      return res.status(400).json({ ok: false, err: "missing-lockIds" });

    const items = [];
    for (const id of lockIds) {
      const lockId = Number(id);
      if (!Number.isFinite(lockId)) continue;
      const claimCode = codeFromRandom();
      const hash = sha256Hex(claimCode);

      await Lock.updateOne(
        { lockId },
        {
          $setOnInsert: { lockId },
          $set: { claimCodeHash: hash, claimed: false },
        },
        { upsert: true }
      );

      const payload = `lock:${lockId};code:${claimCode}`;
      const qrPngB64 = await qrcode.toDataURL(payload, { margin: 0 });

      items.push({ lockId, claimCode, qrPngB64 });
    }
    res.status(201).json({ ok: true, items });
  } catch (e) {
    console.error("mfg batch failed:", e);
    res.status(500).json({ ok: false, err: "server-error" });
  }
});

module.exports = router;
