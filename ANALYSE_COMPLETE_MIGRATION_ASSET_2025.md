# 📊 ANALYSE COMPLÈTE DE LA MIGRATION EQUIPMENT → ASSET

**Date**: Décembre 2025  
**Version**: Analyse approfondie  
**Projet**: TexMaintain - GMAO pour industrie textile

---

## 🎯 RÉSUMÉ EXÉCUTIF

### État de la Migration

| Composant | État | Progression |
|-----------|------|------------|
| **Backend - Modèles** | ✅ Migré | 100% |
| **Backend - Routes** | ⚠️ Partiel | ~60% |
| **Backend - Services** | ⚠️ À adapter | ~70% |
| **Frontend - API Clients** | ⚠️ Partiel | ~70% |
| **Frontend - Pages** | ⚠️ Partiel | ~60% |
| **Frontend - Composants** | ⚠️ À migrer | ~40% |
| **Frontend - Types** | ⚠️ À migrer | ~30% |

### Changements de Nommage

| Ancien Nom | Nouveau Nom | Statut |
|------------|-------------|--------|
| `Asset` | `Asset` | ✅ Modèle créé, ⚠️ Routes incomplètes |
| `Category` | `Category` | ✅ Migré |
| `SubCategory` | `SubCategory` | ✅ Migré |
| `AssetPart` | `AssetPart` | ⚠️ Nom inchangé, référence `Asset` |
| `AssetStatusHistory` | `AssetStatusHistory` | ⚠️ Nom inchangé, référence `Asset` |

---

## 📁 PARTIE 1 : ANALYSE BACKEND

### 1.1 Modèles de Données

#### ✅ Asset.js - **MIGRÉ**

**Fichier**: `server/models/Asset.js`

**Structure**:
```javascript
{
  // Classification
  name: String
  code: String (unique, sparse)
  factory: ObjectId → Factory (required: false, sera required après migration)
  assetClass: ObjectId → AssetClass (required: false, sera required après migration)
  category: ObjectId → Category (required: true) ✅
  subCategory: ObjectId → SubCategory (required: true) ✅
  
  // Statut
  status: String (enum: EQUIPMENT_STATUSES)
  statusCategory: String (enum: production|maintenance|out_of_service)
  lastStatusChange: Date
  lastStatusChangedBy: ObjectId → User
  
  // Localisation
  location: String (required, default: 'Antsirabe-1')
  productionLine: ObjectId → ProductionLine
  productionSection: ObjectId → ProductionSection
  processArea: ObjectId → ProcessArea
  processDepartment: ObjectId → ProcessDepartment
  
  // Identification technique
  manufacturer: String
  model: String
  serialNumber: String (unique, sparse)
  chipNumber: String
  brand: ObjectId → Brand
  
  // Maintenance
  acquisitionDate: Date
  lastMaintenance: Date
  nextMaintenance: Date
  mtbf: Number (heures)
  mttr: Number (heures)
  availability: Number (%)
  downtime: Number (heures)
  operatingTime: Number (heures)
  
  // Financier
  purchasePrice: Number
  usefulLifeYears: Number (default: 10)
  salvageValue: Number
  currentValue: Number
  totalMaintenanceCost: Number
  tco: Number (Total Cost of Ownership)
}
```

**Méthodes**:
- `canTransitionTo(newStatus)`: Vérifie transition autorisée
- `getAllowedTransitions()`: Liste transitions possibles
- `migrateLegacyStatus(legacyStatus)`: Migration statuts legacy

**Hooks**:
- `pre('save')`: Met à jour `updatedAt`, `lastStatusChange`, `statusCategory`

**Export**:
```javascript
module.exports = {
  Asset,                    // ✅ Nouveau nom
  Asset: Asset,          // ⚠️ Alias pour compatibilité
  EQUIPMENT_STATUSES,
  LEGACY_STATUS_MAP
}
```

**Problèmes identifiés**:
- ⚠️ Utilise encore `EQUIPMENT_STATUSES` (devrait être `ASSET_STATUSES`)
- ⚠️ Exporte `Asset` comme alias (à supprimer après migration complète)

---

#### ✅ Category.js - **MIGRÉ**

**Fichier**: `server/models/Category.js`

**Structure**:
```javascript
{
  name: String (required, unique)
  description: String
  assetClass: ObjectId → AssetClass (required: true) ✅
  createdAt: Date (immutable)
  updatedAt: Date
}
```

**Relations**:
- `Category` → `AssetClass` (many-to-one)
- `Category` → `SubCategory` (one-to-many)
- `Category` → `Asset` (one-to-many)

