// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const userService = require("../services/userService");

router.put("/me/public-keys", verifyClerkOidc, async (req, res, next) => {
  try {
    const { persona, publicKeyB64 } = req.body || {};
    await userService.setPersonaPublicKey({
      clerkId: req.auth.clerkId,
      persona,
      publicKeyB64,
    });
    res.status(204).send();
  } catch (e) {
    console.error("public-key upload failed:", e.message);
    next(e);
  }
});

module.exports = router;
