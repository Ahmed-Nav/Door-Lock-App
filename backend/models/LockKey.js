// backend/models/LockKey.js
const mongoose = require("mongoose");

const LockKeySchema = new mongoose.Schema(
  {
    workspace_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    lockId: { type: Number, unique: true, index: true, required: true },
    adminPubB64: { type: String, required: true },
    adminPrivEnc: { type: String, required: true },
    adminPrivIv: { type: String, required: true },
    alg: { type: String, default: "P-256" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LockKey", LockKeySchema);