**Statut**: ✅ **Complètement migré**

---

#### ✅ SubCategory.js - **MIGRÉ**

**Fichier**: `server/models/SubCategory.js`

**Structure**:
```javascript
{
  name: String (required)
  description: String
  category: ObjectId → Category (required: true) ✅
  createdAt: Date (immutable)
  updatedAt: Date
}
```

**Relations**:
- `SubCategory` → `Category` (many-to-one)
- `SubCategory` → `Asset` (one-to-many)

**Statut**: ✅ **Complètement migré**

---

#### ✅ AssetClass.js - **NOUVEAU**

**Fichier**: `server/models/AssetClass.js`

**Structure**:
```javascript
{
  name: String (required, unique)
  description: String
  createdAt: Date (immutable)
  updatedAt: Date
}
```

**Relations**:
- `AssetClass` → `Category` (one-to-many)
- `AssetClass` → `Asset` (one-to-many)

**Statut**: ✅ **Nouveau modèle créé**

---

#### ⚠️ AssetPart.js - **PARTIELLEMENT MIGRÉ**

**Fichier**: `server/models/AssetPart.js`

**Structure**:
```javascript
{
  asset: ObjectId → Asset (required) ✅ Référence Asset
  part: ObjectId → Part (required)
  
  // Paramètres consommation
  quantityPerMachine: Number
  replacementFrequencyPerYear: Number
  
  // Criticité
  criticality: String (enum: low|medium|high|critical)
  criticalityScore: Number (1-4)
  machineImportance: Number (1-100)
  
  // Calculs automatiques
  annualConsumption: Number
  dailyConsumption: Number
  safetyStock: Number
  reorderPoint: Number
  
  // Historique
  replacementHistory: Array
  lastReplacementDate: Date
  nextReplacementDate: Date
}
```

**Problèmes identifiés**:
- ⚠️ Nom du modèle reste `AssetPart` (devrait être `AssetPart`)
- ✅ Référence `asset` pointe vers `Asset` (ligne 11)
- ⚠️ Commentaires utilisent encore "équipement" au lieu de "asset"

**Recommandation**: Renommer en `AssetPart` après migration complète

---

#### ⚠️ AssetStatusHistory.js - **À MIGRER**

**Fichier**: `server/models/AssetStatusHistory.js`

**Structure**:
```javascript
{
  asset: ObjectId → Asset (required) ⚠️ Devrait être Asset
  previousStatus: String
  newStatus: String (required)
  changedBy: ObjectId → User (required)
  reason: String
  notes: String
  intervention: ObjectId → Intervention
  machinist: ObjectId → Personnel
  mechanic: ObjectId → Personnel
  electrician: ObjectId → Personnel
  maintenanceWorker: ObjectId → Personnel
  breakdownInfo: {
    type: String
    description: String
  }
  duration: Number (minutes)
  media: Array<String>
  timestamp: Date
}
```

**Problèmes identifiés**:
- ⚠️ Référence `asset` pointe vers `Asset` (ligne 169)
- ⚠️ Nom du modèle reste `AssetStatusHistory`
- ⚠️ Constantes `EQUIPMENT_STATUSES` utilisées partout

**Recommandation**: 
1. Renommer en `AssetStatusHistory`
2. Changer référence `asset` vers `Asset`
3. Renommer constantes en `ASSET_STATUSES`

---

#### ⚠️ Intervention.js - **PARTIELLEMENT MIGRÉ**

**Fichier**: `server/models/Intervention.js`

**Structure**:
```javascript
{
  title: String (required)
  type: String (enum: Corrective|Preventive|Emergency)
  priority: String (enum: Low|Medium|High|Critical)
  status: String (enum: Pending|In Progress|Completed|Cancelled)
  asset: String (required: false) ⚠️ Legacy field
  assetId: ObjectId → Asset (required: false) ⚠️ Devrait être Asset
  factory: ObjectId → Factory (required)
  assignedTo: String
  description: String
  createdDate: Date
  dueDate: Date
  completedDate: Date
  estimatedDuration: Number (heures)
  actualDuration: Number (heures)
  cost: Number
}
```

**Problèmes identifiés**:
- ⚠️ `assetId` référence `Asset` (ligne 13)
- ⚠️ Champ legacy `asset` (String) toujours présent

**Recommandation**: 
1. Changer `assetId` pour référencer `Asset`
2. Supprimer champ legacy `asset` après migration données

---

#### ⚠️ BreakdownMedia.js - **À MIGRER**

