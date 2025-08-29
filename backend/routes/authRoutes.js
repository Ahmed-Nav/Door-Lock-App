const express = require("express");
const UsersService = require("../services/userService");
const verifyClerkOidc = require("../middleware/verifyClerkOidc"); // <-- new
const router = express.Router();

router.post("/sync", verifyClerkOidc, async (req, res) => {
  try {
    const clerkId = req.userId; // from verified OIDC token
    const email = req.userEmail; // from verified OIDC token
    if (!clerkId || !email) {
      return res.status(400).json({ error: "Missing user claims" });
    }

    await UsersService.upsert({
      clerkId,
      email,
      updatedAt: new Date(),
    });

    res.json({ ok: true, email });
  } catch (error) {
    console.error("sync error:", error);
    res.status(500).json({ error: error.message || "server error" });
  }
});

module.exports = router;
