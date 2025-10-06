const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  updateUserRole,
} = require("../controllers/userController");
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const { requireAdmin } = require("../middleware/requireRole");


router.get("/users", verifyClerkOidc, requireAdmin, getAllUsers);


router.patch("/users/:id/role", verifyClerkOidc, requireAdmin, updateUserRole);

module.exports = router;
