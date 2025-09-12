require("dotenv").config();
const mongoose = require("mongoose");
const crypto = require("crypto");
const Lock = require("../models/Lock");


(async () => {
  try {
    const lockId = Number(process.argv[2] || 101);
    const claimCode = (process.argv[3] || "").trim() || 'ABC-123-XYZ';

    await mongoose.connect(process.env.MONGODB_URI);

    const claimCodeHash = crypto.createHash('sha256').update(claimCode, 'utf8').digest('hex');

    const doc = await Lock.findOneAndUpdate(
      { lockId },
      { $set: { claimCodeHash, claimed: false, ownerAccountId: null } },
      { upsert: true, new: true }
    );

    console.log('Seeded Lock:', { lockId: doc.lockId, claimCode });
    console.log('Share this claim code with the lock owner.');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
