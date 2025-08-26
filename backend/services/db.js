const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MongoDB URI not found');
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");
}

module.exports = connectDB;