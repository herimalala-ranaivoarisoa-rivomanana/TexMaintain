const mongoose = require('mongoose');

const SubAssetSchema = new mongoose.Schema({
  equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true, index: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true },
  type: { type: String, trim: true },
  manufacturer: { type: String, trim: true },
  model: { type: String, trim: true },
  serialNumber: { type: String, trim: true },
  criticality: { type: String, enum: ['low','medium','high','critical'], default: 'medium' },
  notes: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = {
  SubAsset: mongoose.model('SubAsset', SubAssetSchema)
};
