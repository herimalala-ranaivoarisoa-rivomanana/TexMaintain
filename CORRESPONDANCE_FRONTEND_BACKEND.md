# 🔄 Correspondance Frontend ↔ Backend - TexMaintain

## 📋 Table de Correspondance Complète

### 1. Equipment (Équipements)

#### Backend
**Modèle**: `server/models/Equipment.js`
**Route**: `server/routes/equipmentRoutes.js`
**Service**: `server/services/equipmentStatusService.js`

#### Frontend
**API Client**: `client/src/api/equipment.ts`
**Pages**: 
- `client/src/pages/Equipment.tsx` (liste)
- `client/src/pages/EquipmentDetail.tsx` (détails)
- `client/src/pages/EquipmentParts.tsx` (parts)
- `client/src/pages/EquipmentConsumables.tsx` (consommables)
- `client/src/pages/EquipmentInterventions.tsx` (interventions)

**Composants**:
- `client/src/components/EquipmentStatusDialog.tsx` (changement statut)

#### Endpoints ↔ Fonctions

| Backend Endpoint | Frontend Function | Page/Composant |
|-----------------|-------------------|----------------|
| `GET /api/equipment` | `getEquipment()` | Equipment.tsx |
| `POST /api/equipment` | `createEquipment()` | Equipment.tsx |
| `GET /api/equipment/:id` | `getEquipmentById()` | EquipmentDetail.tsx |
| `PUT /api/equipment/:id` | `updateEquipment()` | Equipment.tsx |
| `DELETE /api/equipment/:id` | `deleteEquipment()` | Equipment.tsx |
| `POST /api/equipment/:id/change-status` | `changeEquipmentStatus()` | EquipmentStatusDialog.tsx |
| `GET /api/equipment/:id/allowed-transitions` | `getAllowedTransitions()` | EquipmentStatusDialog.tsx |
| `GET /api/equipment/:id/status-history` | `getStatusHistory()` | EquipmentDetail.tsx |
| `GET /api/equipment/:id/part` | `getEquipmentParts()` | EquipmentParts.tsx |
| `POST /api/equipment/:id/part` | `addPartToEquipment()` | EquipmentParts.tsx |
| `DELETE /api/equipment/:id/part/:partId` | `removePartFromEquipment()` | EquipmentParts.tsx |
| `GET /api/equipment/:id/consumable` | `getEquipmentConsumables()` | EquipmentConsumables.tsx |
| `POST /api/equipment/:id/consumable` | `addConsumableToEquipment()` | EquipmentConsumables.tsx |
| `DELETE /api/equipment/:id/consumable/:partId` | `removeConsumableFromEquipment()` | EquipmentConsumables.tsx |

---

### 2. Inventory (Parts & Consommables)

#### Backend
**Modèle**: `server/models/Part.js`
**Route**: `server/routes/inventoryRoutes.js`

#### Frontend
**API Client**: `client/src/api/inventory.ts`
**Pages**: 
- `client/src/pages/Inventory.tsx` (liste)
- `client/src/pages/PartDetail.tsx` (détails)

#### Endpoints ↔ Fonctions

| Backend Endpoint | Frontend Function | Page |
|-----------------|-------------------|------|
| `GET /api/inventory` | `getInventory()` | Inventory.tsx |
| `POST /api/inventory` | `createPart()` | Inventory.tsx |
| `GET /api/inventory/:id` | `getPartById()` | PartDetail.tsx |
| `PUT /api/inventory/:id` | `updatePart()` | Inventory.tsx |
| `DELETE /api/inventory/:id` | `deletePart()` | Inventory.tsx |
| `POST /api/inventory/:id/stock` | `adjustStock()` | Inventory.tsx |

---

### 3. Interventions

#### Backend
**Modèle**: `server/models/Intervention.js`
**Route**: `server/routes/interventionsRoutes.js`

#### Frontend
**API Client**: `client/src/api/interventions.ts`
**Pages**: 
- `client/src/pages/Interventions.tsx` (liste)
- `client/src/pages/InterventionDetail.tsx` (détails)

