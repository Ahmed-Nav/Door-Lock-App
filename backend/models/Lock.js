const mongoose = require("mongoose");

const LockSchema = new mongoose.Schema({
  lockId: { type: Number, required: true, unique: true, index: true },
  orgId: { type: String, default: "default", index: true }, // keep simple for now
  name: { type: String, default: "" },
  status: {
    type: String,
    enum: ["unprovisioned", "provisioned"],
    default: "provisioned",
  },
  claimCode: { type: String, default: "" }, // Phase 2 will use this
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Lock", LockSchema);