**Fichier**: `server/models/BreakdownMedia.js`

**Structure**:
```javascript
{
  asset: ObjectId → Asset (required) ⚠️ Devrait être Asset
  breakdownType: String (enum: mechanical|electrical|...)
  description: String (required)
  files: Array<{
    filename: String
    originalName: String
    mimetype: String
    size: Number
    path: String
    uploadedAt: Date
  }>
  createdBy: ObjectId → User
}
```

**Problèmes identifiés**:
- ⚠️ Référence `asset` pointe vers `Asset` (ligne 6)

**Recommandation**: Changer référence vers `Asset`

---

### 1.2 Routes Backend

#### ⚠️ assetRoutes.js - **INCOMPLET (60%)**

**Fichier**: `server/routes/assetRoutes.js`

**Endpoints migrés**:
- ✅ `GET /api/assets` (lignes 47-103) - Utilise `Asset`
- ✅ `GET /api/assets/:id` (ligne 106) - Structure incomplète

**Endpoints avec problèmes**:

1. **Lignes 106-138**: Code cassé/incomplet
   ```javascript
   router.get('/:id', requireUser, async (req, res) => {
   }); // ⚠️ Fonction vide, code suivant semble mal placé
   ```

2. **Lignes 140-189**: `GET /:id/consumable`
   - ⚠️ Utilise `Asset.findById(id)` (ligne 147)
   - ⚠️ Utilise `Asset.findById(id)` avec populate `type` (ligne 149)
   - ⚠️ Messages d'erreur mentionnent "asset" (lignes 153, 186)

3. **Lignes 191-220**: `POST /:id/consumable`
   - ⚠️ Utilise `AssetPart` (correct mais nom à changer)
   - ⚠️ Messages d'erreur mentionnent "asset consumable" (lignes 217-218)

4. **Lignes 222-351**: `POST /` (Création)
   - ⚠️ Schéma Zod utilise `type` au lieu de `subCategory` (ligne 225)
   - ⚠️ Utilise `Asset.create()` (ligne 252)
   - ⚠️ Utilise `AssetStatusHistory` (ligne 255)
   - ⚠️ Utilise `Asset.findOne()` (ligne 271)
   - ⚠️ Utilise `Asset.findById()` (ligne 333)
   - ⚠️ Populate utilise `type` au lieu de `subCategory` (ligne 335)
   - ⚠️ Messages d'erreur mentionnent "Asset" (lignes 344-345, 348-349)

5. **Lignes 353-433**: `PATCH /:id` (Mise à jour)
   - ⚠️ Utilise `Asset.findById()` (ligne 368)
   - ⚠️ Utilise `Asset.findByIdAndUpdate()` (lignes 396, 420)
   - ⚠️ Populate utilise `type` au lieu de `subCategory` (ligne 422)
   - ⚠️ Messages d'erreur mentionnent "Asset" (lignes 369, 427, 430-431)

6. **Lignes 435-441**: `DELETE /:id`
   - ⚠️ Utilise `Asset.findByIdAndDelete()` (ligne 438)
   - ⚠️ Message d'erreur mentionne "Asset" (ligne 439)

7. **Lignes 443-475**: `POST /:id/` (Change status - Duplicate?)
   - ⚠️ Route semble dupliquée avec ligne 479
   - ⚠️ Utilise `AssetStatusService` (correct mais service à adapter)

8. **Lignes 477-519**: `POST /:id/change-status`
   - ⚠️ Utilise `AssetStatusService` (correct mais service à adapter)

9. **Lignes 521-541**: `GET /:id/status-history`
   - ⚠️ Utilise `AssetStatusService` (correct mais service à adapter)

10. **Lignes 543-590**: Routes timeline
    - ⚠️ Utilise `AssetTimelineService` (service non trouvé)
    - ⚠️ Messages d'erreur mentionnent "asset" (lignes 568-569, 587-588)

11. **Lignes 594-711**: Autres routes
    - ⚠️ Toutes utilisent `AssetStatusService`
    - ⚠️ Messages d'erreur mentionnent "asset"
    - ⚠️ Route `/statuses/metadata` utilise `STATUS_METADATA` non importé (ligne 705)

**Imports manquants**:
- ⚠️ `z` (Zod) non importé (utilisé ligne 192, 223)
- ⚠️ `EQUIPMENT_STATUSES` non importé (utilisé ligne 226)
- ⚠️ `AssetStatusHistory` non importé (utilisé ligne 255)
- ⚠️ `Asset` non importé mais utilisé partout
- ⚠️ `AssetPartsService` non importé (utilisé ligne 319)
- ⚠️ `STATUS_METADATA` non importé (utilisé ligne 705)

