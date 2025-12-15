const mongoose = require('mongoose');

/**
 * EquipmentPart - Association entre équipement et pièce/consommable
 * Permet le calcul du stock optimal par machine et globalement
 */

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

  // === PARAMÈTRES DE CONSOMMATION ===
  quantityPerMachine: {
    type: Number,
    required: true,
    default: 1,
    min: 0.1,
    description: 'Quantité de pièces utilisées par cet équipement lors d\'un remplacement'
  },
  replacementFrequencyPerYear: {
    type: Number,
    required: true,
    default: 1,
    min: 0,
    description: 'Nombre de remplacements par an (ex: 2 = tous les 6 mois, 0.5 = tous les 2 ans)'
  },

  // === CRITICITÉ ET IMPORTANCE ===
  criticality: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    description: 'Criticité de cette pièce pour cet équipement spécifique'
  },
  criticalityScore: {
    type: Number,
    default: 2,
    min: 1,
    max: 4,
    description: 'Score numérique: low=1, medium=2, high=3, critical=4'
  },
  machineImportance: {
    type: Number,
    default: 50,
    min: 1,
    max: 100,
    description: 'Importance de cet équipement dans la production (1-100, utilisé pour pondération)'
  },

  // === DÉLAIS ET APPROVISIONNEMENT ===
  leadTimeDays: {
    type: Number,
    default: 15,
    min: 0,
    description: 'Délai d\'approvisionnement en jours pour cette pièce'
  },
  safetyCoefficient: {
    type: Number,
    default: 1.4,
    min: 1,
    max: 3,
    description: 'Coefficient de sécurité (1.2 = +20%, 1.5 = +50%)'
  },

  // === CALCULS AUTOMATIQUES (mis à jour par le système) ===
  annualConsumption: {
    type: Number,
    default: 0,
    description: 'Consommation annuelle calculée = quantityPerMachine × replacementFrequencyPerYear'
  },
  dailyConsumption: {
    type: Number,
    default: 0,
    description: 'Consommation journalière moyenne = annualConsumption / 365'
  },
  safetyStock: {
    type: Number,
    default: 0,
    description: 'Stock de sécurité calculé = dailyConsumption × leadTimeDays × safetyCoefficient'
  },
  reorderPoint: {
    type: Number,
    default: 0,
    description: 'Point de réapprovisionnement = safetyStock + (dailyConsumption × leadTimeDays)'
  },

  // === HISTORIQUE ET SUIVI ===
  isStandardPart: {
    type: Boolean,
    default: true,
    description: 'Pièce standard (true) ou spécifique (false)'
  },
  lastReplacementDate: {
    type: Date,
    description: 'Date du dernier remplacement effectué'
  },
  nextReplacementDate: {
    type: Date,
    description: 'Date prévisionnelle du prochain remplacement'
  },
  replacementHistory: [{
    date: { type: Date, required: true },
    quantityUsed: { type: Number, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    mediaBefore: [{ type: String }],
    mediaAfter: [{ type: String }]
  }],

  notes: {
    type: String,
    trim: true,
    description: 'Notes et observations'
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    description: 'Utilisateur ayant créé ou modifié cette association'
  },
}, {
  timestamps: true,
  versionKey: false
});

// Index unique pour éviter les doublons
schema.index({ equipment: 1, part: 1 }, { unique: true });

// Index pour les requêtes fréquentes
schema.index({ equipment: 1 });
schema.index({ part: 1 });

// === HOOKS ===

/**
 * Pre-save hook: Calcule automatiquement les valeurs de consommation et de stock
 */
schema.pre('save', function (next) {
  // Mise à jour du score de criticité
  const criticalityMap = {
    'low': 1,
    'medium': 2,
    'high': 3,
    'critical': 4
  };
  this.criticalityScore = criticalityMap[this.criticality] || 2;

  // Calcul de la consommation annuelle
  this.annualConsumption = this.quantityPerMachine * this.replacementFrequencyPerYear;

  // Calcul de la consommation journalière
  this.dailyConsumption = this.annualConsumption / 365;

  // Calcul du stock de sécurité
  // SS = (Consommation journalière) × (Délai appro) × Coeff. sécurité
  this.safetyStock = Math.ceil(
    this.dailyConsumption * this.leadTimeDays * this.safetyCoefficient
  );

  // Calcul du point de réapprovisionnement
  // SR = SS + (Consommation pendant le délai)
  this.reorderPoint = Math.ceil(
    this.safetyStock + (this.dailyConsumption * this.leadTimeDays)
  );

  // Calcul de la prochaine date de remplacement
  // Recalculer si:
  // - On a une date de dernier remplacement ET
  // - La fréquence > 0 ET
  // - (La fréquence a changé OU la date de dernier remplacement a changé OU c'est une nouvelle association)
  if (this.lastReplacementDate && this.replacementFrequencyPerYear > 0) {
    const shouldRecalculate = this.isModified('replacementFrequencyPerYear') ||
      this.isModified('lastReplacementDate') ||
      this.isNew;

    if (shouldRecalculate) {
      const daysUntilNext = Math.round(365 / this.replacementFrequencyPerYear);
      this.nextReplacementDate = new Date(
        this.lastReplacementDate.getTime() + daysUntilNext * 24 * 60 * 60 * 1000
      );
      console.log(`📅 Next replacement recalculated for part: ${this.part} - ${this.nextReplacementDate.toLocaleDateString()}`);
    }
  }

  next();
});

// === MÉTHODES D'INSTANCE ===

