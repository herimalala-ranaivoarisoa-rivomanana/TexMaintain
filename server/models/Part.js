const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  partNumber: { type: String, required: true, trim: true, index: true },
  category: { type: String, required: true, trim: true },
  currentStock: { type: Number, default: 0 },
  minStock: { type: Number, default: 0 },
  maxStock: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  supplier: { type: String, trim: true },
  location: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now, immutable: true },
  updatedAt: { type: Date, default: Date.now },
}, { versionKey: false });

schema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Part = mongoose.model('Part', schema);

module.exports = { Part };