**Recommandations**:
1. Corriger code cassé lignes 106-138
2. Remplacer toutes les références `Asset` par `Asset`
3. Remplacer `type` par `subCategory` dans les schémas et populate
4. Importer les dépendances manquantes
5. Adapter les messages d'erreur
6. Vérifier existence de `AssetTimelineService`

---

#### ⚠️ subCategoryRoutes.js - **INCOMPLET**

**Fichier**: `server/routes/subCategoryRoutes.js`

**Problèmes identifiés**:

1. **Lignes 3-4**: Imports incorrects
   ```javascript
   const { SubCategory } = require('../models/SubCategory'); // ⚠️ N'existe plus
   const { Asset, EQUIPMENT_STATUSES } = require('../models/Asset'); // ⚠️ Devrait être Asset
   ```

2. **Lignes 9-146**: Route `/statistics`
   - ⚠️ Utilise `SubCategory.find()` (ligne 16)
   - ⚠️ Utilise `Asset.aggregate()` (ligne 19)
   - ⚠️ Utilise `EQUIPMENT_STATUSES` (lignes 41-93)
   - ⚠️ Code cassé ligne 94 (syntaxe incorrecte dans aggregation)
   - ⚠️ Variable `subCategories` non définie (ligne 107)

**Recommandations**:
1. Supprimer imports `SubCategory` et `Asset`
2. Importer `SubCategory` et `Asset`
3. Corriger route `/statistics` pour utiliser `Asset` et `SubCategory`
4. Corriger syntaxe aggregation ligne 94

---

#### ✅ categoryRoutes.js - **MIGRÉ**

**Fichier**: `server/routes/categoryRoutes.js`

**Statut**: ✅ **Complètement migré**
- Utilise `Category` correctement
- Utilise `Asset` pour statistiques
- Pas de références à `Asset` ou `Category`

---

### 1.3 Services Backend

#### ⚠️ assetStatusService.js - **À ADAPTER**

**Fichier**: `server/services/assetStatusService.js`

**Problèmes identifiés**:
- ⚠️ Import `Asset` depuis `../models/Asset` (ligne 2)
- ⚠️ Utilise `Asset.findById()` (ligne 26)
- ⚠️ Nom de classe `AssetStatusService` (devrait être `AssetStatusService`)
- ⚠️ Messages d'erreur mentionnent "Asset" (ligne 28)

**Recommandations**:
1. Changer import pour utiliser `Asset`
2. Renommer classe en `AssetStatusService`
3. Adapter toutes les méthodes pour utiliser `Asset`
4. Adapter messages d'erreur

---

### 1.4 Enregistrement des Routes

**Fichier**: `server/server.js`

**Routes enregistrées**:
```javascript
app.use('/api/assets', assetRoutes); // ✅ Nouveau
app.use('/api/asset', assetRoutes); // ⚠️ Alias (à supprimer après migration)
app.use('/api/categories', categoryRoutes); // ✅ Nouveau
app.use('/api/asset-categories', categoryRoutes); // ⚠️ Alias
app.use('/api/sub-categories', subCategoryRoutes); // ✅ Nouveau
app.use('/api/asset-types', subCategoryRoutes); // ⚠️ Alias
```

**Statut**: ✅ Routes principales enregistrées avec alias pour compatibilité

---

## 📁 PARTIE 2 : ANALYSE FRONTEND

### 2.1 API Clients

#### ⚠️ assets.ts - **PARTIELLEMENT MIGRÉ (70%)**

**Fichier**: `client/src/api/assets.ts`

**Fonctions migrées**:
- ✅ `getAssets()` - Utilise `/api/assets`
- ✅ `getAsset()` - Utilise `/api/assets/:id`
- ✅ `createAsset()` - Utilise `/api/assets`
- ✅ `updateAsset()` - Utilise `/api/assets/:id`
- ✅ `deleteAsset()` - Utilise `/api/assets/:id`
- ✅ `changeAssetStatus()` - Utilise `/api/assets/:id/change-status`

**Fonctions avec problèmes**:

1. **Lignes 145-150**: `getAssetInterventions()`
   - ⚠️ Utilise `/api/asset/:id/interventions` au lieu de `/api/assets/:id/interventions`
   - ⚠️ Nom de fonction contient "Asset"

