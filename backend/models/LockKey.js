// backend/models/LockKey.js
const mongoose = require("mongoose");

const LockKeySchema = new mongoose.Schema(
  {
    lockId: { type: Number, unique: true, index: true, required: true },
    // Base64 uncompressed (65 bytes: 0x04 + X(32) + Y(32))
    adminPubB64: { type: String, required: true },
    // Encrypted private key PEM (AES-256-GCM)
    adminPrivEnc: { type: String, required: true }, // base64(ciphertext|tag)
    adminPrivIv: { type: String, required: true }, // base64(iv)
    alg: { type: String, default: "P-256" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LockKey", LockKeySchema);