/**
 * Enregistre un remplacement de pièce
 */
schema.methods.recordReplacement = function (quantityUsed, userId, notes = '', mediaBefore = [], mediaAfter = []) {
  this.replacementHistory.push({
    date: new Date(),
    quantityUsed,
    performedBy: userId,
    notes,
    mediaBefore,
    mediaAfter
  });

  this.lastReplacementDate = new Date();

  // Calcul de la prochaine date de remplacement
  if (this.replacementFrequencyPerYear > 0) {
    const daysUntilNext = Math.round(365 / this.replacementFrequencyPerYear);
    this.nextReplacementDate = new Date(Date.now() + daysUntilNext * 24 * 60 * 60 * 1000);
  }

  return this.save();
};

/**
 * Vérifie si le remplacement est dû
 */
schema.methods.isReplacementDue = function () {
  if (!this.nextReplacementDate) return false;
  return new Date() >= this.nextReplacementDate;
};

/**
 * Retourne les statistiques de consommation
 */
schema.methods.getConsumptionStats = function () {
  return {
    annual: this.annualConsumption,
    monthly: this.annualConsumption / 12,
    weekly: this.annualConsumption / 52,
    daily: this.dailyConsumption,
    safetyStock: this.safetyStock,
    reorderPoint: this.reorderPoint
  };
};

// === MÉTHODES STATIQUES ===

/**
 * Calcule le stock global nécessaire pour une pièce sur tous les équipements
 */
schema.statics.calculateGlobalStock = async function (partId) {
  const associations = await this.find({ part: partId })
    .populate('equipment', 'model serialNumber')
    .lean();

  if (associations.length === 0) {
    return {
      totalAnnualConsumption: 0,
      totalDailyConsumption: 0,
      weightedCriticality: 0,
      globalSafetyStock: 0,
      globalReorderPoint: 0,
      equipmentCount: 0,
      details: []
    };
  }

  // Calcul de la consommation totale
  const totalAnnualConsumption = associations.reduce(
    (sum, assoc) => sum + assoc.annualConsumption, 0
  );

  const totalDailyConsumption = totalAnnualConsumption / 365;

  // Calcul de la criticité moyenne pondérée
  const totalImportance = associations.reduce(
    (sum, assoc) => sum + assoc.machineImportance, 0
  );

  const weightedCriticality = associations.reduce(
    (sum, assoc) => sum + (assoc.criticalityScore * assoc.machineImportance), 0
  ) / totalImportance;

  // Utiliser le délai max et le coefficient de sécurité le plus élevé
  const maxLeadTime = Math.max(...associations.map(a => a.leadTimeDays));
  const maxSafetyCoeff = Math.max(...associations.map(a => a.safetyCoefficient));

  // Stock de sécurité global
  const globalSafetyStock = Math.ceil(
    totalDailyConsumption * maxLeadTime * maxSafetyCoeff
  );

  // Point de réapprovisionnement global
  const globalReorderPoint = Math.ceil(
    globalSafetyStock + (totalDailyConsumption * maxLeadTime)
  );

  return {
    totalAnnualConsumption,
    totalDailyConsumption,
    weightedCriticality,
    weightedCriticalityLabel: weightedCriticality <= 1.5 ? 'low' :
      weightedCriticality <= 2.5 ? 'medium' :
        weightedCriticality <= 3.5 ? 'high' : 'critical',
    globalSafetyStock,
    globalReorderPoint,
    recommendedInitialStock: globalReorderPoint,
    equipmentCount: associations.length,
    details: associations.map(a => ({
      equipment: a.equipment,
      quantityPerMachine: a.quantityPerMachine,
      replacementFrequencyPerYear: a.replacementFrequencyPerYear,
      annualConsumption: a.annualConsumption,
      criticality: a.criticality,
      machineImportance: a.machineImportance
    }))
  };
};

/**
 * Trouve les pièces nécessitant un réapprovisionnement
 */
schema.statics.findPartsNeedingReorder = async function () {
  const { Part } = require('./Part');

  // Récupérer toutes les associations
  const associations = await this.find().populate('part').lean();

  // Grouper par pièce
  const partMap = new Map();

  for (const assoc of associations) {
    // Skip if part is missing (deleted but association remains)
    if (!assoc.part) continue;

    const partId = assoc.part._id.toString();
    if (!partMap.has(partId)) {
      partMap.set(partId, {
        part: assoc.part,
        associations: []
      });
    }
    partMap.get(partId).associations.push(assoc);
  }

  // Calculer pour chaque pièce
  const results = [];

  for (const [partId, data] of partMap) {
    const globalStock = await this.calculateGlobalStock(partId);
    const currentStock = data.part.currentStock || 0;

    if (currentStock <= globalStock.globalReorderPoint) {
      results.push({
        part: data.part,
        currentStock,
        reorderPoint: globalStock.globalReorderPoint,
        safetyStock: globalStock.globalSafetyStock,
        deficit: globalStock.globalReorderPoint - currentStock,
        urgency: currentStock <= globalStock.globalSafetyStock ? 'critical' : 'warning',
        equipmentCount: globalStock.equipmentCount
      });
    }
  }

  // Trier par urgence et déficit
  return results.sort((a, b) => {
    if (a.urgency === 'critical' && b.urgency !== 'critical') return -1;
    if (a.urgency !== 'critical' && b.urgency === 'critical') return 1;
    return b.deficit - a.deficit;
  });
};

const EquipmentPart = mongoose.model('EquipmentPart', schema);

module.exports = { EquipmentPart };