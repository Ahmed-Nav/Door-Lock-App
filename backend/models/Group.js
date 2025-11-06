// backend/models/Group.js
const mongoose = require("mongoose");

const GroupSchema = new mongoose.Schema(
  {
    name: { type: String, index: true },
    workspace_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    userIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    lockIds: { type: [Number], default: [] },
  },
  { timestamps: true }
);

GroupSchema.index({ workspace_id: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Group", GroupSchema);
