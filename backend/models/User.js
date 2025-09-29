// models/User.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    clerkId: { type: String, unique: true, index: true },
    email: { type: String, index: true },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
      index: true,
    },

    // Persona public keys (base64 raw, uncompressed P-256 is 65 bytes -> starts with 0x04)
    publicKeys: {
      user: { type: String, default: null },
      admin: { type: String, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
