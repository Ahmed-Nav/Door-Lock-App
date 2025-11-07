// backend/routes/groupRoutes.js
const express = require("express");
const router = express.Router();
const { connectDB } = require("../services/db");
const Group = require("../models/Group");
const User = require("../models/User"); 
const verifyClerkOidc = require("../middleware/verifyClerkOidc");

const {
  requireOwner,
  requireAdmin,
  requireUser,
} = require("../middleware/requireRoleInWorkspace");
const extractActiveWorkspace = require("../middleware/extractActiveWorkspace");

router.get(
  "/",
  verifyClerkOidc,
  extractActiveWorkspace,
  requireUser, 
  async (req, res) => {
    try {
      await connectDB();
      const groups = await Group.find({
        workspace_id: req.workspaceId,
      }).lean();

      res.json({ ok: true, groups });
    } catch (e) {
      res.status(500).json({ ok: false, err: "server-error" });
    }
  }
);

router.post(
  "/",
  verifyClerkOidc,
  extractActiveWorkspace,
  requireAdmin, 
  async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ ok: false, err: "name-required" });
      }

      await connectDB();

      const newGroup = await Group.create({
        name: name,
        workspace_id: req.workspaceId,
        userIds: [],
        lockIds: [],
      });

      res.status(201).json({ ok: true, group: newGroup });
    } catch (e) {
      if (e.code === 11000) {
        // Mongo duplicate key error
        return res.status(409).json({ ok: false, err: "group-name-taken" });
      }
      res.status(500).json({ ok: false, err: "server-error" });
    }
  }
);


router.post(
  "/:groupId/users",
  verifyClerkOidc,
  extractActiveWorkspace,
  requireAdmin,
  requireOwner,
  async (req, res) => {
    try {
      const { userEmail } = req.body;
      await connectDB();

      const userToAdd = await User.findOne({ email: userEmail }).lean();
      if (!userToAdd) {
        return res.status(404).json({ ok: false, err: "user-not-found" });
      }

      const group = await Group.findOneAndUpdate(
        { _id: req.params.groupId, workspace_id: req.workspaceId },
        { $addToSet: { userIds: userToAdd._id } } 
      );

      if (!group) {
        return res
          .status(404)
          .json({ ok: false, err: "group-not-found-in-workspace" });
      }

      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, err: "server-error" });
    }
  }
);

module.exports = router;
