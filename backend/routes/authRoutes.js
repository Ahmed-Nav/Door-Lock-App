// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const userService = require("../services/userService");

router.get("/me", verifyClerkOidc, async (req, res, next) => {
  try {
    const user = await userService.ensureUserFromClerk({
      clerkId: req.auth.clerkId,
      email: req.auth.email,
    });

    req.user = user; // so downstream has it if needed
    const exists = await userService.adminExists();
    res.json({
      user: {
        clerkId: user.clerkId,
        email: user.email,
        role: user.role,
        publicKeys: user.publicKeys,
      },
      adminExists: exists,
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
    additionalParameters: { prompt: "login", max_age:0 }, 
  });
});

module.exports = router;