2. **Lignes 152-157**: `getAssetParts()`
   - ⚠️ Utilise `/api/asset/:id/parts` au lieu de `/api/assets/:id/parts`
   - ⚠️ Nom de fonction contient "Asset"

3. **Lignes 159-227**: Fonctions status management
   - ⚠️ Toutes utilisent `/api/asset/` au lieu de `/api/assets/`
   - ⚠️ Noms de fonctions contiennent "Asset"
   - ⚠️ Types utilisent `AssetStatus` au lieu de `AssetStatus`

**Recommandations**:
1. Renommer fonctions pour utiliser "Asset" au lieu de "Asset"
2. Changer endpoints pour utiliser `/api/assets/`
3. Adapter types pour utiliser `AssetStatus`

---

#### ⚠️ assetParts.ts - **PARTIELLEMENT MIGRÉ**

**Fichier**: `client/src/api/assetParts.ts`

**Problèmes identifiés**:
- ⚠️ Nom du fichier contient "asset" (devrait être `assetParts.ts`)
- ⚠️ Toutes les fonctions utilisent `/api/asset-parts` (devrait être `/api/asset-parts`)
- ✅ Interface `AssetPart` utilise `asset` qui référence `Asset` (ligne 9)
- ⚠️ Commentaires mentionnent "équipement" au lieu de "asset"

**Recommandations**:
1. Renommer fichier en `assetParts.ts`
2. Changer endpoints pour `/api/asset-parts`
3. Adapter commentaires

---

#### ⚠️ interventions.ts - **PARTIELLEMENT MIGRÉ**

**Fichier**: `client/src/api/interventions.ts`

**Problèmes identifiés**:
- ⚠️ Interface utilise `assetId` (ligne 29) - Devrait être `assetId`
- ⚠️ Commentaires mentionnent "asset" (lignes 22, 29)

**Recommandations**:
1. Renommer `assetId` en `assetId`
2. Adapter commentaires

---

### 2.2 Pages Frontend

#### ⚠️ Assets.tsx - **PARTIELLEMENT MIGRÉ (60%)**

**Fichier**: `client/src/pages/Assets.tsx`

**Éléments migrés**:
- ✅ Import `getAssets`, `createAsset`, `updateAsset`, `deleteAsset` depuis `@/api/assets`
- ✅ Import `getCategories`, `getSubCategories`, `getAssetClasses`
- ✅ Utilise `Asset[]` comme type
- ✅ Utilise `subCategory` au lieu de `type`

**Problèmes identifiés**:

1. **Ligne 31**: Import `AssetStatusDialog` (devrait être `AssetStatusDialog`)
2. **Ligne 54**: Import types depuis `@/types/asset` (devrait être `@/types/asset`)
3. **Ligne 68**: Interface `Asset extends Asset` (shim temporaire)
4. **Lignes 339, 429, 818, etc.**: Utilise `EQUIPMENT_STATUSES` (devrait être `ASSET_STATUSES`)
5. **Lignes 984-989**: Utilise `AssetStatusDialog` avec props `assetId`, `assetName`
6. **Lignes 1042, 1073-1125**: Utilise `EQUIPMENT_STATUSES` partout
7. **Ligne 1421**: Commentaire mentionne "Asset QR Code"

**Recommandations**:
1. Renommer composant `AssetStatusDialog` en `AssetStatusDialog`
2. Créer types dans `@/types/asset.ts`
3. Remplacer toutes les références `EQUIPMENT_STATUSES` par `ASSET_STATUSES`
4. Adapter props pour utiliser `assetId`, `assetName`
5. Supprimer interface `Asset` shim

---

#### ⚠️ AssetDetail.tsx - **À MIGRER**

**Fichier**: `client/src/pages/AssetDetail.tsx`

**Problèmes identifiés**:
- ⚠️ Nom du fichier contient "Asset" (devrait être `AssetDetail.tsx`)
- ⚠️ Import `getAssetById` depuis `@/api/asset` (ligne 7) - API n'existe plus
- ⚠️ Interface `AssetDetailData` utilise `type` au lieu de `subCategory` (ligne 22)
- ⚠️ Fonction `getAssetById` appelée (ligne 64) - Devrait être `getAsset`

**Recommandations**:
1. Renommer fichier en `AssetDetail.tsx`
2. Créer fonction `getAsset` dans `assets.ts` si manquante
3. Adapter interface pour utiliser `subCategory`
4. Adapter tous les appels API

---

#### ⚠️ AssetParts.tsx - **À MIGRER**

**Fichier**: `client/src/pages/AssetParts.tsx`

