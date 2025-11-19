const router = require("express").Router();
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const {
  requireAdmin,
  requireOwner,
} = require("../middleware/requireRoleInWorkspace");
const extractActiveWorkspace = require("../middleware/extractActiveWorkspace");


router.get("/me", verifyClerkOidc, async (req, res) => {
  try {
    res.json({
      ok: true,
      user: {
        id: req.dbUser._id.toString(),
        email: req.dbUser.email,
        workspaces: req.dbUser.workspaces, 
      },
    });
  } catch (e) {
    console.error("GET /auth/me failed:", e);
    res.status(500).json({ ok: false, err: "server-error" });
  }
});

router.get(
  "/admin/pub",
  verifyClerkOidc,
  extractActiveWorkspace, 
  requireAdmin,
  async (req, res) => {
    try {
      const pub = (process.env.ADMIN_PUB_RAW_B64 || "").trim();
      if (!pub)
        return res.status(500).json({ ok: false, err: "admin-pub-missing" });

      return res.json({ ok: true, pub });
    } catch (e) {
      console.error("GET /auth/admin/pub failed:", e);
      return res.status(500).json({ ok: false, err: "server-error" });
    }
  }
);

module.exports = router;
