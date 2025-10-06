const User = require("../models/User");


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
