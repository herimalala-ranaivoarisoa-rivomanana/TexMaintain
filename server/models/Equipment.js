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
  // Métriques de production depuis l'insertion dans une section
  productionMetrics: {
    insertedAt: { type: Date }, // Date d'insertion dans la section actuelle
    operatingHours: { type: Number, default: 0 }, // Heures d'opération dans cette section
    sectionDowntimeHours: { type: Number, default: 0 }, // Temps d'arrêt dans cette section
    lastOperatingStart: { type: Date }, // Début de la dernière période d'opération
    lastBreakdownStart: { type: Date }, // Début de la dernière panne
    isOperating: { type: Boolean, default: false }, // État actuel d'opération
    breakdownCount: { type: Number, default: 0 }, // Nombre de pannes dans cette section
  },
  // Historique des changements de statut
  statusHistory: [{
    status: { type: String, enum: EQUIPMENT_STATUS },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String }, // Raison du changement (panne, maintenance, etc.)
    interventionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Intervention' },
    notes: { type: String }
  }],
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

// Méthodes pour calculer les métriques
schema.methods.calculateMTBF = function() {
  if (this.productionMetrics.breakdownCount === 0) return 0;
  return this.productionMetrics.operatingHours / this.productionMetrics.breakdownCount;
};

schema.methods.calculateMTTR = function() {
  if (this.productionMetrics.breakdownCount === 0) return 0;
  return this.productionMetrics.sectionDowntimeHours / this.productionMetrics.breakdownCount;
};

schema.methods.getAvailableStatuses = function() {
  const currentStatus = this.status;
  const inProductionSection = !!this.productionSection;
  
  let availableStatuses = [];
  
  if (inProductionSection) {
    // Équipement dans une section de production
    switch (currentStatus) {
      case 'online':
        availableStatuses = ['breakdown', 'offline'];
        break;
      case 'breakdown':
        availableStatuses = ['online']; // Retour en production après réparation
        break;
      case 'offline':
        availableStatuses = ['online', 'breakdown'];
        break;
    }
  } else {
    // Équipement hors section de production
    switch (currentStatus) {
      case 'offline':
        availableStatuses = ['maintenance', 'scrapped'];
        break;
      case 'maintenance':
        availableStatuses = ['offline', 'scrapped'];
        break;
      case 'scrapped':
        availableStatuses = []; // État final
        break;
    }
  }
  
  return availableStatuses;
};

schema.methods.updateOperatingMetrics = function() {
  const now = new Date();
  
  // Mise à jour des heures d'opération si l'équipement était en marche
  if (this.productionMetrics.isOperating && this.productionMetrics.lastOperatingStart) {
    const operatingTime = (now - this.productionMetrics.lastOperatingStart) / (1000 * 60 * 60); // en heures
    
    // Mettre à jour les métriques de production (section actuelle)
    this.productionMetrics.operatingHours += operatingTime;
    
    // Synchroniser avec les métriques globales
    this.totalOperatingHours = (this.totalOperatingHours || 0) + operatingTime;
  }
  
  // Mise à jour des heures d'arrêt si l'équipement était en panne
  if (this.status === 'breakdown' && this.productionMetrics.lastBreakdownStart) {
    const downtime = (now - this.productionMetrics.lastBreakdownStart) / (1000 * 60 * 60); // en heures
    
    // Mettre à jour les métriques de production (section actuelle)
    this.productionMetrics.sectionDowntimeHours += downtime;
    
    // Synchroniser avec les métriques globales
    this.downtimeHours = (this.downtimeHours || 0) + downtime;
  }
};

// Update the updatedAt field before saving
schema.pre('save', async function(next) {
  this.updatedAt = Date.now();
  
  // Gestion automatique du statut lors des changements de productionSection
  console.log(`Equipment ${this._id} middleware: productionSection modified = ${this.isModified('productionSection')}`);
  console.log(`Equipment ${this._id} middleware: current productionSection = ${this.productionSection}`);
  console.log(`Equipment ${this._id} middleware: current status = ${this.status}`);
  
  if (this.isModified('productionSection')) {
    console.log(`Equipment ${this._id} middleware: productionSection change detected`);
    
    if (this.productionSection) {
      // Équipement assigné à une section → statut online (si pas déjà breakdown/maintenance/scrapped)
      console.log(`Equipment ${this._id} middleware: assigning to section, current status: ${this.status}`);
      if (!['breakdown', 'maintenance', 'scrapped'].includes(this.status)) {
        this.status = 'online';
        console.log(`Equipment ${this._id} middleware: status changed to online`);
      } else {
        console.log(`Equipment ${this._id} middleware: status preserved (${this.status})`);
      }
      
      // Initialiser les métriques de production lors de l'insertion dans une section
      if (!this.productionMetrics.insertedAt) {
        this.productionMetrics.insertedAt = new Date();
        this.productionMetrics.operatingHours = 0;
        this.productionMetrics.sectionDowntimeHours = 0;
        this.productionMetrics.breakdownCount = 0;
        console.log(`Equipment ${this._id} middleware: production metrics initialized`);
      }
    } else {
      // Équipement retiré d'une section → statut offline automatiquement
      console.log(`Equipment ${this._id} middleware: removing from section, current status: ${this.status}`);
      if (['online', 'breakdown'].includes(this.status)) {
        this.status = 'offline';
        console.log(`Equipment ${this._id} middleware: status changed to offline (removed from production section)`);
      } else {
        console.log(`Equipment ${this._id} middleware: status preserved (${this.status})`);
      }
    }
  } else {
    console.log(`Equipment ${this._id} middleware: no productionSection change detected`);
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