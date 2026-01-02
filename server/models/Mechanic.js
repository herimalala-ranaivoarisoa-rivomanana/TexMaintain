const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  matricule: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  fullName: {
    type: String,
    trim: true,
  },
  factory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Factory',
    required: true,
    index: true
  },
  specialization: {
    type: String,
    trim: true,
    enum: ['General Mechanics', 'Hydraulics', 'Pneumatics', 'Welding', 'Fabrication', 'Other'],
    default: 'General Mechanics',
  },
  certifications: [{
    type: String,
    trim: true,
  }],
  isActive: {
    type: Boolean,
    default: true,
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

// Create full name before saving
schema.pre('save', function (next) {
  this.fullName = `${this.firstName} ${this.lastName}`;
  this.updatedAt = Date.now();
  next();
});

// Create full name before updating
schema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update.firstName || update.lastName) {
    const firstName = update.firstName || this.getQuery().firstName;
    const lastName = update.lastName || this.getQuery().lastName;
    if (firstName && lastName) {
      update.fullName = `${firstName} ${lastName}`;
    }
  }
  update.updatedAt = Date.now();
  next();
});

// Index for searching
schema.index({ fullName: 'text', matricule: 'text' });

const Mechanic = mongoose.model('Mechanic', schema);

module.exports = { Mechanic };
