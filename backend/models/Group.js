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
    userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lockIds: { type: [Number], default: [] },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

GroupSchema.virtual('users', {
  ref: 'User',
  localField: 'userIds',
  foreignField: '_id',
  justOne: false
});

GroupSchema.virtual('locks', {
    ref: 'Lock',
    localField: 'lockIds',
    foreignField: 'lockId',
    justOne: false
});

GroupSchema.index({ workspace_id: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Group", GroupSchema);
