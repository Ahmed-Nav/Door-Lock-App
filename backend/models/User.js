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

    publicKeys: {
      user: { type: String, default: null },
      admin: { type: String, default: null },
    },
    default: {},
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
