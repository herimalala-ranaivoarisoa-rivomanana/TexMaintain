const mongoose = require('mongoose');

const EQUIPMENT_STATUS = [
  'online',
  'maintenance',
  'breakdown',
  'offline',
  'scrapped'
];

const schema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EquipmentCategory',
    required: true,
  },
  type: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EquipmentType',
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: EQUIPMENT_STATUS,
    default: 'offline',
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  manufacturer: {
    type: String,
    trim: true,
  },
  model: {
    type: String,
    trim: true,
    required: true,
  },
  serialNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },
  chipNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },
  brand: {
    type: String,
    trim: true,
  },
  installationDate: {
    type: Date,
  },
  lastMaintenance: {
    type: Date,
  },
  nextMaintenance: {
    type: Date,
  },
  mtbf: {
    type: Number, // Mean Time Between Failures (hours)
    default: 0,
  },
  mttr: {
    type: Number, // Mean Time To Repair (hours)
    default: 0,
  },
  // Nouvelles métriques d'exploitation
  totalOperatingHours: {
    type: Number, // Heures totales de fonctionnement depuis acquisition
    default: 0,
  },
  downtimeHours: {
    type: Number, // Heures d'arrêt (réparations/interventions)
    default: 0,
  },
  lastDowntime: {
    type: Date, // Dernière période d'arrêt
  },
  specifications: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  // NOUVEAUX CHAMPS
  productionSection: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductionSection',
    default: null
  },
  productionLine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductionLine',
    default: null
  },
  // Historique des affectations
  assignmentHistory: [{
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionSection' },
    line: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionLine' },
    assignedAt: { type: Date, default: Date.now },
    unassignedAt: { type: Date, default: null },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
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

// Update the updatedAt field before saving
schema.pre('save', async function(next) {
  this.updatedAt = Date.now();
  
  // Gestion automatique du statut selon l'affectation à une section
  if (this.productionSection && this.status === 'offline') {
    this.status = 'online';
  }
  
  // Si retiré d'une section → offline (sauf si en maintenance ou en panne)
  if (!this.productionSection && ['online'].includes(this.status)) {
    this.status = 'offline';
  }
  
  // Calculer productionLine depuis productionSection
  if (this.productionSection && this.isModified('productionSection')) {
    try {
      const ProductionSection = this.constructor.db.model('ProductionSection');
      const section = await ProductionSection.findById(this.productionSection);
      this.productionLine = section?.productionLine || null;
    } catch (error) {
      console.warn('Could not find production section:', error.message);
    }
  } else if (!this.productionSection) {
    this.productionLine = null;
  }
  
  next();
});

// Index pour les requêtes fréquentes (pas d'unicité sur productionSection)
schema.index({ category: 1, type: 1 });
schema.index({ status: 1 });
schema.index({ productionLine: 1 });
schema.index({ productionSection: 1 }); // Index simple pour performance

const Equipment = mongoose.model('Equipment', schema);
module.exports = { Equipment, EQUIPMENT_STATUS };