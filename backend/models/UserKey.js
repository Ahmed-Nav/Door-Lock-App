const mongoose = require("mongoose");

const UserKeySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },
    kid: { type: String, index: true, unique: true, required: true },
    pubB64: { type: String, required: true },
    label: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserKey", UserKeySchema);
