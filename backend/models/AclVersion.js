// backend/models/AclVersion.js
const mongoose = require("mongoose");

const AclVersionSchema = new mongoose.Schema(
  {
    workspace_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    lockId: { type: Number, index: true, required: true },
    version: { type: Number, index: true, required: true },
    envelope: { type: Object, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AclVersion", AclVersionSchema);
