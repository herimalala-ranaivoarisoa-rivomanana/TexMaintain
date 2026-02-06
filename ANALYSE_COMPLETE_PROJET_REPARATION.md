# Analyse Complète du Projet TexMaintain

## 📋 Vue d'Ensemble

**TexMaintain** est un système de gestion de maintenance informatisé (CMMS - Computerized Maintenance Management System) développé pour AQUARELLE ANTSIRABE-1.

### Stack Technologique

**Frontend:**
- React 18.3.1 avec TypeScript
- Vite 5.4.8 (build tool)
- React Router DOM 7.0.1
- Tailwind CSS + Radix UI (composants)
- Axios pour les appels API
- Capacitor pour le support mobile (Android)

**Backend:**
- Node.js avec Express 4.18.2
- MongoDB avec Mongoose 8.1.1
- JWT pour l'authentification
- Multer pour l'upload de fichiers
- Zod pour la validation
- Helmet + Rate Limiting pour la sécurité

**Infrastructure:**
- Docker Compose pour MongoDB
- Nodemon pour le développement

---

## 🏗️ Architecture du Projet

### Structure des Dossiers

```
TexMaintain/
├── client/                 # Application React/TypeScript
│   ├── src/
│   │   ├── api/           # Clients API (appels backend)
│   │   ├── components/    # Composants réutilisables
│   │   ├── contexts/       # Contextes React (Auth, Factory)
│   │   ├── hooks/         # Hooks personnalisés
│   │   ├── pages/         # Pages/écrans de l'application
│   │   ├── types/         # Types TypeScript
│   │   └── lib/           # Utilitaires
│   └── dist/              # Build de production
│
├── server/                 # API Express/Node.js
│   ├── config/            # Configuration (DB, validation)
│   ├── models/            # Modèles Mongoose
│   ├── routes/            # Routes API
│   ├── services/          # Logique métier
│   ├── utils/             # Utilitaires
│   ├── uploads/           # Fichiers uploadés
│   └── server.js          # Point d'entrée
│
└── docker-compose.yml     # Configuration MongoDB
```

---

## 🎨 Architecture Frontend

### Pages Principales

#### 1. **Dashboard** (`/`)
- Vue d'ensemble avec KPIs (MTBF, MTTR, Disponibilité, OEE)
- Statistiques par zone de processus
- Graphiques de performance
- Alertes de réapprovisionnement

#### 2. **Assets (Équipements)** (`/assets`)
- Liste des équipements avec filtres (catégorie, type, statut)
- Détails d'un équipement (`/assets/:id`)
- Interventions associées (`/assets/:id/interventions`)
- Pièces associées (`/assets/:id/parts`)
- Consommables (`/assets/:id/consumable`)

#### 3. **Interventions** (`/interventions`)
- Liste des interventions (Corrective, Préventive, Urgente)
- Filtres par statut, type, priorité
- Détails d'une intervention (`/interventions/:id`)
- Gestion des statuts (Pending, In Progress, Completed, Cancelled)

#### 4. **Inventory (Inventaire)** (`/inventory`)
- Liste des pièces et consommables
- Gestion du stock (min, max, actuel)
- Statuts de stock (Critical, Low, Normal, High)
- Détails d'une pièce (`/inventory/:id`)

#### 5. **Procurement (Achats)** (`/procurement`)
- Gestion des commandes
- Suivi des commandes en attente
- Intégration avec l'inventaire

#### 6. **Projects (Projets)** (`/projects`)
- Gestion de projets de maintenance
- Détails d'un projet (`/projects/:id`)
- Suivi des dépenses

#### 7. **Reports (Rapports)** (`/reports`)
- Génération de rapports
- Export de données

#### 8. **Process Areas (Zones de Processus)** (`/process-areas`)
- Gestion des zones de production
- Statistiques par zone
- Détails d'une zone (`/process-areas/:id`)

#### 9. **Personnel**
- Machinists (`/machinists`)
- Mechanics (`/mechanics`)
- Electricians (`/electricians`)
- Maintenance Workers (`/maintenance-workers`)

#### 10. **Configuration**
- Categories (`/categories`)
- Sub-Categories (`/sub-categories`)
- Brands (`/brands`)
- Settings (`/settings`)

### Composants Principaux