**Recommandations**:
1. Renommer en `AssetParts.tsx`
2. Adapter appels API pour utiliser `/api/assets/:id/parts`
3. Adapter types et interfaces

---

#### ⚠️ AssetInterventions.tsx - **À MIGRER**

**Fichier**: `client/src/pages/AssetInterventions.tsx`

**Recommandations**:
1. Renommer en `AssetInterventions.tsx`
2. Adapter appels API pour utiliser `/api/assets/:id/interventions`
3. Adapter types et interfaces

---

#### ⚠️ AssetConsumables.tsx - **À MIGRER**

**Fichier**: `client/src/pages/AssetConsumables.tsx`

**Recommandations**:
1. Renommer en `AssetConsumables.tsx`
2. Adapter appels API pour utiliser `/api/assets/:id/consumable`
3. Adapter types et interfaces

---

#### ✅ Categories.tsx - **MIGRÉ**

**Fichier**: `client/src/pages/Categories.tsx`

**Statut**: ✅ **Complètement migré**
- Utilise `Category`, `getCategories`, `createCategory`, etc.
- Pas de références à `Category`

---

#### ✅ SubCategories.tsx - **MIGRÉ**

**Fichier**: `client/src/pages/SubCategories.tsx`

**Statut**: ✅ **Complètement migré**
- Utilise `SubCategory`, `getSubCategories`, etc.
- Pas de références à `SubCategory`

---

### 2.3 Composants Frontend

#### ⚠️ AssetStatusDialog.tsx - **À MIGRER**

**Fichier**: `client/src/components/AssetStatusDialog.tsx`

**Problèmes identifiés**:
- ⚠️ Nom du composant contient "Asset"
- ⚠️ Props `assetId`, `assetName` (devraient être `assetId`, `assetName`)
- ⚠️ Import `changeAssetStatus as changeAssetStatus` (ligne 26)
- ⚠️ Import types depuis `@/types/asset` (ligne 33-34)
- ⚠️ Interface `AssetStatusDialogProps` (ligne 36)

**Recommandations**:
1. Renommer composant en `AssetStatusDialog.tsx`
2. Renommer props en `assetId`, `assetName`
3. Adapter types pour utiliser `AssetStatus`
4. Adapter imports

---

#### Autres Composants à Migrer

D'après grep, les composants suivants contiennent "asset":
- `AssetTimeline.tsx`
- `AssetStatusHistory.tsx`
- `AssetPartFormDialog.tsx`
- `AssetPartsList.tsx`
- `PartAssetsList.tsx` (devrait être `PartAssetsList.tsx`)
- `RecordReplacementDialog.tsx` (peut contenir références)
- `RecordUsageDialog.tsx` (peut contenir références)
- `GlobalStockCard.tsx` (peut contenir références)
- `ReorderAlertsWidget.tsx` (peut contenir références)
- `StockStatusCard.tsx` (peut contenir références)

**Recommandations**:
1. Analyser chaque composant individuellement
2. Renommer fichiers et composants
3. Adapter props, types, et appels API

---

### 2.4 Types TypeScript

#### ⚠️ asset.ts - **À MIGRER**

**Fichier**: `client/src/types/asset.ts`

**Problèmes identifiés**:
- ⚠️ Nom du fichier contient "asset" (devrait être `asset.ts`)
- ⚠️ Constantes `EQUIPMENT_STATUSES` (devrait être `ASSET_STATUSES`)
- ⚠️ Type `AssetStatus` (devrait être `AssetStatus`)
- ⚠️ Interface `AssetStatusHistory` (devrait être `AssetStatusHistory`)
- ⚠️ Tous les types et interfaces contiennent "Asset"

**Recommandations**:
1. Créer nouveau fichier `asset.ts`
2. Renommer toutes les constantes, types, interfaces
3. Adapter toutes les références dans le code
4. Supprimer `asset.ts` après migration

---

### 2.5 Routes Frontend

**Fichier**: `client/src/App.tsx`

**Routes configurées**:
```typescript
<Route path="assets" element={<Assets />} /> // ✅
<Route path="assets/:id" element={<AssetDetailWrapper />} /> // ⚠️ Composant à renommer
<Route path="assets/:id/interventions" element={<AssetInterventions />} /> // ⚠️ Composant à renommer
<Route path="assets/:id/parts" element={<AssetParts />} /> // ⚠️ Composant à renommer
<Route path="assets/:id/consumable" element={<AssetConsumables />} /> // ⚠️ Composant à renommer
```

**Statut**: ✅ Routes utilisent `/assets` mais composants à renommer

