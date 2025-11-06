// backend/routes/claimRoutes.js
const express = require("express");
const crypto = require("crypto");
const { connectDB } = require("../services/db");
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({ windowMs: 60_000, max: 120 });
const Lock = require("../models/Lock");
const User = require("../models/User");
const Workspace = require("../models/Workspace");
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const { getOrCreateLockKey } = require("../services/keyService");
const { parseLockId, requireString, bad } = require("../middleware/validate");

const router = express.Router();

const sha256Hex = (s) =>
  crypto.createHash("sha256").update(s, "utf8").digest("hex");

router.post(
  "/locks/:lockId/claim",
  verifyClerkOidc, 
  async (req, res, next) => {
    try {
      await connectDB();
      const lockId = parseLockId(req.params.lockId);
      const claimCode = requireString(req.body?.claimCode ?? "", "claimCode", {
        min: 3,
        max: 64,
      });
      const newWorkspaceName = req.body?.workspaceName?.trim() || null;
      const activeWorkspaceId = req.headers["x-workspace-id"] || null;
      const { dbUser, userId } = req; 
      const lock = await Lock.findOne({ lockId }).lean();
      if (!lock) {
        throw bad("NOT_FOUND", "Lock not found", 404);
      }
      if (lock.claimed) {
        throw bad("CLAIM_CONFLICT", "This lock has already been claimed", 409);
      }
      if (lock.workspace_id) {
        
        throw bad("CLAIM_CONFLICT", "This lock is already assigned", 409);
      }

      const wantHex = String(lock.claimCodeHash || "")
        .trim()
        .toLowerCase();
      const gotHex = sha256Hex(claimCode).toLowerCase();
      const a = Buffer.from(wantHex, "utf8");
      const b = Buffer.from(gotHex, "utf8");
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        throw bad("FORBIDDEN", "Invalid claim code", 403);
      }

      if (newWorkspaceName && dbUser.workspaces.length === 0) {
        console.log("[CLAIM] New User Flow Start:", {
          lockId,
          user: req.userEmail,
          ws: newWorkspaceName,
        });

        const newWorkspace = await Workspace.create({
          name: newWorkspaceName,
          owner_user_id: userId,
        });
        const newWorkspaceId = newWorkspace._id;

        await Promise.all([

          User.updateOne(
            { _id: userId },
            {
              $push: {
                workspaces: {
                  workspace_id: newWorkspaceId,
                  role: "owner",
                },
              },
            }
          ),

          Lock.updateOne(
            { lockId: lockId },
            {
              $set: {
                claimed: true,
                ownerAccountId: userId.toString(),
                workspace_id: newWorkspaceId,
              },
            }
          ),
        ]);

        const k = await getOrCreateLockKey(lockId, newWorkspaceId);

        console.log("[CLAIM] New User Flow Success");
        return res.status(201).json({
          ok: true,
          status: "workspace_created",
          adminPubB64: k.adminPubB64,
          workspace: {
            _id: newWorkspaceId,
            name: newWorkspaceName,
            role: "owner",
          },
        });
      }

      else if (activeWorkspaceId && dbUser.workspaces.length > 0) {
        console.log("[CLAIM] Existing User Flow Start:", {
          lockId,
          user: req.userEmail,
          ws: activeWorkspaceId,
        });

        const workspaceAuth = dbUser.workspaces.find(
          (ws) => ws.workspace_id.toString() === activeWorkspaceId
        );

        if (
          !workspaceAuth ||
          !["owner", "admin"].includes(workspaceAuth.role)
        ) {
          throw bad(
            "FORBIDDEN",
            "You do not have admin rights in this workspace.",
            403
          );
        }

        await Lock.updateOne(
          { lockId: lockId },
          {
            $set: {
              claimed: true,
              ownerAccountId: userId.toString(),
              workspace_id: activeWorkspaceId,
            },
          }
        );

        const k = await getOrCreateLockKey(lockId, activeWorkspaceId);

        console.log("[CLAIM] Existing User Flow Success");
        return res.json({
          ok: true,
          status: "claimed",
          adminPubB64: k.adminPubB64,
        });
      }

      else {
        throw bad(
          "BAD_REQUEST",
          "Invalid claim request. Missing workspace details.",
          400
        );
      }
    } catch (e) {
      console.error("[CLAIM] error", e);

      if (!res.headersSent) {
        const status = e.status || 500;
        const err = e.code || "server-error";
        res.status(status).json({ ok: false, err: err, message: e.message });
      }
    }
  }
);

module.exports = router;
