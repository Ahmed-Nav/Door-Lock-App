const express = require("express");
const mongoose = require("mongoose");
const verifyClerkOidc = require("../middleware/verifyClerkOidc");

const router = express.Router();

const UserPubSchema = new mongoose.Schema(
  {
    clerkId: { type: String, unique: true, index: true },
    email: { type: String },
    userPub: { type: String, required: true }, // base64 P-256 (65B)
  },
  { timestamps: true }
);

const UserPub = mongoose.model("UserPub", UserPubSchema);

/** POST /api/users/registerPublicKey  { userPub } */
router.post("/registerPublicKey", verifyClerkOidc, async (req, res) => {
  try {
    const { userId, userEmail } = req;
    const { userPub } = req.body || {};
    if (!userPub) return res.status(400).json({ error: "userPub required" });

    const doc = await UserPub.findOneAndUpdate(
      { clerkId: userId },
      { $set: { userPub, email: userEmail || null } },
      { upsert: true, new: true }
    );
    res.json({ ok: true, id: doc._id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

module.exports = { router, UserPub };
