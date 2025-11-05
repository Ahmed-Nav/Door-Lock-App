const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    clerkId: { type: String, index: true, unique: true },
    email: { type: String, index: true },
    workspaces: [
      {
        _id: false,
        workspace_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Workspace",
          required: true,
        },
        role: {
          type: String,
          enum: ["owner", "admin", "user"],
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
