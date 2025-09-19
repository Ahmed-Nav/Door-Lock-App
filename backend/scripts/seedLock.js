// backend/scripts/seedLock.js
require("dotenv").config();
const crypto = require("crypto");
const { connectDB } = require("../services/db");
const Lock = require("../models/Lock");

function sha256Hex(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

(async () => {
  try {
    await connectDB();

    // Allow override via CLI: node scripts/seedLock.js 101 ABC-123-XYZ
    const lockId = Number(process.argv[2] || 101);
    const claimCode = String(process.argv[3] || "ABC-123-XYZ");

    const claimCodeHash = sha256Hex(claimCode);

    // Upsert so re-running is idempotent
    const res = await Lock.updateOne(
      { lockId },
      { $setOnInsert: { lockId, claimCodeHash, claimed: false } },
      { upsert: true }
    );

    console.log(
      "Seed OK:",
      res.upsertedId
        ? `created lock ${lockId}`
        : `lock ${lockId} already exists`
    );
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