#### Layout & Navigation
- `MainLayout.tsx` - Layout principal avec sidebar et top navigation
- `Sidebar.tsx` - Menu de navigation latéral
- `TopNavigation.tsx` - Barre de navigation supérieure
- `Header.tsx` - En-tête avec sélecteur d'usine
- `Footer.tsx` - Pied de page

#### Composants Métier
- `AssetStatusDialog.tsx` - Dialogue de changement de statut
- `AssetStatusHistory.tsx` - Historique des statuts
- `AssetTimeline.tsx` - Timeline d'un équipement
- `AssetPartsList.tsx` - Liste des pièces d'un équipement
- `RecordReplacementDialog.tsx` - Enregistrement de remplacement
- `RecordUsageDialog.tsx` - Enregistrement d'utilisation
- `CreateOrderDialog.tsx` - Création de commande
- `ReorderAlertsWidget.tsx` - Widget d'alertes de réapprovisionnement
- `StockStatusCard.tsx` - Carte de statut de stock
- `GlobalStockCard.tsx` - Carte globale de stock

#### Composants Dashboard
- `GeneralDashboard.tsx` - Dashboard général
- `ProcessAreasDashboard.tsx` - Dashboard par zones
- `ProjectsDashboard.tsx` - Dashboard projets

### Contextes React

#### `AuthContext.tsx`
- Gestion de l'authentification
- Stockage des tokens (accessToken, refreshToken)
- Refresh automatique des tokens
- Redirection vers login si non authentifié

#### `FactoryContext.tsx`
- Gestion du contexte d'usine active
- Filtrage des données par usine
- Persistance dans localStorage

### API Client (`src/api/`)

Structure modulaire par domaine:
- `api.ts` - Configuration Axios avec interceptors
- `assets.ts` - API des équipements
- `interventions.ts` - API des interventions
- `inventory.ts` - API de l'inventaire
- `dashboard.ts` - API du dashboard
- `auth.ts` - API d'authentification
- Etc.

---

## 🔧 Architecture Backend

### Routes API (`/api`)

#### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/refresh` - Rafraîchir le token
- `GET /api/auth/me` - Informations utilisateur

#### Assets (Équipements)
- `GET /api/assets` - Liste des équipements (pagination, filtres)
- `GET /api/assets/:id` - Détails d'un équipement
- `POST /api/assets` - Créer un équipement
- `PUT /api/assets/:id` - Modifier un équipement
- `DELETE /api/assets/:id` - Supprimer un équipement
- `GET /api/assets/:id/interventions` - Interventions d'un équipement
- `GET /api/assets/:id/parts` - Pièces d'un équipement
- `PUT /api/assets/:id/status` - Changer le statut
- `GET /api/assets/:id/history` - Historique des statuts
- `GET /api/assets/:id/timeline` - Timeline d'un équipement

#### Interventions
- `GET /api/interventions` - Liste des interventions
- `GET /api/interventions/:id` - Détails d'une intervention
- `POST /api/interventions` - Créer une intervention
- `PUT /api/interventions/:id` - Modifier une intervention
- `DELETE /api/interventions/:id` - Supprimer une intervention

#### Inventory (Inventaire)
- `GET /api/inventory` - Liste des pièces/consommables
- `GET /api/inventory/:id` - Détails d'une pièce
- `POST /api/inventory` - Créer une pièce
- `PUT /api/inventory/:id` - Modifier une pièce
- `DELETE /api/inventory/:id` - Supprimer une pièce
- `POST /api/inventory/:id/usage` - Enregistrer une utilisation
- `POST /api/inventory/:id/replacement` - Enregistrer un remplacement

#### Dashboard
- `GET /api/dashboard` - KPIs globaux
- `GET /api/dashboard/process-areas` - Statistiques par zone
- `GET /api/dashboard/projects` - Statistiques projets

#### Autres Routes
- `/api/categories` - Catégories d'équipements
- `/api/sub-categories` - Sous-catégories
- `/api/brands` - Marques
- `/api/process-areas` - Zones de processus
- `/api/procurement` - Achats
- `/api/projects` - Projets
- `/api/reports` - Rapports
- `/api/personnel` - Personnel
- `/api/factories` - Usines

### Modèles de Données

