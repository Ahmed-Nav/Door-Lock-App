const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
