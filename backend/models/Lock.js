const mongoose = require("mongoose");

const LockSchema = new mongoose.Schema(
  {
    lockId: { type: Number, unique: true, index: true },
    claimCodeHash: { type: String, required: true },
    claimed: { type: Boolean, default: false },
    ownerAccountId: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lock", LockSchema);