#### Endpoints ↔ Fonctions

| Backend Endpoint | Frontend Function | Page |
|-----------------|-------------------|------|
| `GET /api/interventions` | `getInterventions()` | Interventions.tsx |
| `POST /api/interventions` | `createIntervention()` | Interventions.tsx |
| `GET /api/interventions/:id` | `getInterventionById()` | InterventionDetail.tsx |
| `PUT /api/interventions/:id` | `updateIntervention()` | Interventions.tsx |
| `DELETE /api/interventions/:id` | `deleteIntervention()` | Interventions.tsx |

---

### 4. Authentication

#### Backend
**Modèle**: `server/models/User.js`
**Route**: `server/routes/authRoutes.js`

#### Frontend
**API Client**: `client/src/api/auth.ts`
**Context**: `client/src/contexts/AuthContext.tsx`
**Pages**: 
- `client/src/pages/Login.tsx`
- `client/src/pages/Register.tsx`

#### Endpoints ↔ Fonctions

| Backend Endpoint | Frontend Function | Contexte/Page |
|-----------------|-------------------|---------------|
| `POST /api/auth/login` | `login()` | AuthContext + Login.tsx |
| `POST /api/auth/register` | `register()` | Register.tsx |
| `POST /api/auth/refresh` | Auto (interceptor) | api.ts |
| `POST /api/auth/logout` | `logout()` | AuthContext |
| `GET /api/auth/me` | `getProfile()` | AuthContext |

---

### 5. Dashboard (KPIs)

#### Backend
**Route**: `server/routes/dashboardRoutes.js`
**Service**: Calculs dans la route

#### Frontend
**API Client**: `client/src/api/dashboard.ts`
**Page**: `client/src/pages/Dashboard.tsx`

#### Endpoints ↔ Fonctions

| Backend Endpoint | Frontend Function | Page |
|-----------------|-------------------|------|
| `GET /api/dashboard/kpis` | `getDashboardKPIs()` | Dashboard.tsx |
| `GET /api/dashboard/stats` | `getDashboardStats()` | Dashboard.tsx |

---

### 6. Process areas

#### Backend
**Modèle**: `server/models/ProductionLine.js`
**Route**: `server/routes/productionLinesRoutes.js`

#### Frontend
**API Client**: `client/src/api/productionLines.ts`
**Page**: `client/src/pages/ProductionLines.tsx`

#### Endpoints ↔ Fonctions

| Backend Endpoint | Frontend Function | Page |
|-----------------|-------------------|------|
| `GET /api/process-area` | `getProductionLines()` | ProductionLines.tsx |
| `POST /api/process-area` | `createProductionLine()` | ProductionLines.tsx |
| `GET /api/process-area/:id` | `getProductionLineById()` | ProductionLines.tsx |
| `PUT /api/process-area/:id` | `updateProductionLine()` | ProductionLines.tsx |
| `DELETE /api/process-area/:id` | `deleteProductionLine()` | ProductionLines.tsx |
| `POST /api/process-area/:id/sections` | `addSectionToLine()` | ProductionLines.tsx |
| `DELETE /api/process-area/:id/sections/:sectionId` | `removeSectionFromLine()` | ProductionLines.tsx |

---

### 7. Production Sections

#### Backend
**Modèle**: `server/models/ProductionSection.js`
**Route**: `server/routes/productionSectionsRoutes.js`

#### Frontend
**API Client**: `client/src/api/productionSections.ts`
**Page**: `client/src/pages/ProductionLines.tsx` (intégré)

#### Endpoints ↔ Fonctions

| Backend Endpoint | Frontend Function | Page |
|-----------------|-------------------|------|
| `GET /api/production-sections` | `getProductionSections()` | ProductionLines.tsx |
| `POST /api/production-sections` | `createProductionSection()` | ProductionLines.tsx |
| `PUT /api/production-sections/:id` | `updateProductionSection()` | ProductionLines.tsx |
| `DELETE /api/production-sections/:id` | `deleteProductionSection()` | ProductionLines.tsx |
| `POST /api/production-sections/:id/equipment` | `addEquipmentToSection()` | ProductionLines.tsx |
| `DELETE /api/production-sections/:id/equipment/:equipmentId` | `removeEquipmentFromSection()` | ProductionLines.tsx |

