// backend/routes/inviteRoutes.js
const express = require("express");
const router = express.Router();
const { connectDB } = require("../services/db");
const User = require("../models/User");
const { Clerk } = require("@clerk/clerk-sdk-node");
const { SignJWT, jwtVerify, createRemoteJWKSet } = require("jose");

const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const { requireAdmin, requireOwner } = require("../middleware/requireRoleInWorkspace");
const extractActiveWorkspace = require("../middleware/extractActiveWorkspace");
const { bad } = require("../middleware/validate");

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error("CLERK_SECRET_KEY is not set in .env");
}
const clerkClient = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

const ISSUER = process.env.ISSUER;
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));

router.post(
  "/",
  verifyClerkOidc,
  extractActiveWorkspace,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { email, role } = req.body;
      const { workspaceId, dbUser } = req;

      if (!email || !role) {
        throw bad("BAD_REQUEST", "Email and role are required.", 400);
      }
      if (!["admin", "user"].includes(role)) {
        throw bad("BAD_REQUEST", "Invalid role specified.", 400);
      }

      await connectDB();

      const existingUser = await User.findOne({
        email: email,
        "workspaces.workspace_id": workspaceId,
      });

      if (existingUser) {
        throw bad(
          "CONFLICT",
          "This user is already a member of this workspace.",
          409
        );
      }

      const inviteToken = await new SignJWT({
        workspaceId: workspaceId,
        email: email,
        role: role,
        invitedBy: dbUser.email,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setIssuer("door-lock-app")
        .setAudience("door-lock-app-invite")
        .setExpirationTime("3d")
        .sign(new TextEncoder().encode(process.env.JWT_SECRET));
      const redirectUrl = `com.doorlockapp://invite?token=${inviteToken}`;

      await clerkClient.invitations.createInvitation({
        emailAddress: email,
        redirectUrl: redirectUrl,
        publicMetadata: {
          invitedBy: dbUser.email,
          appName: "Door Lock App",
        },
        ignoreExisting: true,
      });

      res.status(200).json({ ok: true, message: "Invite sent successfully." });
    } catch (e) {
      console.error("[INVITE] Failed to send invite:", e);
      next(e);
    }
  }
);

router.post("/accept", verifyClerkOidc, async (req, res, next) => {
  try {
    const { inviteToken } = req.body;
    if (!inviteToken) {
      throw bad("BAD_REQUEST", "Missing invite token.", 400);
    }

    let payload;
    try {
      const { payload: p } = await jose.jwtVerify(
        inviteToken,
        new TextEncoder().encode(process.env.JWT_SECRET),
        { issuer: "door-lock-app", audience: "door-lock-app-invite" }
      );
      payload = p;
    } catch (e) {
      throw bad("FORBIDDEN", "Invalid or expired invite token.", 403);
    }

    const { workspaceId, email: emailInToken, role } = payload;

    if (emailInToken !== req.userEmail) {
      throw bad("FORBIDDEN", "Invite token and user do not match.", 403);
    }

    await connectDB();

    const user = await User.findOne({
      _id: req.userId,
      "workspaces.workspace_id": workspaceId,
    });

    if (user) {
      return res.status(200).json({ ok: true, status: "already_member" });
    }

    const newWorkspaceEntry = {
      workspace_id: workspaceId,
      role: role,
    };

    await User.updateOne(
      { _id: req.userId },
      { $push: { workspaces: newWorkspaceEntry } }
    );

    res.status(200).json({ ok: true, status: "accepted" });
  } catch (e) {
    console.error("[INVITE] Failed to accept invite:", e);
    next(e);
  }
});

module.exports = router;
