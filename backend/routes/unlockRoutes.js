const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const User = require("../models/User");
const Lock = require("../models/Lock");
const Access = require("../models/Access");

// health unchanged
router.get("/health", (_req, res) => res.json({ ok: true, router: "unlock" }));

// POST /api/unlock/token  (door-scoped, ACL-enforced)
router.post("/token", verifyClerkOidc, async (req, res) => {
  try {
    const email = req.userEmail;
    const lockId = Number(req.body?.lockId);
    if (!email || !Number.isInteger(lockId)) {
      return res
        .status(400)
        .json({ error: "email (in token) and lockId (in body) required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "user not found" });

    const lock = await Lock.findOne({ lockId });
    if (!lock) return res.status(404).json({ error: "lock not found" });

    // (optional single-tenant check) if (String(user.orgId) !== String(lock.orgId)) return res.status(403).json({ error: "wrong org" });

    const allowed = await Access.findOne({
      userId: user._id,
      lockId,
      canUnlock: true,
    });
    if (!allowed)
      return res.status(403).json({ error: "not authorized for this lock" });

    // Use your existing env secret for now; Phase 2 will move to per-lock keys
    const base64 = process.env.LOCK_SECRET_BASE64;
    if (!base64)
      return res.status(500).json({ error: "LOCK_SECRET_BASE64 not set" });
    const Kd = Buffer.from(base64, "base64"); // 32 bytes

    // Build 21-byte token: data(13) + mac(8)
    const V = Buffer.from([0x01]);
    const ts = Buffer.alloc(4);
    ts.writeUInt32BE(Math.floor(Date.now() / 1000), 0);
    const nonce = crypto.randomBytes(4);
    const lid = Buffer.alloc(4);
    lid.writeUInt32BE(lockId, 0);

    const data = Buffer.concat([V, ts, nonce, lid]); // 13 bytes
    const mac = crypto
      .createHmac("sha256", Kd)
      .update(data)
      .digest()
      .subarray(0, 8); // 8 bytes
    const payload = Buffer.concat([data, mac]); // 21 bytes

    // (tiny audit — expand later)
    console.log(`[TOKEN] user=${email} lockId=${lockId} ok`);

    res.json({ payload: payload.toString("base64") });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

module.exports = router;
