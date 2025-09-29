const User = require("../models/User");

module.exports = {
  upsert: async ({ clerkId, email }) => {
    const now = new Date();
    const doc = await User.findOneAndUpdate(
      { clerkId },
      { clerkId, email, updatedAt: now },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return doc;
  },
  findByClerkId: async (clerkId) => User.findOne({ clerkId }),
};
