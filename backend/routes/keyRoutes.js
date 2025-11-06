const router = require("express").Router();
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const verifyClerkOidc  = require("../middleware/verifyClerkOidc");

const limiter = rateLimit({ windowMs: 60_000, max: 120 });
const { connectDB } = require("../services/db");
const UserKey = require("../models/UserKey");
const { requireString, bad } = require("../middleware/validate");

const kidOf = (pubB64) =>
  crypto.createHash("sha256").update(pubB64, "utf8").digest("hex").slice(0, 16);


router.post("/keys/register", limiter, verifyClerkOidc, async (req, res) => {
  try {

    await connectDB();

    const pubB64 = requireString(req.body?.pubB64, "pubB64", {
      min: 80,
      max: 200,
    });
    const label =
      typeof req.body?.label === "string" ? req.body.label.slice(0, 64) : "";
    if (!pubB64) return res.status(400).json({ ok: false, err: "missing-pub" });

    if (pubB64.length < 80) {
      return res.status(400).json({ ok: false, err: "bad-pub-format" });
    }

    const kid = kidOf(pubB64);

    const existing = await UserKey.findOne({ kid }).lean();
    if (existing && existing.userId !== req.userId) {
      return res
        .status(409)
        .json({ ok: false, err: "kid-owned-by-other-user" });
    }
    if (existing && existing.userId === req.userId && existing.active) {
      return res.json({ ok: true, kid: existing.kid });
    }

    await UserKey.updateMany(
      { userId: req.userId },
      { $set: { active: false } }
    );

    // Then insert or update the new key
    const doc = await UserKey.findOneAndUpdate(
      { kid },
      {
        userId: req.userId,
        pubB64,
        label,
        active: true,
        updatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ ok: true, kid: doc.kid });
  } catch (e) {
    if (e?.code === 11000) { e.status = 409; e.code = "CLAIM_CONFLICT"; }
    return next(e);
  }
});


router.get("/keys/mine", verifyClerkOidc, async (req, res) => {
  const items = await UserKey.find({ userId: req.userId, active: true })
    .select({ _id: 0, kid: 1, label: 1, createdAt: 1 })
    .lean();
  res.json({ ok: true, items });
});


router.delete("/keys/:kid", verifyClerkOidc, async (req, res) => {
  await UserKey.updateOne(
    { userId: req.userId, kid: req.params.kid },
    { active: false }
  );
  res.json({ ok: true });
});

module.exports = router;
