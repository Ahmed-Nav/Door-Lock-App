const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  clerkId: { type: String, index: true, unique: true },
  email: { type: String, index: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
},
{ timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);