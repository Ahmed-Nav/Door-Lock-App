const router = require("express").Router();
const crypto = require("crypto");
const verifyClerkOidc  = require("../middleware/verifyClerkOidc");
const UserKey = require("../models/UserKey");

const kidOf = (pubB64) =>
  crypto.createHash("sha256").update(pubB64, "utf8").digest("hex").slice(0, 16);


router.post("/keys/register", verifyClerkOidc, async (req, res) => {
  try {
    const { pubB64, label } = req.body || {};
    if (!pubB64) return res.status(400).json({ ok: false, err: "missing-pub" });

    const kid = kidOf(pubB64);
    const doc = await UserKey.findOneAndUpdate(
      { kid },
      { userId: req.userId, pubB64, label, active: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ ok: true, kid: doc.kid });
  } catch (e) {
    console.error("register key failed:", e);
    res.status(500).json({ ok: false, err: "server-error" });
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
