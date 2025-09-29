// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const userService = require("../services/userService");

router.get("/me", verifyClerkOidc, async (req, res, next) => {
  try {
    console.log("HIT /auth/me", {
      sub: req.auth?.clerkId,
      email: req.auth?.email,
    });
    const user = await userService.ensureUserFromClerk({
      clerkId: req.auth.clerkId,
      email: req.auth.email,
    });
    console.log("UPSERTED user", {
      id: user?._id?.toString(),
      role: user?.role,
    });
    res.json({
      ok: true,
      user: {
        clerkId: user.clerkId,
        email: user.email,
        role: user.role,
        publicKeys: user.publicKeys,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.get("/admin-exists", async (_req, res, next) => {
  try {
    const exists = await userService.adminExists();
    res.json({ exists });
  } catch (e) {
    next(e);
  }
});

router.get("/mobile-oidc-config", (_req, res) => {
  if (!process.env.ISSUER || !process.env.CLERK_CLIENT_ID_MOBILE) {
    return res
      .status(500)
      .json({ error: "ISSUER or CLERK_CLIENT_ID_MOBILE missing" });
  }
  res.json({
    issuer: process.env.ISSUER,
    clientId: process.env.CLERK_CLIENT_ID_MOBILE,
    redirectUrl: "com.doorlockapp://callback",
    scopes: ["openid", "email", "profile"],
    additionalParameters: { prompt: "login" }, 
  });
});

module.exports = router;
