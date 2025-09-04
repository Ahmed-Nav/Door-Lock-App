const mongoose = require("mongoose");

const AccessSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  lockId: { type: Number, required: true },
  canUnlock: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

AccessSchema.index({ userId: 1, lockId: 1 }, { unique: true });
module.exports = mongoose.model("Access", AccessSchema);
