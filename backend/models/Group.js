// backend/models/Group.js
const mongoose = require("mongoose");

const GroupSchema = new mongoose.Schema(
  {
    name: { type: String, unique: true, index: true },
    userIds: { type: [mongoose.Schema.Types.ObjectId], default: [] }, // User._id
    lockIds: { type: [Number], default: [] }, // numeric lockId
  },
  { timestamps: true }
);

module.exports = mongoose.model("Group", GroupSchema);
