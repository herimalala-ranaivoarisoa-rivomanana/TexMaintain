const mongoose = require('mongoose');

const SiteSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true, uppercase: true, unique: true },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  country: { type: String, default: '' },
  timezone: { type: String, default: 'UTC' },
  businessUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessUnit' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = {
  Site: mongoose.model('Site', SiteSchema)
};
