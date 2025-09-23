const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  versionKey: false,
});

schema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const EquipmentCategory = mongoose.model('EquipmentCategory', schema);

module.exports = { EquipmentCategory };