#### Asset (Équipement)
```javascript
{
  name: String,
  code: String (unique),
  factory: ObjectId (ref: Factory),
  assetClass: ObjectId (ref: AssetClass),
  category: ObjectId (ref: Category),
  subCategory: ObjectId (ref: SubCategory),
  status: String (enum: ASSET_STATUSES),
  statusCategory: String (production/maintenance/out_of_service),
  location: String,
  brand: ObjectId (ref: Brand),
  manufacturer: String,
  model: String,
  serialNumber: String,
  productionLine: ObjectId (ref: ProductionLine),
  processArea: ObjectId (ref: ProcessArea),
  // ... autres champs
}
```

**Statuts possibles:**
- `in_production` - En production
- `scheduled_maintenance` - Maintenance programmée
- `breakdown` - Panne
- `offline` - Hors ligne
- `stored` - Stocké
- `scrapped` - Mis au rebut

#### Intervention
```javascript
{
  title: String,
  type: String (Corrective/Preventive/Emergency),
  priority: String (Low/Medium/High/Critical),
  status: String (Pending/In Progress/Completed/Cancelled),
  asset: String (legacy),
  assetId: ObjectId (ref: Asset),
  factory: ObjectId (ref: Factory),
  assignedTo: String,
  description: String,
  createdDate: Date,
  dueDate: Date,
  completedDate: Date,
  estimatedDuration: Number,
  actualDuration: Number,
  cost: Number
}
```

#### Part (Pièce/Consommable)
```javascript
{
  name: String,
  partNumber: String (unique),
  category: String,
  type: String (part/consumable),
  currentStock: Number,
  minStock: Number,
  maxStock: Number,
  unitPrice: Number,
  supplier: String,
  location: String,
  factory: ObjectId (ref: Factory),
  pendingOrders: [{
    quantity: Number,
    status: String,
    orderDate: Date,
    expectedDate: Date,
    supplier: String,
    orderNumber: String
  }],
  autoCalculateMinMax: Boolean
}
```

**Méthodes:**
- `getStockStatus()` - Retourne le statut du stock (critical/low/normal/high)

#### AssetPart (Association Équipement-Pièce)
```javascript
{
  asset: ObjectId (ref: Asset),
  part: ObjectId (ref: Part),
  quantity: Number,
  usageType: String (usage/replacement),
  annualConsumption: Number,
  nextReplacementDate: Date,
  lastReplacementDate: Date,
  lastUsageDate: Date
}
```

### Services Métier

#### `assetStatusService.js`
- Gestion des changements de statut
- Historique des statuts
- Calcul de la durée dans un statut

#### `assetMetricsService.js`
- Calcul des KPIs (MTBF, MTTR, Disponibilité, OEE)
- Métriques par équipement

#### `assetPartsService.js`
- Gestion des associations équipement-pièce
- Calcul automatique min/max
- Calcul de la consommation annuelle
- Calcul de la prochaine date de remplacement

#### `interventionService.js`
- Logique métier des interventions
- Calcul des durées réelles
- Mise à jour des métriques

---

## 🔐 Sécurité

### Authentification
- JWT avec access token et refresh token
- Tokens stockés dans localStorage (frontend)
- Refresh automatique des tokens expirés
- Middleware `requireUser` pour protéger les routes
- Middleware `requireRole` pour les rôles spécifiques

### Sécurité Backend
- Helmet pour les en-têtes HTTP sécurisés
- Rate limiting (1000 requêtes / 15 minutes)
- CORS configuré avec origines autorisées
- Sanitization MongoDB (prévention NoSQL injection)
- Validation avec Zod
- Compression des réponses

---

## 📊 Logique Métier par Module

### 1. Gestion des Équipements (Assets)

**Statuts:**
- Transition automatique entre statuts
- Historique complet des changements
- Calcul de la durée dans chaque statut
- Métadonnées de statut (catégorie: production/maintenance/out_of_service)

**KPIs:**
- **MTBF** (Mean Time Between Failures): Temps moyen entre pannes
- **MTTR** (Mean Time To Repair): Temps moyen de réparation
- **Disponibilité**: Basée sur le statut "in_production"
- **OEE** (Overall Equipment Effectiveness): Estimation basée sur la disponibilité

### 2. Gestion des Interventions

**Types:**
- **Corrective**: Réparation après panne
- **Preventive**: Maintenance préventive
- **Emergency**: Intervention urgente

**Statuts:**
- Pending → In Progress → Completed
- Possibilité d'annulation (Cancelled)