---

## 📊 PARTIE 3 : SCHÉMAS DE DONNÉES COMPLETS

### 3.1 Hiérarchie AssetClass → Category → SubCategory → Asset

```
AssetClass (Classe d'actif)
  ├─ Category (Catégorie)
  │   ├─ SubCategory (Sous-catégorie)
  │   │   ├─ Asset (Actif)
  │   │   │   ├─ AssetPart (Association pièce)
  │   │   │   ├─ AssetStatusHistory (Historique statut)
  │   │   │   ├─ Intervention (Intervention)
  │   │   │   └─ BreakdownMedia (Médias de panne)
```

### 3.2 Relations Détaillées

#### Asset → Category
- **Type**: Many-to-One
- **Champ**: `asset.category`
- **Référence**: `Category._id`
- **Required**: ✅ Oui

#### Asset → SubCategory
- **Type**: Many-to-One
- **Champ**: `asset.subCategory`
- **Référence**: `SubCategory._id`
- **Required**: ✅ Oui

#### Asset → AssetClass
- **Type**: Many-to-One
- **Champ**: `asset.assetClass`
- **Référence**: `AssetClass._id`
- **Required**: ⚠️ Non (sera required après migration)

#### Category → AssetClass
- **Type**: Many-to-One
- **Champ**: `category.assetClass`
- **Référence**: `AssetClass._id`
- **Required**: ✅ Oui

#### SubCategory → Category
- **Type**: Many-to-One
- **Champ**: `subCategory.category`
- **Référence**: `Category._id`
- **Required**: ✅ Oui

#### AssetPart → Asset
- **Type**: Many-to-One
- **Champ**: `assetPart.asset`
- **Référence**: `Asset._id`
- **Required**: ✅ Oui

#### AssetStatusHistory → Asset
- **Type**: Many-to-One
- **Champ**: `statusHistory.asset`
- **Référence**: ⚠️ `Asset._id` (devrait être `Asset._id`)

#### Intervention → Asset
- **Type**: Many-to-One
- **Champ**: `intervention.assetId`
- **Référence**: ⚠️ `Asset._id` (devrait être `Asset._id`)

#### BreakdownMedia → Asset
- **Type**: Many-to-One
- **Champ**: `breakdownMedia.asset`
- **Référence**: ⚠️ `Asset._id` (devrait être `Asset._id`)

---

## 📋 PARTIE 4 : CHECKLIST DE MIGRATION

### Backend - Priorité Haute

#### Modèles
- [ ] Renommer `AssetStatusHistory` → `AssetStatusHistory`
- [ ] Changer référence `asset` → `asset` dans `AssetStatusHistory`
- [ ] Changer référence `assetId` → `assetId` dans `Intervention`
- [ ] Changer référence `asset` → `asset` dans `BreakdownMedia`
- [ ] Renommer constantes `EQUIPMENT_STATUSES` → `ASSET_STATUSES`

#### Routes
- [ ] Corriger code cassé dans `assetRoutes.js` (lignes 106-138)
- [ ] Remplacer toutes les références `Asset` par `Asset` dans `assetRoutes.js`
- [ ] Remplacer `type` par `subCategory` dans schémas Zod et populate
- [ ] Importer dépendances manquantes (`z`, `EQUIPMENT_STATUSES`, etc.)
- [ ] Corriger route `/statistics` dans `subCategoryRoutes.js`
- [ ] Supprimer imports incorrects dans `subCategoryRoutes.js`

#### Services
- [ ] Renommer `AssetStatusService` → `AssetStatusService`
- [ ] Changer import `Asset` → `Asset` dans `assetStatusService.js`
- [ ] Adapter toutes les méthodes pour utiliser `Asset`
- [ ] Vérifier existence de `AssetTimelineService` ou créer

### Backend - Priorité Moyenne

- [ ] Renommer `AssetPart` → `AssetPart` (après migration complète)
- [ ] Supprimer alias `Asset: Asset` dans `Asset.js`
- [ ] Supprimer routes alias `/api/asset`, `/api/asset-categories`, `/api/asset-types`
- [ ] Migrer données existantes (script de migration)

### Frontend - Priorité Haute

#### API Clients
- [ ] Créer fonction `getAsset` dans `assets.ts` si manquante
- [ ] Renommer fonctions dans `assets.ts` (Asset → Asset)
- [ ] Changer endpoints `/api/asset/` → `/api/assets/` dans `assets.ts`
- [ ] Renommer `assetParts.ts` → `assetParts.ts`
- [ ] Changer endpoints `/api/asset-parts` → `/api/asset-parts`
- [ ] Adapter `interventions.ts` pour utiliser `assetId`

