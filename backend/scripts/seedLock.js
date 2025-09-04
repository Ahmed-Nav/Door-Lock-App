require("dotenv").config();
const mongoose = require("mongoose");
const Lock = require("../models/Lock");
const User = require("../models/User");
const Access = require("../models/Access");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const lockId = 101; // pick your demo door
  await Lock.updateOne(
    { lockId },
    { $set: { orgId: "default", name: "Demo Door", status: "provisioned" } },
    { upsert: true }
  );

  const email = process.argv[2]; // pass your email: node scripts/seedLock.js you@company.com
  if (email) {
    const user = await User.findOne({ email });
    if (!user) throw new Error("User not found: " + email);
    await Access.updateOne(
      { userId: user._id, lockId },
      { $set: { canUnlock: true } },
      { upsert: true }
    );
    console.log("Granted", email, "on lock", lockId);
  } else {
    console.log("Created/updated lock", lockId);
  }
  await mongoose.disconnect();
})();
