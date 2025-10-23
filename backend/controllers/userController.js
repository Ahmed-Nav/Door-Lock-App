const User = require("../models/User");

const Group = require("../models/Group");
const LockKey = require("../models/LockKey");
const AclVersion = require("../models/AclVersion");

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, "-password"); 
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};


exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );

    res.json({ message: "Role updated", user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: "Failed to update role" });
  }
};

exports.deleteUser = async (req, res) => {
  const userIdToDelete = req.params.id;
  const currentAdminId = req.userId;

  try {
    if (userIdToDelete === currentAdminId) {
      return res.status(400).json({ error: "Admins cannot delete their own accounts" });
    }

    const user = await User.findById(userIdToDelete);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await Group.updateMany(
      { userIds: userIdToDelete },
      { $pull: { userIds: userIdToDelete } }
    );
    console.log(`Removed user ${userIdToDelete} from all groups`);

    await LockKey.deleteMany({ userId: userIdToDelete });
    console.log(`Deleted all lock keys for user ${userIdToDelete}`);

    const deletedUser = await User.findByIdAndDelete(userIdToDelete);
    if (!deletedUser) {
      return res.status(404).json({ error: "User not found during deletion" });
    }

    res.json({ message: "User deleted successfully", user: deletedUser });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
};
