const mongoose = require('mongoose');

const BusinessUnitSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true, uppercase: true, unique: true },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = {
  BusinessUnit: mongoose.model('BusinessUnit', BusinessUnitSchema)
};
