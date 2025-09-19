const mongoose = require('mongoose');

const AclVersionSchema = new mongoose.Schema(
  {
    lockId: { type: Number, index: true, required: true },
    version: { type: Number, index: true, required: true },
    payloadJson: { type: String, required: true },
    sigB64: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AclVersion', AclVersionSchema);