---

### 8. Personnel (4 modules identiques)

#### 8.1 Mechanics

**Backend**
- Modèle: `server/models/Mechanic.js`
- Route: `server/routes/mechanicRoutes.js`

**Frontend**
- API: `client/src/api/mechanics.ts`
- Page: `client/src/pages/Mechanics.tsx`

| Backend Endpoint | Frontend Function | Page |
|-----------------|-------------------|------|
| `GET /api/mechanics` | `getMechanics()` | Mechanics.tsx + EquipmentStatusDialog.tsx |
| `POST /api/mechanics` | `createMechanic()` | Mechanics.tsx |
| `GET /api/mechanics/:id` | `getMechanicById()` | Mechanics.tsx |
| `PUT /api/mechanics/:id` | `updateMechanic()` | Mechanics.tsx |
| `DELETE /api/mechanics/:id` | `deleteMechanic()` | Mechanics.tsx |

#### 8.2 Electricians

**Backend**
- Modèle: `server/models/Electrician.js`
- Route: `server/routes/electricianRoutes.js`

**Frontend**
- API: `client/src/api/electricians.ts`
- Page: `client/src/pages/Electricians.tsx`

| Backend Endpoint | Frontend Function | Page |
|-----------------|-------------------|------|
| `GET /api/electricians` | `getElectricians()` | Electricians.tsx + EquipmentStatusDialog.tsx |
| `POST /api/electricians` | `createElectrician()` | Electricians.tsx |
| `PUT /api/electricians/:id` | `updateElectrician()` | Electricians.tsx |
| `DELETE /api/electricians/:id` | `deleteElectrician()` | Electricians.tsx |

#### 8.3 Maintenance Workers

**Backend**
- Modèle: `server/models/MaintenanceWorker.js`
- Route: `server/routes/maintenanceWorkerRoutes.js`

**Frontend**
- API: `client/src/api/maintenanceWorkers.ts`
- Page: `client/src/pages/MaintenanceWorkers.tsx`

| Backend Endpoint | Frontend Function | Page |
|-----------------|-------------------|------|
| `GET /api/maintenance-workers` | `getMaintenanceWorkers()` | MaintenanceWorkers.tsx + EquipmentStatusDialog.tsx |
| `POST /api/maintenance-workers` | `createMaintenanceWorker()` | MaintenanceWorkers.tsx |
| `PUT /api/maintenance-workers/:id` | `updateMaintenanceWorker()` | MaintenanceWorkers.tsx |
| `DELETE /api/maintenance-workers/:id` | `deleteMaintenanceWorker()` | MaintenanceWorkers.tsx |

#### 8.4 Machinists

**Backend**
- Modèle: `server/models/Machinist.js`
- Route: `server/routes/machinistRoutes.js`

**Frontend**
- API: `client/src/api/machinists.ts`
- Page: `client/src/pages/Machinists.tsx`

| Backend Endpoint | Frontend Function | Page |
|-----------------|-------------------|------|
| `GET /api/machinists` | `getMachinists()` | Machinists.tsx |
| `POST /api/machinists` | `createMachinist()` | Machinists.tsx |
| `PUT /api/machinists/:id` | `updateMachinist()` | Machinists.tsx |
| `DELETE /api/machinists/:id` | `deleteMachinist()` | Machinists.tsx |

---

### 9. Référentiels (3 modules identiques)

#### 9.1 Equipment Categories

**Backend**
- Modèle: `server/models/EquipmentCategory.js`
- Route: `server/routes/equipmentCategoriesRoutes.js`

**Frontend**
- API: `client/src/api/equipmentCategories.ts`
- Page: `client/src/pages/EquipmentCategories.tsx`

