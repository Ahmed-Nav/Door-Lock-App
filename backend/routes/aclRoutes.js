// backend/routes/aclRoutes.js
const express = require("express");
const path = require("path");
const { connectDB } = require("../services/db");
const AclVersion = require("../models/AclVersion");
const { signPayloadWithAdmin } = require("../services/payloadService");

const router = express.Router();

const ADMIN_PRIV_PATH =
  process.env.ADMIN_PRIV_PATH || path.join(__dirname, "..", "ADMIN_PRIV.pem");

// POST /locks/:lockId/acl/build  { users:[{kid,pub}], version? }
router.post("/locks/:lockId/acl/build", async (req, res) => {
  try {
    await connectDB();
    const lockId = Number(req.params.lockId);
    const users = Array.isArray(req.body?.users) ? req.body.users : [];
    const version = Number(req.body?.version) || Date.now();

    if (!lockId || users.length === 0)
      return res.status(400).json({ ok: false, err: "lockId/users missing" });

    const payload = { lockId, version, users };
    const { payloadJson, sigB64 } = signPayloadWithAdmin(
      payload,
      ADMIN_PRIV_PATH
    );

    await AclVersion.create({
      lockId,
      version,
      payloadJson,
      sigB64,
    });

    return res.json({
      ok: true,
      envelope: { payload: JSON.parse(payloadJson), sig: sigB64 },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, err: e.message });
  }
});

// GET /locks/:lockId/acl/latest
router.get("/locks/:lockId/acl/latest", async (req, res) => {
  try {
    await connectDB();
    const lockId = Number(req.params.lockId);
    const row = await AclVersion.findOne({ lockId })
      .sort({ version: -1, _id: -1 })
      .lean();
    if (!row) return res.status(404).json({ ok: false, err: "no-acl" });
    return res.json({
      ok: true,
      envelope: { payload: JSON.parse(row.payloadJson), sig: row.sigB64 },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, err: e.message });
  }
});

module.exports = router;
