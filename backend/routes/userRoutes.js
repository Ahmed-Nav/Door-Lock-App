const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  updateUserRole,
  deleteUser,
} = require("../controllers/userController");
const verifyClerkOidc = require("../middleware/verifyClerkOidc");
const { requireAdmin } = require("../middleware/requireRole");


router.get("/users", verifyClerkOidc, requireAdmin, getAllUsers);


router.patch("/users/:id/role", verifyClerkOidc, requireAdmin, updateUserRole);

router.delete("/users/:id", verifyClerkOidc, requireAdmin, deleteUser);

module.exports = router;
