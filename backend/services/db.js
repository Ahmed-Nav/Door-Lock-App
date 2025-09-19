// backend/services/db.js
const mongoose = require("mongoose");

let cached = null;

async function connectDB() {
  if (cached) return cached;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing in .env");

  mongoose.set("strictQuery", true);
  cached = await mongoose.connect(uri);
  return cached;
}

module.exports = { connectDB };
