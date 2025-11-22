// backend/models/Lock.js
const mongoose = require("mongoose");

const LockSchema = new mongoose.Schema(
  {
    lockId: { type: Number, unique: true, index: true },
    workspace_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: false,
      default: null,
      index: true,
    },
    claimCodeHash: { type: String, required: true },
    claimed: { type: Boolean, default: false },
    ownerAccountId: { type: String, default: null },
    name: { type: String, default: "" },
    setupComplete: { type: Boolean, default: false, index: true },
    ownerKeyActivated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lock", LockSchema);