| Backend Endpoint | Frontend Function | Page |
|-----------------|-------------------|------|
| `GET /api/equipment-categories` | `getEquipmentCategories()` | EquipmentCategories.tsx + Equipment.tsx |
| `POST /api/equipment-categories` | `createEquipmentCategory()` | EquipmentCategories.tsx |
| `PUT /api/equipment-categories/:id` | `updateEquipmentCategory()` | EquipmentCategories.tsx |
| `DELETE /api/equipment-categories/:id` | `deleteEquipmentCategory()` | EquipmentCategories.tsx |

#### 9.2 Equipment Types

**Backend**
- Modèle: `server/models/EquipmentType.js`
- Route: `server/routes/equipmentTypesRoutes.js`

**Frontend**
- API: `client/src/api/equipmentTypes.ts`
- Page: `client/src/pages/EquipmentTypes.tsx`

| Backend Endpoint | Frontend Function | Page |
|-----------------|-------------------|------|
| `GET /api/equipment-types` | `getEquipmentTypes()` | EquipmentTypes.tsx + Equipment.tsx |
| `POST /api/equipment-types` | `createEquipmentType()` | EquipmentTypes.tsx |
| `PUT /api/equipment-types/:id` | `updateEquipmentType()` | EquipmentTypes.tsx |
| `DELETE /api/equipment-types/:id` | `deleteEquipmentType()` | EquipmentTypes.tsx |

#### 9.3 Brands

**Backend**
- Modèle: `server/models/Brand.js`
- Route: `server/routes/brandsRoutes.js`

**Frontend**
- API: `client/src/api/brands.ts`
- Page: `client/src/pages/Brands.tsx`

| Backend Endpoint | Frontend Function | Page |
|-----------------|-------------------|------|
| `GET /api/brands` | `getBrands()` | Brands.tsx + Equipment.tsx |
| `POST /api/brands` | `createBrand()` | Brands.tsx |
| `PUT /api/brands/:id` | `updateBrand()` | Brands.tsx |
| `DELETE /api/brands/:id` | `deleteBrand()` | Brands.tsx |

---

### 10. Seed (Initialisation)

#### Backend
**Route**: `server/routes/seedRoutes.js`

#### Frontend
**API Client**: `client/src/api/seed.ts`
**Page**: `client/src/pages/Settings.tsx` (section admin)

| Backend Endpoint | Frontend Function | Page |
|-----------------|-------------------|------|
| `POST /api/seed/all` | `seedAll()` | Settings.tsx |
| `POST /api/seed/admin` | `seedAdmin()` | Settings.tsx |
| `POST /api/seed/equipment-categories` | `seedEquipmentCategories()` | Settings.tsx |
| `POST /api/seed/equipment-types` | `seedEquipmentTypes()` | Settings.tsx |
| `POST /api/seed/equipment` | `seedEquipment()` | Settings.tsx |
| `POST /api/seed/parts` | `seedParts()` | Settings.tsx |

---

## 🔄 Flux de Données Détaillés

### Flux 1: Changement de Statut "Under Repair"

```
Frontend: EquipmentStatusDialog.tsx
  ↓ Sélection statut
  ↓ Affichage section personnel (conditionnel)
  ↓ Sélection ≥1 personnel
  ↓ Validation client (bouton activé)
  ↓
API: equipment.ts → changeEquipmentStatus()
  ↓ POST /api/equipment/:id/change-status
  ↓ Body: { status, reason, notes, mechanicId, electricianId, maintenanceWorkerId }
  ↓
Backend: equipmentRoutes.js
  ↓ Validation route: au moins 1 personnel
  ↓ Appel EquipmentStatusService.changeStatus()
  ↓
Service: equipmentStatusService.js
  ↓ Validation métier
  ↓ Vérification transition autorisée
  ↓ Création EquipmentStatusHistory
  ↓ Mise à jour Equipment.status
  ↓ Population références
  ↓
Response: { success, equipment, historyEntry }
  ↓
Frontend: EquipmentStatusDialog.tsx
  ↓ Toast succès
  ↓ Fermeture dialog
  ↓ Callback onStatusChanged()
  ↓
Equipment.tsx
  ↓ Rafraîchissement liste
```

