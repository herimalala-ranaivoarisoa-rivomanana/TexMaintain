# 🗄️ SCHÉMAS DE DONNÉES DÉTAILLÉS - TEXMAINTAIN

**Date**: 1er Novembre 2025

---

## 📋 TABLE DES MATIÈRES

1. [Equipment](#1-equipment)
2. [EquipmentStatusHistory](#2-equipmentstatushistory)
3. [EquipmentPart](#3-equipmentpart)
4. [Part](#4-part)
5. [Intervention](#5-intervention)
6. [User](#6-user)
7. [BreakdownMedia](#7-breakdownmedia)
8. [EquipmentCategory](#8-equipmentcategory)
9. [EquipmentType](#9-equipmenttype)
10. [Brand](#10-brand)
11. [ProductionLine](#11-productionline)
12. [ProductionSection](#12-productionsection)
13. [Personnel (4 modèles)](#13-personnel)

---

## 1. Equipment

**Fichier**: `server/models/Equipment.js`  
**Collection**: `equipments`

### Schéma Complet

```javascript
{
  // === CLASSIFICATION ===
  category: {
    type: ObjectId,
    ref: 'EquipmentCategory',
    required: true
  },
  type: {
    type: ObjectId,
    ref: 'EquipmentType',
    required: true
  },
  brand: {
    type: ObjectId,
    ref: 'Brand',
    required: false
  },
  
  // === STATUT ===
  status: {
    type: String,
    required: true,
    enum: [
      'in_production', 'setup_adjustment', 'paused_by_operator', 'changeover',
      'scheduled_maintenance', 'breakdown', 'under_repair', 'in_workshop',
      'waiting_spare_parts', 'testing_after_repair', 'under_inspection',
      'pending_validation', 'stored', 'offline', 'scrapped'
    ],
    default: 'stored'
  },
  statusCategory: {
    type: String,
    enum: ['production', 'maintenance', 'out_of_service'],
    default: 'out_of_service'
  },
  lastStatusChange: {
    type: Date,
    default: Date.now
  },
  lastStatusChangedBy: {
    type: ObjectId,
    ref: 'User',
    required: false
  },
  currentStatusDuration: {
    type: Number,
    default: 0,
    comment: 'Durée en minutes'
  },
  
  // === IDENTIFICATION ===
  location: {
    type: String,
    required: true,
    trim: true,
    example: 'Atelier A - Ligne 3 - Poste 5'
  },
  manufacturer: {
    type: String,
    trim: true,
    example: 'Juki Corporation'
  },
  model: {
    type: String,
    trim: true,
    example: 'DDL-8700-7'
  },
  serialNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    example: 'JK-2023-001234'
  },
  chipNumber: {
    type: String,
    trim: true,
    example: 'RFID-A001'
  },
  
  // === MAINTENANCE ===
  acquisitionDate: {
    type: Date,
    example: '2023-01-15'
  },
  lastMaintenance: {
    type: Date,
    example: '2025-10-01'
  },
  nextMaintenance: {
    type: Date,
    example: '2026-01-01'
  },
  
  // === KPI ===
  mtbf: {
    type: Number,
    default: 0,
    comment: 'Mean Time Between Failures (heures)'
  },
  mttr: {
    type: Number,
    default: 0,
    comment: 'Mean Time To Repair (heures)'
  },
  
  // === PANNE ===
  lastBreakdownType: {
    type: String,
    enum: ['mechanical', 'electrical', 'hydraulic', 'pneumatic', 
           'electronic', 'software', 'structural', 'other']
  },
  lastBreakdownDescription: {
    type: String
  },
  
  // === FLEXIBLE ===
  specifications: {
    type: Mixed,
    default: {},
    example: {
      vitesse: '5000 rpm',
      puissance: '750W',
      poids: '45kg'
    }
  },
  
  // === TIMESTAMPS ===
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

### Index
- `serialNumber`: unique, sparse

### Méthodes

```javascript
// Instance methods
canTransitionTo(newStatus): Boolean
getAllowedTransitions(): Array<{status, metadata}>

// Static methods
migrateLegacyStatus(legacyStatus): String

// Hooks
pre('save'): Met à jour updatedAt, lastStatusChange, statusCategory
```

---

## 2. EquipmentStatusHistory

**Fichier**: `server/models/EquipmentStatusHistory.js`  
**Collection**: `equipmentstatushistories`

### 14 Statuts avec Métadonnées

```javascript
const STATUS_METADATA = {
  // PRODUCTION (4)
  in_production: {
    label: 'In Production',
    category: 'production',
    color: 'green',
    icon: 'play',
    allowedTransitions: ['setup_adjustment', 'paused_by_operator', 
                         'changeover', 'breakdown', 'scheduled_maintenance', 
                         'offline', 'stored']
  },
  setup_adjustment: {
    label: 'Setup/Adjustment',
    category: 'production',
    color: 'blue',
    icon: 'settings',
    allowedTransitions: ['in_production', 'breakdown', 
                         'scheduled_maintenance', 'offline', 'stored']
  },
  paused_by_operator: {
    label: 'Paused by Operator',
    category: 'production',
    color: 'yellow',
    icon: 'pause',
    allowedTransitions: ['in_production', 'changeover', 'offline', 'stored']
  },
  changeover: {
    label: 'Changeover',
    category: 'production',
    color: 'blue',
    icon: 'refresh',
    allowedTransitions: ['setup_adjustment', 'in_production', 'breakdown', 
                         'scheduled_maintenance', 'offline', 'stored']
  },
  
  // MAINTENANCE (7)
  scheduled_maintenance: {
    label: 'Scheduled Maintenance',
    category: 'maintenance',
    color: 'orange',
    icon: 'calendar',
    allowedTransitions: ['in_production', 'offline', 'stored']
  },
  breakdown: {
    label: 'Breakdown',
    category: 'maintenance',
    color: 'red',
    icon: 'alert-triangle',
    allowedTransitions: ['under_inspection', 'under_repair', 'in_workshop']
  },
  under_repair: {
    label: 'Under Repair',
    category: 'maintenance',
    color: 'red',
    icon: 'wrench',
    allowedTransitions: ['in_workshop', 'in_production', 'offline']
  },
  in_workshop: {
    label: 'In Workshop',
    category: 'maintenance',
    color: 'red',
    icon: 'tool',
    allowedTransitions: ['waiting_spare_parts', 'testing_after_repair', 
                         'in_production', 'stored', 'scrapped']
  },
  waiting_spare_parts: {
    label: 'Waiting Spare Parts',
    category: 'maintenance',
    color: 'orange',
    icon: 'package',
    allowedTransitions: ['under_repair', 'in_workshop']
  },
  testing_after_repair: {
    label: 'Testing After Repair',
    category: 'maintenance',
    color: 'blue',
    icon: 'check-circle',
    allowedTransitions: ['pending_validation', 'in_production', 'under_repair']
  },
  under_inspection: {
    label: 'Under Inspection',
    category: 'maintenance',
    color: 'yellow',
    icon: 'search',
    allowedTransitions: ['under_repair', 'in_workshop', 
                         'scheduled_maintenance', 'in_production']
  },
  pending_validation: {
    label: 'Pending Validation',
    category: 'maintenance',
    color: 'blue',
    icon: 'clipboard-check',
    allowedTransitions: ['in_production', 'setup_adjustment', 'under_repair']
  },
  
  // HORS SERVICE (3)
  stored: {
    label: 'Stored',
    category: 'out_of_service',
    color: 'gray',
    icon: 'archive',
    allowedTransitions: ['offline', 'setup_adjustment', 
                         'under_inspection', 'scrapped']
  },
  offline: {
    label: 'Offline',
    category: 'out_of_service',
    color: 'gray',
    icon: 'power',
    allowedTransitions: ['in_production', 'stored', 'setup_adjustment', 
                         'scheduled_maintenance', 'scrapped']
  },
  scrapped: {
    label: 'Scrapped',
    category: 'out_of_service',
    color: 'black',
    icon: 'trash',
    allowedTransitions: [] // État terminal
  }
}
```

### Schéma

```javascript
{
  equipment: {
    type: ObjectId,
    ref: 'Equipment',
    required: true,
    index: true
  },
  previousStatus: {
    type: String,
    enum: [/* 14 statuts */]
  },
  newStatus: {
    type: String,
    enum: [/* 14 statuts */],
    required: true
  },
  changedBy: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Personnel assigné
  machinist: { type: ObjectId, ref: 'Machinist' },
  mechanic: { type: ObjectId, ref: 'Mechanic' },
  electrician: { type: ObjectId, ref: 'Electrician' },
  maintenanceWorker: { type: ObjectId, ref: 'MaintenanceWorker' },
  
  intervention: {
    type: ObjectId,
    ref: 'Intervention'
  },
  duration: {
    type: Number,
    default: null,
    comment: 'Durée en minutes (calculée au prochain changement)'
  },
  metadata: {
    type: Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  }
}
```

### Index
- `{equipment: 1, timestamp: -1}`
- `{newStatus: 1, timestamp: -1}`
- `{changedBy: 1, timestamp: -1}`

---

## 3. EquipmentPart

**Fichier**: `server/models/EquipmentPart.js` (9.8KB)  
**Collection**: `equipmentparts`

### Concept
Association entre équipement et pièce avec calcul automatique du stock optimal.

### Schéma

```javascript
{
  equipment: {
    type: ObjectId,
    ref: 'Equipment',
    required: true
  },
  part: {
    type: ObjectId,
    ref: 'Part',
    required: true
  },
  
  // CONSOMMATION
  quantityPerMachine: {
    type: Number,
    required: true,
    default: 1,
    min: 0.1,
    example: 2 // 2 pièces par remplacement
  },
  replacementFrequencyPerYear: {
    type: Number,
    required: true,
    default: 1,
    min: 0,
    example: 4 // 4 fois par an = tous les 3 mois
  },
  
  // CRITICITÉ
  criticality: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  criticalityScore: {
    type: Number,
    default: 2,
    min: 1,
    max: 4,
    comment: 'low=1, medium=2, high=3, critical=4'
  },
  machineImportance: {
    type: Number,
    default: 50,
    min: 1,
    max: 100,
    comment: 'Importance pour pondération'
  },
  
  // APPROVISIONNEMENT
  leadTimeDays: {
    type: Number,
    default: 15,
    min: 0
  },
  safetyCoefficient: {
    type: Number,
    default: 1.4,
    min: 1,
    max: 3,
    comment: '1.2 = +20%, 1.5 = +50%'
  },
  
  // CALCULS AUTOMATIQUES
  annualConsumption: {
    type: Number,
    default: 0,
    formula: 'quantityPerMachine × replacementFrequencyPerYear'
  },
  dailyConsumption: {
    type: Number,
    default: 0,
    formula: 'annualConsumption / 365'
  },
  safetyStock: {
    type: Number,
    default: 0,
    formula: 'ceil(dailyConsumption × leadTimeDays × safetyCoefficient)'
  },
  reorderPoint: {
    type: Number,
    default: 0,
    formula: 'ceil(safetyStock + (dailyConsumption × leadTimeDays))'
  },
  
  // HISTORIQUE
  isStandardPart: {
    type: Boolean,
    default: true
  },
  lastReplacementDate: Date,
  nextReplacementDate: Date,
  replacementHistory: [{
    date: { type: Date, required: true },
    quantityUsed: { type: Number, required: true },
    performedBy: { type: ObjectId, ref: 'User' },
    notes: String
  }],
  
  notes: String,
  changedBy: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

### Formules Mathématiques

```
1. Consommation Annuelle (CA)
   CA = Qté/machine × Fréquence/an
   Exemple: 2 × 4 = 8 pièces/an

2. Consommation Journalière (CJ)
   CJ = CA / 365
   Exemple: 8 / 365 = 0.022 pièces/jour

3. Stock de Sécurité (SS)
   SS = ceil(CJ × Délai × Coeff)
   Exemple: ceil(0.022 × 15 × 1.4) = 1 pièce

4. Point de Réapprovisionnement (SR)
   SR = ceil(SS + (CJ × Délai))
   Exemple: ceil(1 + (0.022 × 15)) = 2 pièces

5. Criticité Moyenne Pondérée (CM)
   CM = Σ(Score × Importance) / Σ(Importance)
   Exemple: (3×80 + 2×50) / (80+50) = 2.31
```

### Méthodes

```javascript
// Instance
recordReplacement(quantityUsed, userId, notes): Promise
isReplacementDue(): Boolean
getConsumptionStats(): Object

// Static
calculateGlobalStock(partId): Promise<Object>
findPartsNeedingReorder(): Promise<Array>
```

### Index
- `{equipment: 1, part: 1}`: unique
- `{equipment: 1}`
- `{part: 1}`

---

## 4. Part

**Fichier**: `server/models/Part.js`  
**Collection**: `parts`

### Schéma

```javascript
{
  name: {
    type: String,
    required: true,
    trim: true,
    example: 'Courroie trapézoïdale B123'
  },
  partNumber: {
    type: String,
    required: true,
    trim: true,
    index: true,
    example: 'BELT-B123-STD'
  },
  category: {
    type: String,
    required: true,
    trim: true,
    example: 'Courroies'
  },
  type: {
    type: String,
    enum: ['part', 'consumable'],
    default: 'part'
  },
  currentStock: {
    type: Number,
    default: 0
  },
  minStock: {
    type: Number,
    default: 0
  },
  maxStock: {
    type: Number,
    default: 0
  },
  unitPrice: {
    type: Number,
    default: 0
  },
  supplier: {
    type: String,
    trim: true,
    example: 'Industrial Belts Ltd.'
  },
  location: {
    type: String,
    trim: true,
    example: 'Warehouse A - Rack 3 - Shelf 2'
  },
  pendingOrders: [{
    quantity: { type: Number, default: 0 },
    status: { type: String, default: 'pending' },
    orderDate: { type: Date, default: Date.now },
    expectedDate: Date
  }],
  pendingQuantity: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

### Index
- `partNumber`: index

---

## 5. Intervention

**Fichier**: `server/models/Intervention.js`  
**Collection**: `interventions`

### Schéma

```javascript
{
  title: {
    type: String,
    required: true,
    trim: true,
    example: 'Remplacement courroie machine A3'
  },
  type: {
    type: String,
    enum: ['Corrective', 'Preventive', 'Emergency'],
    required: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Pending',
    required: true
  },
  equipment: {
    type: String,
    required: true,
    trim: true,
    comment: 'Legacy field (backward compatibility)'
  },
  equipmentId: {
    type: ObjectId,
    ref: 'Equipment',
    required: false,
    index: true,
    comment: 'Strong reference'
  },
  assignedTo: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  createdDate: {
    type: Date,
    default: Date.now
  },
  dueDate: Date
}
```

### Index
- `equipmentId`: index

---

## 6. User

**Fichier**: `server/models/User.js`  
**Collection**: `users`

### 12 Rôles Disponibles

```javascript
const VALID_ROLES = [
  'admin',
  'maintenance_manager',
  'mechanic',
  'electrician',
  'general_maintenance_agent',
  'dockworker',
  'assistant_maintenance_manager',
  'factory_manager',
  'production_manager',
  'line_manager',
  'foreman',
  'procurement_manager',
  'project_manager'
]
```

### Schéma

```javascript
{
  email: {
    type: String,
    required: true,
    index: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    validate: isPasswordHash,
    comment: 'Hash bcrypt'
  },
  role: {
    type: String,
    required: true,
    enum: VALID_ROLES,
    default: 'general_maintenance_agent'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  refreshToken: {
    type: String,
    unique: true,
    index: true,
    sparse: true,
    default: randomUUID
  }
}
```

### Transformation JSON
```javascript
toJSON: {
  transform: (doc, ret) => {
    delete ret.password; // Ne jamais exposer le mot de passe
    return ret;
  }
}
```

---

## 7. BreakdownMedia

**Fichier**: `server/models/BreakdownMedia.js`  
**Collection**: `breakdownmedias`

### Schéma

```javascript
{
  equipment: {
    type: ObjectId,
    ref: 'Equipment',
    required: true
  },
  breakdownType: {
    type: String,
    enum: ['mechanical', 'electrical', 'hydraulic', 'pneumatic',
           'electronic', 'software', 'structural', 'other'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  files: [{
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  uploadedBy: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}
```

### Contraintes
- Max 5 fichiers par upload
- Max 10MB par fichier
- Types: images (jpg, png, gif, webp) et vidéos (mp4, avi, mov)

---

## 8-12. Modèles de Configuration

### 8. EquipmentCategory
```javascript
{
  name: { type: String, required: true, unique: true },
  description: String,
  createdAt: Date,
  updatedAt: Date
}
```

### 9. EquipmentType
```javascript
{
  name: { type: String, required: true, unique: true },
  category: { type: ObjectId, ref: 'EquipmentCategory', required: true },
  description: String,
  createdAt: Date,
  updatedAt: Date
}
```

### 10. Brand
```javascript
{
  name: { type: String, required: true, unique: true },
  country: String,
  website: String,
  createdAt: Date,
  updatedAt: Date
}
```

### 11. ProductionLine
```javascript
{
  name: { type: String, required: true, unique: true },
  section: { type: ObjectId, ref: 'ProductionSection' },
  description: String,
  isActive: { type: Boolean, default: true },
  createdAt: Date,
  updatedAt: Date
}
```

### 12. ProductionSection
```javascript
{
  name: { type: String, required: true, unique: true },
  description: String,
  manager: String,
  isActive: { type: Boolean, default: true },
  createdAt: Date,
  updatedAt: Date
}
```

---

## 13. Personnel (4 modèles)

### Machinist
```javascript
{
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  employeeId: { type: String, unique: true },
  specialty: String,
  phone: String,
  email: String,
  isAvailable: { type: Boolean, default: true },
  createdAt: Date,
  updatedAt: Date
}
```

### Mechanic
```javascript
{
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  employeeId: { type: String, unique: true },
  specialty: String,
  certifications: [String],
  phone: String,
  email: String,
  isAvailable: { type: Boolean, default: true },
  createdAt: Date,
  updatedAt: Date
}
```

### Electrician
```javascript
{
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  employeeId: { type: String, unique: true },
  licenseNumber: String,
  certifications: [String],
  phone: String,
  email: String,
  isAvailable: { type: Boolean, default: true },
  createdAt: Date,
  updatedAt: Date
}
```

### MaintenanceWorker
```javascript
{
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  employeeId: { type: String, unique: true },
  skills: [String],
  phone: String,
  email: String,
  isAvailable: { type: Boolean, default: true },
  createdAt: Date,
  updatedAt: Date
}
```

---

## 📊 RELATIONS ENTRE MODÈLES

```
User
 ├─> Equipment (lastStatusChangedBy)
 ├─> EquipmentStatusHistory (changedBy)
 ├─> EquipmentPart (changedBy, replacementHistory.performedBy)
 └─> BreakdownMedia (uploadedBy)

Equipment
 ├─> EquipmentCategory (category)
 ├─> EquipmentType (type)
 ├─> Brand (brand)
 ├─> EquipmentStatusHistory (equipment)
 ├─> EquipmentPart (equipment)
 ├─> Intervention (equipmentId)
 └─> BreakdownMedia (equipment)

Part
 └─> EquipmentPart (part)

EquipmentPart
 ├─> Equipment (equipment)
 └─> Part (part)

Intervention
 └─> Equipment (equipmentId)

EquipmentStatusHistory
 ├─> Equipment (equipment)
 ├─> User (changedBy)
 ├─> Machinist (machinist)
 ├─> Mechanic (mechanic)
 ├─> Electrician (electrician)
 ├─> MaintenanceWorker (maintenanceWorker)
 └─> Intervention (intervention)

ProductionLine
 └─> ProductionSection (section)
```

---

**Document créé le 1er Novembre 2025**