**Calcul MTTR:**
- Basé sur les interventions complétées (Corrective/Emergency)
- Différence entre `createdDate` et `completedDate`

### 3. Gestion du Stock (Inventory)

**Statuts de Stock:**
- **Critical**: Stock ≤ 50% du minimum
- **Low**: Stock ≤ minimum
- **Normal**: Stock entre min et 90% du max
- **High**: Stock ≥ 90% du maximum

**Calcul Min/Max:**
- Auto-calcul basé sur la consommation annuelle
- Formule: `min = consommation_annuelle / 12`, `max = min * 3`
- Peut être désactivé (`autoCalculateMinMax: false`)

**Gestion des Commandes:**
- Suivi des commandes en attente
- Statuts: pending, ordered, in_transit, received, cancelled
- Calcul automatique de `pendingQuantity`

### 4. Associations Équipement-Pièce (AssetParts)

**Types d'utilisation:**
- **Usage**: Consommation normale
- **Replacement**: Remplacement de pièce

**Calculs automatiques:**
- Consommation annuelle basée sur l'historique
- Date de prochaine remplacement basée sur la consommation
- Recalcul automatique après chaque utilisation/remplacement

### 5. Zones de Processus (Process Areas)

- Organisation hiérarchique: Factory → Process Area → Process Department → Production Section → Production Line
- Statistiques agrégées par zone
- Dashboard dédié par zone

---

## 🔄 Flux de Données

### Frontend → Backend
1. Requête HTTP via Axios
2. Interceptor ajoute le token JWT dans les headers
3. Interceptor ajoute `x-factory-id` pour le filtrage
4. Backend valide le token et filtre par factory
5. Réponse JSON retournée

### Backend → Frontend
1. Données MongoDB via Mongoose
2. Population des références (populate)
3. Transformation des données si nécessaire
4. Réponse JSON avec pagination si applicable

---

## 🐛 Problèmes Identifiés et Corrections

### À Vérifier

1. **Cohérence des Types TypeScript**
   - Vérifier que les types frontend correspondent aux modèles backend
   - Vérifier les interfaces API

2. **Gestion des Erreurs**
   - Vérifier la gestion d'erreurs côté frontend
   - Vérifier les messages d'erreur backend

3. **Validation des Données**
   - Vérifier la validation Zod côté backend
   - Vérifier la validation côté frontend (react-hook-form + zod)

4. **Performance**
   - Vérifier les requêtes N+1
   - Vérifier l'indexation MongoDB
   - Vérifier la pagination

5. **Sécurité**
   - Vérifier la validation des entrées
   - Vérifier les permissions (requireRole)
   - Vérifier la sanitization

---

## 📝 Notes d'Implémentation

### Multi-Factory
- Le système supporte plusieurs usines (factories)
- Filtrage automatique par `x-factory-id` header
- Contexte Factory dans le frontend

### Historique des Statuts
- Chaque changement de statut est enregistré dans `AssetStatusHistory`
- Timeline complète disponible pour chaque équipement

### Upload de Médias
- Support d'images et vidéos pour les pannes (breakdown media)
- Stockage dans `server/uploads/`
- Limite de 10MB par fichier

### Calculs Automatiques
- Min/Max stock basé sur la consommation
- Prochaine date de remplacement
- Consommation annuelle
- Métriques d'équipement (MTBF, MTTR, etc.)

---

## 🚀 Commandes de Démarrage

```bash
# Installer les dépendances
npm install

# Démarrer MongoDB (Docker)
npm run db:up

# Démarrer l'application complète
npm start

# Ou séparément:
npm run client  # Frontend (port 5173)
npm run server  # Backend (port 3000)

# Initialiser la base de données
npm run seed
```

---

## 📚 Documentation Additionnelle

Le projet contient de nombreux fichiers de documentation dans la racine:
- `ANALYSE_COMPLETE_SYSTEME_2025.md`
- `ANALYSE_DETAILLEE_PROJET_NOV_2025.md`
- `FONCTIONNALITES_IMPLEMENTATIONS.md`
- Etc.

---

## ✅ Prochaines Étapes

1. Vérifier et corriger les erreurs TypeScript
2. Vérifier la cohérence frontend/backend
3. Optimiser les performances
4. Améliorer la gestion d'erreurs
5. Ajouter des tests unitaires et d'intégration