### Flux 2: Association Consommable

```
Frontend: EquipmentConsumables.tsx
  ↓ Clic "Ajouter Consommable"
  ↓ Sélection part (type='consumable')
  ↓ Saisie quantité
  ↓
API: equipment.ts → addConsumableToEquipment()
  ↓ POST /api/equipment/:id/consumable
  ↓ Body: { partId, quantity, notes }
  ↓
Backend: equipmentRoutes.js
  ↓ Vérification equipment existe
  ↓ Vérification part existe
  ↓ Vérification part.type === 'consumable'
  ↓ Création EquipmentPart
  ↓ Index unique { equipment, part }
  ↓
Response: { success, equipmentPart }
  ↓
Frontend: EquipmentConsumables.tsx
  ↓ Toast succès
  ↓ Ajout à la liste locale
```

### Flux 3: Authentification + Refresh

```
Frontend: Login.tsx
  ↓ Saisie credentials
  ↓
API: auth.ts → login()
  ↓ POST /api/auth/login
  ↓ Body: { email, password }
  ↓
Backend: authRoutes.js
  ↓ Recherche user
  ↓ Vérification password (bcrypt)
  ↓ Génération accessToken (JWT, 15min)
  ↓ Génération refreshToken (UUID)
  ↓ Mise à jour User.refreshToken
  ↓
Response: { data: { accessToken, refreshToken, user } }
  ↓
Frontend: AuthContext.tsx
  ↓ Stockage tokens (localStorage)
  ↓ Stockage user (state)
  ↓ Redirection Dashboard
  ↓
--- Requêtes suivantes ---
  ↓
API: api.ts (interceptor request)
  ↓ Ajout header: Authorization: Bearer {accessToken}
  ↓
--- Si 401/403 ---
  ↓
API: api.ts (interceptor response)
  ↓ POST /api/auth/refresh
  ↓ Body: { refreshToken }
  ↓
Backend: authRoutes.js
  ↓ Vérification refreshToken
  ↓ Génération nouveaux tokens
  ↓
Response: { data: { accessToken, refreshToken } }
  ↓
API: api.ts
  ↓ Mise à jour localStorage
  ↓ Retry requête originale
```

---

## 📊 Statistiques de Correspondance

### Backend
- **15 modèles** MongoDB
- **18 routes** Express
- **5 services** métier
- **~80 endpoints** API

### Frontend
- **16 API clients** TypeScript
- **25 pages** React
- **58 composants** UI
- **~80 fonctions** API

### Correspondance
- ✅ **100% des endpoints** ont une fonction frontend
- ✅ **Toutes les pages** consomment les API
- ✅ **Validation double** (client + serveur)
- ✅ **Types TypeScript** synchronisés

---

## ✅ Points de Validation

### 1. Création d'Équipement
- ✅ Frontend envoie `brandId` (ObjectId)
- ✅ Backend valide et crée avec statut par défaut
- ✅ Correspondance types: `ChangeStatusRequest` ↔ route

### 2. Changement de Statut
- ✅ Frontend: validation client (bouton désactivé)
- ✅ Backend: validation serveur (route + service)
- ✅ Personnel requis pour `under_repair`
- ✅ Historique complet avec traçabilité

### 3. Association Parts/Consommables
- ✅ Routes séparées: `/part` et `/consumable`
- ✅ Filtrage correct par `part.type`
- ✅ Index unique empêche doublons
- ✅ Population des références

### 4. Authentification
- ✅ JWT avec refresh automatique
- ✅ Intercepteurs Axios configurés
- ✅ Protection routes côté client
- ✅ Middleware auth côté serveur

---

## 🎯 Conclusion

Le projet TexMaintain présente une **correspondance complète et cohérente** entre frontend et backend:

- ✅ Architecture claire et organisée
- ✅ Séparation des responsabilités
- ✅ Validation double (client + serveur)
- ✅ Types TypeScript synchronisés
- ✅ Gestion d'erreurs robuste
- ✅ Traçabilité complète des actions
