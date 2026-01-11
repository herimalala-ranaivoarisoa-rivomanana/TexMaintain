# 🔄 Correspondance Frontend ↔ Backend - TexMaintain

## 📋 Table de Correspondance Complète

### 1. Asset (Équipements)

#### Backend
**Modèle**: `server/models/Asset.js`
**Route**: `server/routes/assetRoutes.js`
**Service**: `server/services/assetStatusService.js`

#### Frontend
**API Client**: `client/src/api/asset.ts`
**Pages**: 
- `client/src/pages/Asset.tsx` (liste)
- `client/src/pages/AssetDetail.tsx` (détails)
- `client/src/pages/AssetParts.tsx` (parts)
- `client/src/pages/AssetConsumables.tsx` (consommables)
- `client/src/pages/AssetInterventions.tsx` (interventions)

**Composants**:
- `client/src/components/AssetStatusDialog.tsx` (changement statut)

#### Endpoints ↔ Fonctions

| Backend Endpoint | Frontend Function | Page/Composant |
|-----------------|-------------------|----------------|
| `GET /api/asset` | `getAsset()` | Asset.tsx |
| `POST /api/asset` | `createAsset()` | Asset.tsx |
| `GET /api/asset/:id` | `getAssetById()` | AssetDetail.tsx |
| `PUT /api/asset/:id` | `updateAsset()` | Asset.tsx |
| `DELETE /api/asset/:id` | `deleteAsset()` | Asset.tsx |
| `POST /api/asset/:id/change-status` | `changeAssetStatus()` | AssetStatusDialog.tsx |
| `GET /api/asset/:id/allowed-transitions` | `getAllowedTransitions()` | AssetStatusDialog.tsx |
| `GET /api/asset/:id/status-history` | `getStatusHistory()` | AssetDetail.tsx |
| `GET /api/asset/:id/part` | `getAssetParts()` | AssetParts.tsx |
| `POST /api/asset/:id/part` | `addPartToAsset()` | AssetParts.tsx |
| `DELETE /api/asset/:id/part/:partId` | `removePartFromAsset()` | AssetParts.tsx |
| `GET /api/asset/:id/consumable` | `getAssetConsumables()` | AssetConsumables.tsx |
| `POST /api/asset/:id/consumable` | `addConsumableToAsset()` | AssetConsumables.tsx |
| `DELETE /api/asset/:id/consumable/:partId` | `removeConsumableFromAsset()` | AssetConsumables.tsx |

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
| `POST /api/production-sections/:id/asset` | `addAssetToSection()` | ProductionLines.tsx |
| `DELETE /api/production-sections/:id/asset/:assetId` | `removeAssetFromSection()` | ProductionLines.tsx |

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
| `GET /api/mechanics` | `getMechanics()` | Mechanics.tsx + AssetStatusDialog.tsx |
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
| `GET /api/electricians` | `getElectricians()` | Electricians.tsx + AssetStatusDialog.tsx |
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
| `GET /api/maintenance-workers` | `getMaintenanceWorkers()` | MaintenanceWorkers.tsx + AssetStatusDialog.tsx |
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

#### 9.1 Asset Categories

**Backend**
- Modèle: `server/models/Category.js`
- Route: `server/routes/assetCategoriesRoutes.js`

**Frontend**
- API: `client/src/api/assetCategories.ts`
- Page: `client/src/pages/AssetCategories.tsx`

| Backend Endpoint | Frontend Function | Page |
|-----------------|-------------------|------|
| `GET /api/asset-categories` | `getAssetCategories()` | AssetCategories.tsx + Asset.tsx |
| `POST /api/asset-categories` | `createCategory()` | AssetCategories.tsx |
| `PUT /api/asset-categories/:id` | `updateCategory()` | AssetCategories.tsx |
| `DELETE /api/asset-categories/:id` | `deleteCategory()` | AssetCategories.tsx |

#### 9.2 Asset Types

**Backend**
- Modèle: `server/models/SubCategory.js`
- Route: `server/routes/assetTypesRoutes.js`

**Frontend**
- API: `client/src/api/assetTypes.ts`
- Page: `client/src/pages/SubCategorys.tsx`

| Backend Endpoint | Frontend Function | Page |
|-----------------|-------------------|------|
| `GET /api/asset-types` | `getSubCategorys()` | SubCategorys.tsx + Asset.tsx |
| `POST /api/asset-types` | `createSubCategory()` | SubCategorys.tsx |
| `PUT /api/asset-types/:id` | `updateSubCategory()` | SubCategorys.tsx |
| `DELETE /api/asset-types/:id` | `deleteSubCategory()` | SubCategorys.tsx |

#### 9.3 Brands

**Backend**
- Modèle: `server/models/Brand.js`
- Route: `server/routes/brandsRoutes.js`

**Frontend**
- API: `client/src/api/brands.ts`
- Page: `client/src/pages/Brands.tsx`

| Backend Endpoint | Frontend Function | Page |
|-----------------|-------------------|------|
| `GET /api/brands` | `getBrands()` | Brands.tsx + Asset.tsx |
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
| `POST /api/seed/asset-categories` | `seedAssetCategories()` | Settings.tsx |
| `POST /api/seed/asset-types` | `seedSubCategorys()` | Settings.tsx |
| `POST /api/seed/asset` | `seedAsset()` | Settings.tsx |
| `POST /api/seed/parts` | `seedParts()` | Settings.tsx |

---

## 🔄 Flux de Données Détaillés

### Flux 1: Changement de Statut "Under Repair"

```
Frontend: AssetStatusDialog.tsx
  ↓ Sélection statut
  ↓ Affichage section personnel (conditionnel)
  ↓ Sélection ≥1 personnel
  ↓ Validation client (bouton activé)
  ↓
API: asset.ts → changeAssetStatus()
  ↓ POST /api/asset/:id/change-status
  ↓ Body: { status, reason, notes, mechanicId, electricianId, maintenanceWorkerId }
  ↓
Backend: assetRoutes.js
  ↓ Validation route: au moins 1 personnel
  ↓ Appel AssetStatusService.changeStatus()
  ↓
Service: assetStatusService.js
  ↓ Validation métier
  ↓ Vérification transition autorisée
  ↓ Création AssetStatusHistory
  ↓ Mise à jour Asset.status
  ↓ Population références
  ↓
Response: { success, asset, historyEntry }
  ↓
Frontend: AssetStatusDialog.tsx
  ↓ Toast succès
  ↓ Fermeture dialog
  ↓ Callback onStatusChanged()
  ↓
Asset.tsx
  ↓ Rafraîchissement liste
```

### Flux 2: Association Consommable

```
Frontend: AssetConsumables.tsx
  ↓ Clic "Ajouter Consommable"
  ↓ Sélection part (type='consumable')
  ↓ Saisie quantité
  ↓
API: asset.ts → addConsumableToAsset()
  ↓ POST /api/asset/:id/consumable
  ↓ Body: { partId, quantity, notes }
  ↓
Backend: assetRoutes.js
  ↓ Vérification asset existe
  ↓ Vérification part existe
  ↓ Vérification part.type === 'consumable'
  ↓ Création AssetPart
  ↓ Index unique { asset, part }
  ↓
Response: { success, assetPart }
  ↓
Frontend: AssetConsumables.tsx
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
