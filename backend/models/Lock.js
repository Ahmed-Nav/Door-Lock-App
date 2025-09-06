const mongoose = require("mongoose");

const LockSchema = new mongoose.Schema(
  {
    lockId: { type: Number, unique: true, index: true, required: true },
    claimCodeHash: { type: String, required: true }, // sha256 hex
    ownerAccountId: { type: String }, // Clerk user id of the admin/owner
    claimed: { type: Boolean, default: false },
    adminPub: { type: String }, // base64 (uncompressed P-256, 65B)
    aclVersion: { type: Number, default: 0 },
    aclBlob: { type: Object }, // last accepted ACL payload (for backup/audit)
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lock", LockSchema);
