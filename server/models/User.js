const mongoose = require('mongoose');

const { validatePassword, isPasswordHash } = require('../utils/password.js');
const { randomUUID } = require("crypto");

const VALID_ROLES = ['admin', 'maintenance_manager', 'mechanic', 'electrician', 'general_maintenance_agent', 'dockworker', 'assistant_maintenance_manager', 'factory_manager', 'production_manager', 'line_manager', 'foreman', 'procurement_manager', 'project_manager'];

const schema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    enum: VALID_ROLES,
    default: 'general_maintenance_agent',
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
  lastLoginAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  refreshToken: {
    type: String,
    unique: true,
    index: true,
    sparse: true,
    default: () => randomUUID(),
  },
  factories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Factory'
  }],
  activeFactory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Factory'
  },
  defaultFactory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Factory'
  }
}, {
  versionKey: false,
});

schema.set('toJSON', {
  /* eslint-disable */
  transform: (doc, ret, options) => {
    delete ret.password;
    return ret;
  },
  /* eslint-enable */
});

const User = mongoose.model('User', schema);

module.exports = { User, VALID_ROLES };