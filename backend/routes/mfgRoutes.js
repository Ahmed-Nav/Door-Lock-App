const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const qrcode = require("qrcode");
const Lock = require("../models/Lock");
const { connectDB } = require("../services/db");
const { toBase32 } = require("../services/base32");

const limiter = rateLimit({ windowMs: 60_000, max: 120 });

const sha256Hex = (s) =>
  crypto.createHash("sha256").update(s, "utf8").digest("hex");
const codeFromRandom = () => {
   const b32 = toBase32(crypto.randomBytes(8)); 
   const s = b32.slice(0, 12).toUpperCase();
   return `${s.slice(0,4)}-${s.slice(4,8)}-${s.slice(8,12)}`;
 };

router.post("/mfg/locks/batch", limiter, async (req, res, next) => {
  try {
    await connectDB();
    const token = String(req.get("X-Factory-Token") || "");
    const expect = String(process.env.FACTORY_TOKEN || "");
    const a = Buffer.from(token);
    const b = Buffer.from(expect);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      const e = new Error("unauthorized"); e.code = "FORBIDDEN"; e.status = 401; throw e;
    }

    const { lockIds = [] } = req.body || {};
    if (!Array.isArray(lockIds) || lockIds.length === 0 || lockIds.length > 500) {
      const e = new Error("missing/invalid lockIds"); e.code = "BAD_INPUT"; e.status = 400; throw e;
    }

    const items = [];
    for (const id of lockIds) {
      const lockId = Number.parseInt(String(id), 10);
      if (!Number.isInteger(lockId) || lockId <= 0) continue;
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
    next(e);
  }
});

module.exports = router;
