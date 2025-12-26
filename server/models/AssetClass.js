const mongoose = require('mongoose');

const ASSET_CLASS_CODES = ['PRD','UTL','FAC','INF','SAF','MHE'];

const AssetClassSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true, uppercase: true, unique: true, enum: ASSET_CLASS_CODES },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = {
  AssetClass: mongoose.model('AssetClass', AssetClassSchema),
  ASSET_CLASS_CODES
};
