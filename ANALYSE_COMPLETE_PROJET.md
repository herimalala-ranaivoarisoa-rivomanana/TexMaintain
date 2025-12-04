# 📊 Analyse Complète du Projet TexMaintain

## 🎯 Vue d'Ensemble

**TexMaintain** est une application de **GMAO (Gestion de Maintenance Assistée par Ordinateur)** pour la gestion de maintenance industrielle.

### Architecture
- **Backend**: Node.js + Express.js + MongoDB
- **Frontend**: React + TypeScript + Vite
- **Base de données**: MongoDB (Docker)
- **UI**: TailwindCSS + shadcn/ui
- **Auth**: JWT (Access + Refresh tokens)

---

## 📁 Structure

```
TexMaintain/
├── client/          # Frontend React (25 pages, 58 composants)
├── server/          # Backend Node.js (15 modèles, 18 routes)
└── docker-compose.yml
```

---

## 🗄️ Modèles de Données (15 modèles)

### Equipment (Équipements)
```javascript
{
  category: ObjectId → EquipmentCategory,
  type: ObjectId → EquipmentType,
  status: String (14 statuts),
  brand: ObjectId → Brand,
  location: String,
  serialNumber: String,
  mtbf: Number,
  mttr: Number
}
```

**14 Statuts** (3 catégories):
- **Production**: in_production, setup_adjustment, paused_by_operator, changeover, breakdown, offline
- **Maintenance**: scheduled_maintenance, under_repair, in_workshop, waiting_spare_parts, testing_after_repair, under_inspection, pending_validation
- **Hors Service**: stored, scrapped

### EquipmentStatusHistory
```javascript
{
  equipment: ObjectId,
  previousStatus: String,
  newStatus: String,
  changedBy: ObjectId → User,
  machinist: ObjectId,        // Pour in_production
  mechanic: ObjectId,          // Pour under_repair
  electrician: ObjectId,       // Pour under_repair
  maintenanceWorker: ObjectId, // Pour under_repair
  duration: Number,
  timestamp: Date
}
```

### Part (Pièces et Consommables)
```javascript
{
  name: String,
  partNumber: String,
  type: String (enum: ['part', 'consumable']),
  currentStock: Number,
  minStock: Number,
  maxStock: Number
}
```

### EquipmentPart (Association)
```javascript
{
  equipment: ObjectId,
  part: ObjectId,
  quantity: Number,
  changedBy: ObjectId
}
```

### User
```javascript
{
  email: String,
  password: String (bcrypt),
  role: String (12 rôles),
  refreshToken: String
}
```

**12 Rôles**: admin, maintenance_manager, mechanic, electrician, etc.

### Personnel (4 modèles)
- **Mechanic** (spécialisations: General, Hydraulics, Pneumatics, Welding, Fabrication)
- **Electrician**
- **MaintenanceWorker**
- **Machinist**

### Autres Modèles
- **Intervention** (type, priority, status, equipmentId)
- **ProductionLine** (sections)
- **ProductionSection** (equipment)
- **Brand**, **EquipmentCategory**, **EquipmentType**

---

## 🔌 API Backend (18 routes)

### Equipment (`/api/equipment`)
```
GET    /api/equipment
POST   /api/equipment
GET    /api/equipment/:id
PUT    /api/equipment/:id
DELETE /api/equipment/:id

# Statuts
POST   /api/equipment/:id/change-status  ⚠️ Validation personnel
GET    /api/equipment/:id/allowed-transitions
GET    /api/equipment/:id/status-history

# Parts/Consommables
GET    /api/equipment/:id/part
POST   /api/equipment/:id/part
GET    /api/equipment/:id/consumable
POST   /api/equipment/:id/consumable
```

**Validation Spéciale**:
- `in_production` → Requiert `machinistId`
- `under_repair` → Requiert au moins 1 parmi: `mechanicId`, `electricianId`, `maintenanceWorkerId`

### Autres Routes
- `/api/auth` - Login, register, refresh
- `/api/inventory` - Parts/consommables
- `/api/interventions` - Interventions
- `/api/dashboard` - KPIs (MTBF, MTTR, Availability, OEE)
- `/api/process-area` - Lignes de production
- `/api/mechanics`, `/api/electricians`, etc. - Personnel
- `/api/equipment-categories`, `/api/equipment-types`, `/api/brands` - Référentiels

---

## 🎨 Frontend (25 pages)

### Pages Principales
1. **Dashboard** - KPIs en temps réel
2. **Equipment** - Liste, filtres, changement statut
3. **Inventory** - Parts/consommables, stock
4. **Interventions** - Gestion interventions
5. **Process areas** - Lignes et sections

### Composant Clé: EquipmentStatusDialog

Dialogue de changement de statut avec:
- Sélection nouveau statut (transitions autorisées)
- **Section conditionnelle pour "Under Repair"**:
  - Sélecteurs: Mechanic, Electrician, Maintenance Worker
  - Validation: au moins 1 requis
  - Feedback visuel: rouge (manquant) → orange (OK)
  - Bouton désactivé si validation échoue

---

## 🔄 Flux Principaux

### Changement Statut "Under Repair"
```
1. Sélection "Under Repair"
2. Section orange apparaît (3 sélecteurs)
3. Sélection ≥1 personnel
4. Validation client (bouton activé)
5. POST /api/equipment/:id/change-status
6. Validation route
7. Service: validation métier + vérification transition
8. Création EquipmentStatusHistory
9. Mise à jour Equipment.status
10. Retour + toast succès
```

### Association Part/Consommable
```
1. Clic icône Wrench/Droplet
2. Sélection part + quantité
3. POST /api/equipment/:id/part ou /consumable
4. Vérification part.type === 'consumable' (pour consommables)
5. Création EquipmentPart (index unique)
6. Retour + toast succès
```

---

## 🔐 Sécurité

- **Backend**: Helmet, Rate Limiting (1000/15min), JWT, Bcrypt
- **Frontend**: Tokens localStorage, Refresh auto, Protection routes

---

## 🐛 Bugs Corrigés

1. **Création équipement**: brand envoyé comme ObjectId
2. **Consommables**: Filtrage avec `$in` après récupération IDs
3. **Bouton actif**: Désactivation si personnel manquant + feedback visuel

---

## 🚀 Démarrage

```bash
# 1. Base de données
docker compose up -d

# 2. Backend
cd server && npm install && npm run dev

# 3. Frontend
cd client && npm install && npm run dev

# 4. Seed
npm run seed
```

**URLs**:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Mongo Express: http://localhost:8081

---

## 📊 Relations Clés

```
Equipment → EquipmentStatusHistory (historique)
Equipment → EquipmentPart → Part (parts/consommables)
EquipmentStatusHistory → Mechanic/Electrician/MaintenanceWorker
ProductionLine → ProductionSection → Equipment
```

---

## ✅ Fonctionnalités Principales

1. **Gestion Statuts**: 14 statuts, transitions contrôlées, historique complet
2. **Inventaire**: Parts/consommables, stock, alertes
3. **Interventions**: 3 types, 4 priorités, calcul MTTR
4. **Personnel**: 4 types, traçabilité complète
5. **Production**: Lignes, sections, équipements
6. **Dashboard**: KPIs temps réel (MTBF, MTTR, OEE)