#### Pages
- [ ] Renommer `AssetDetail.tsx` → `AssetDetail.tsx`
- [ ] Renommer `AssetParts.tsx` → `AssetParts.tsx`
- [ ] Renommer `AssetInterventions.tsx` → `AssetInterventions.tsx`
- [ ] Renommer `AssetConsumables.tsx` → `AssetConsumables.tsx`
- [ ] Adapter `Assets.tsx` pour utiliser `ASSET_STATUSES`
- [ ] Adapter toutes les pages pour utiliser nouveaux noms

#### Composants
- [ ] Renommer `AssetStatusDialog.tsx` → `AssetStatusDialog.tsx`
- [ ] Renommer `AssetTimeline.tsx` → `AssetTimeline.tsx`
- [ ] Renommer `AssetStatusHistory.tsx` → `AssetStatusHistory.tsx`
- [ ] Renommer `AssetPartFormDialog.tsx` → `AssetPartFormDialog.tsx`
- [ ] Renommer `AssetPartsList.tsx` → `AssetPartsList.tsx`
- [ ] Renommer `PartAssetsList.tsx` → `PartAssetsList.tsx`
- [ ] Analyser et adapter autres composants

#### Types
- [ ] Créer `asset.ts` avec tous les types
- [ ] Renommer `EQUIPMENT_STATUSES` → `ASSET_STATUSES`
- [ ] Renommer `AssetStatus` → `AssetStatus`
- [ ] Adapter toutes les références dans le code
- [ ] Supprimer `asset.ts`

### Frontend - Priorité Moyenne

- [ ] Adapter navigation (Sidebar, TopNavigation) si nécessaire
- [ ] Adapter Dashboard pour utiliser Asset
- [ ] Adapter Reports pour utiliser Asset
- [ ] Vérifier tous les imports et références

---

## 🎯 RECOMMANDATIONS GÉNÉRALES

### Ordre de Migration Recommandé

1. **Phase 1 - Backend Modèles** (1-2 jours)
   - Migrer `AssetStatusHistory` → `AssetStatusHistory`
   - Migrer références dans `Intervention` et `BreakdownMedia`
   - Renommer constantes

2. **Phase 2 - Backend Routes** (2-3 jours)
   - Corriger `assetRoutes.js`
   - Corriger `subCategoryRoutes.js`
   - Tester tous les endpoints

3. **Phase 3 - Backend Services** (1 jour)
   - Migrer `AssetStatusService` → `AssetStatusService`
   - Adapter toutes les méthodes

4. **Phase 4 - Frontend Types** (1 jour)
   - Créer `asset.ts`
   - Migrer toutes les références

5. **Phase 5 - Frontend API** (1-2 jours)
   - Migrer tous les clients API
   - Tester tous les appels

6. **Phase 6 - Frontend Pages** (2-3 jours)
   - Renommer et adapter toutes les pages
   - Tester fonctionnalités

7. **Phase 7 - Frontend Composants** (2-3 jours)
   - Renommer et adapter tous les composants
   - Tester UI

8. **Phase 8 - Nettoyage** (1 jour)
   - Supprimer alias et code legacy
   - Supprimer fichiers obsolètes
   - Documentation finale

**Total estimé**: 11-16 jours de développement

### Tests Recommandés

1. **Tests Backend**
   - Tests unitaires pour chaque route
   - Tests d'intégration pour flux complets
   - Tests de migration de données

2. **Tests Frontend**
   - Tests de composants (React Testing Library)
   - Tests E2E (Playwright/Cypress)
   - Tests de régression

3. **Tests de Migration**
   - Script de migration de données
   - Vérification intégrité données
   - Rollback si nécessaire

---

## 📝 NOTES IMPORTANTES

1. **Compatibilité**: Les alias (`/api/asset`, `Asset: Asset`) permettent une migration progressive sans casser le code existant.

2. **Données Existantes**: Un script de migration sera nécessaire pour mettre à jour les références dans la base de données.

3. **Tests**: Tester chaque étape avant de passer à la suivante pour éviter les régressions.

4. **Documentation**: Mettre à jour la documentation API et utilisateur après migration complète.

5. **Communication**: Informer l'équipe des changements de nommage pour éviter confusion.

---

**Fin de l'analyse**  
*Document créé le Décembre 2025*  
*Prochaine étape: Validation du plan avec l'équipe*
