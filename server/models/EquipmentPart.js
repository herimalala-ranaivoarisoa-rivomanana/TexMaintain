const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  equipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    required: true
  },
  part: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Part',
    required: true
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },
  isStandardPart: {
    type: Boolean,
    default: true
  },
  lastReplacementDate: {
    type: Date
  },
  nextReplacementDate: {
    type: Date
  },
  replacementFrequency: {
    type: Number, // en heures de fonctionnement
    default: null
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Index unique pour éviter les doublons
schema.index({ equipment: 1, part: 1 }, { unique: true });

// Index pour les requêtes fréquentes
schema.index({ equipment: 1 });
schema.index({ part: 1 });

const EquipmentPart = mongoose.model('EquipmentPart', schema);

module.exports = { EquipmentPart };