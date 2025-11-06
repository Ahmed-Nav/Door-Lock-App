const express = require("express");
const router = express.Router();
const User = require("../models/User");
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const { connectDB } = require("../services/db");


const { requireAdmin } = require("../middleware/requireRoleInWorkspace");
const extractActiveWorkspace = require("../middleware/extractActiveWorkspace");

router.get(
  "/users",
  verifyClerkOidc,
  extractActiveWorkspace, 
  requireAdmin, 
  async (req, res) => {
    try {
      await connectDB();

      const users = await User.find(
        { "workspaces.workspace_id": req.workspaceId },
        { email: 1, clerkId: 1, workspaces: 1 } 
      ).lean();


      const formattedUsers = users.map((user) => {
        const ws = user.workspaces.find(
          (w) => w.workspace_id.toString() === req.workspaceId
        );
        return {
          id: user._id,
          email: user.email,
          role: ws.role, 
        };
      });

      res.json({ ok: true, users: formattedUsers });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  }
);

router.patch(
  "/users/:id/role",
  verifyClerkOidc,
  extractActiveWorkspace, 
  requireAdmin, 
  async (req, res) => {
    try {
      const { role } = req.body;
      const userIdToUpdate = req.params.id;

      if (!["owner", "admin", "user"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      await connectDB();

      const result = await User.updateOne(
        {
          _id: userIdToUpdate,
          "workspaces.workspace_id": req.workspaceId,
        },
        {
          $set: { "workspaces.$.role": role },
        }
      );

      if (result.nModified === 0) {
        return res
          .status(404)
          .json({ error: "User not found in this workspace" });
      }

      res.json({ ok: true, message: "Role updated" });
    } catch (e) {
      res.status(500).json({ error: "Failed to update role" });
    }
  }
);


router.delete(
  "/users/:id",
  verifyClerkOidc,
  extractActiveWorkspace, 
  requireAdmin, 
  async (req, res) => {
    try {
      const userIdToDelete = req.params.id;

      await connectDB();

      const result = await User.updateOne(
        { _id: userIdToDelete },
        {
          $pull: { workspaces: { workspace_id: req.workspaceId } },
        }
      );

      if (result.nModified === 0) {
        return res
          .status(404)
          .json({ error: "User not found in this workspace" });
      }

      res.json({ ok: true, message: "User removed from workspace" });
    } catch (e) {
      res.status(500).json({ error: "Failed to remove user" });
    }
  }
);

module.exports = router;
