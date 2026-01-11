# ⚙️ FONCTIONNALITÉS ET IMPLÉMENTATIONS - TEXMAINTAIN

**Date**: 1er Novembre 2025

---

## 📋 TABLE DES MATIÈRES

1. [Gestion des Équipements](#1-gestion-des-équipements)
2. [Système de Statuts](#2-système-de-statuts)
3. [Gestion du Stock de Pièces](#3-gestion-du-stock-de-pièces)
4. [Gestion des Interventions](#4-gestion-des-interventions)
5. [Dashboard et KPI](#5-dashboard-et-kpi)
6. [Gestion du Personnel](#6-gestion-du-personnel)
7. [Authentification et Sécurité](#7-authentification-et-sécurité)
8. [Upload de Médias](#8-upload-de-médias)
9. [Configuration](#9-configuration)

---

## 1. Gestion des Équipements

### Fonctionnalités Implémentées

#### CRUD Complet
✅ **Créer un équipement**
- Formulaire avec validation
- Champs obligatoires: category, type, location
- Champs optionnels: brand, manufacturer, model, serialNumber, etc.
- Upload de spécifications techniques (JSON)

✅ **Lister les équipements**
- Pagination (10, 25, 50, 100 par page)
- Filtres multiples:
  - Par statut
  - Par catégorie
  - Par type
  - Par marque
  - Par section de production
- Recherche textuelle (location, model, serialNumber)
- Tri par colonne
- Export CSV

✅ **Voir les détails**
- Informations complètes
- Historique des statuts
- Interventions associées
- Pièces détachées liées
- Médias de panne
- KPI (MTBF, MTTR)

✅ **Modifier un équipement**
- Tous les champs modifiables
- Validation des données
- Historisation automatique

✅ **Supprimer un équipement**
- Confirmation obligatoire
- Suppression en cascade (historique, associations)

#### Changement de Statut Avancé

✅ **Dialog de changement de statut**
- Affichage du statut actuel avec badge coloré
- Liste des transitions autorisées uniquement
- Sélection du nouveau statut
- Raison du changement (obligatoire)
- Notes additionnelles (optionnel)
- Assignation de personnel selon le statut:
  - Machinist (pour production)
  - Mechanic (pour réparations mécaniques)
  - Electrician (pour problèmes électriques)
  - MaintenanceWorker (pour maintenance générale)
- Lien avec intervention (optionnel)
- Détails de panne si breakdown:
  - Type de panne (8 types)
  - Description détaillée

✅ **Validation des transitions**
- Vérification côté backend
- Impossible de passer à un statut non autorisé
- État terminal (scrapped) bloque toute transition

✅ **Historique complet**
- Tous les changements enregistrés
- Traçabilité: qui, quand, pourquoi
- Calcul automatique de la durée dans chaque statut
- Timeline visuelle

#### Statistiques et KPI

✅ **Vue d'ensemble**
- Nombre total d'équipements
- Répartition par statut (graphique)
- Répartition par catégorie
- Équipements en production vs maintenance

✅ **Indicateurs de performance**
- **MTBF** (Mean Time Between Failures)
  - Calculé à partir des pannes réelles
  - Temps moyen entre pannes en heures
- **MTTR** (Mean Time To Repair)
  - Calculé à partir des interventions correctives
  - Temps moyen de réparation en heures
- **Disponibilité**
  - % d'équipements en production
  - Formule: (Équip. en prod / Total) × 100
- **OEE estimé** (Overall Asset Effectiveness)
  - Basé sur disponibilité et performance

### Implémentation Technique

#### Backend
```javascript
// Routes: server/routes/assetRoutes.js (23KB)
GET    /api/asset                    // Liste paginée
POST   /api/asset                    // Créer
GET    /api/asset/:id                // Détails
PATCH  /api/asset/:id                // Modifier
DELETE /api/asset/:id                // Supprimer
PATCH  /api/asset/:id/status         // Changer statut
GET    /api/asset/:id/status-history // Historique
GET    /api/asset/:id/interventions  // Interventions
GET    /api/asset/:id/parts          // Pièces
GET    /api/asset/stats/overview     // Statistiques
GET    /api/asset/stats/by-status    // Par statut
GET    /api/asset/stats/by-category  // Par catégorie
GET    /api/asset/stats/kpi          // KPI
```

#### Frontend
```typescript
// Page: client/src/pages/Asset.tsx (61KB!)
// Composants:
- AssetList: Liste avec filtres
- AssetStatusDialog: Changement de statut (18KB)
- AssetDetail: Vue détaillée
- AssetPartsList: Pièces associées

// API Client: client/src/api/asset.ts
- getAssets(params)
- createAsset(data)
- getAssetById(id)
- updateAsset(id, data)
- deleteAsset(id)
- updateAssetStatus(id, statusData)
- getAssetStatusHistory(id)
```

---

## 2. Système de Statuts

### Concept Innovant

Le système de statuts est au cœur de TexMaintain. Il permet un suivi précis de l'état de chaque équipement avec:
- 14 statuts organisés en 3 catégories
- Transitions validées (machine à états)
- Historique complet
- Calcul automatique des durées
- Assignation de personnel contextuelle

### 14 Statuts Organisés

#### 🟢 Production (4 statuts)
```
in_production → Équipement en production active
  ↓ Peut aller vers: setup_adjustment, paused_by_operator, 
                     changeover, breakdown, scheduled_maintenance, 
                     offline, stored

setup_adjustment → Réglage/ajustement
  ↓ Peut aller vers: in_production, breakdown, 
                     scheduled_maintenance, offline, stored

paused_by_operator → Pause temporaire
  ↓ Peut aller vers: in_production, changeover, offline, stored

changeover → Changement de série
  ↓ Peut aller vers: setup_adjustment, in_production, breakdown, 
                     scheduled_maintenance, offline, stored
```

#### 🟠 Maintenance (7 statuts)
```
scheduled_maintenance → Maintenance préventive
  ↓ Peut aller vers: in_production, offline, stored

breakdown → Panne
  ↓ Peut aller vers: under_inspection, under_repair, in_workshop

under_repair → En réparation
  ↓ Peut aller vers: in_workshop, in_production, offline

in_workshop → À l'atelier
  ↓ Peut aller vers: waiting_spare_parts, testing_after_repair, 
                     in_production, stored, scrapped

waiting_spare_parts → Attente pièces
  ↓ Peut aller vers: under_repair, in_workshop

testing_after_repair → Test après réparation
  ↓ Peut aller vers: pending_validation, in_production, under_repair

under_inspection → Inspection/diagnostic
  ↓ Peut aller vers: under_repair, in_workshop, 
                     scheduled_maintenance, in_production

pending_validation → Validation en attente
  ↓ Peut aller vers: in_production, setup_adjustment, under_repair
```

#### ⚫ Hors Service (3 statuts)
```
stored → Stocké/réserve
  ↓ Peut aller vers: offline, setup_adjustment, 
                     under_inspection, scrapped

offline → Hors ligne temporaire
  ↓ Peut aller vers: in_production, stored, setup_adjustment, 
                     scheduled_maintenance, scrapped

scrapped → Mis au rebut (TERMINAL)
  ↓ Aucune transition possible
```

### Métadonnées des Statuts

Chaque statut possède:
- **Label**: Nom affiché
- **Category**: production | maintenance | out_of_service
- **Color**: Couleur pour l'UI (green, blue, yellow, orange, red, gray, black)
- **Icon**: Icône Lucide React
- **Description**: Explication
- **AllowedTransitions**: Liste des statuts accessibles

### Validation des Transitions

```javascript
// Exemple de validation
Asset.canTransitionTo('in_production')
// → true si transition autorisée
// → false sinon

// Obtenir les transitions possibles
Asset.getAllowedTransitions()
// → [{status: 'in_production', metadata: {...}}, ...]
```

### Historisation Automatique

À chaque changement de statut:
1. Création d'une entrée dans `AssetStatusHistory`
2. Enregistrement de:
   - Statut précédent
   - Nouveau statut
   - Utilisateur ayant fait le changement
   - Timestamp
   - Raison et notes
   - Personnel assigné
   - Intervention liée
3. Calcul de la durée dans le statut précédent
4. Mise à jour de `Asset.lastStatusChange`

### Implémentation

#### Backend
```javascript
// Modèle: server/models/AssetStatusHistory.js (7.8KB)
const STATUS_METADATA = {
  in_production: { label, category, color, icon, allowedTransitions },
  // ... 13 autres statuts
}

// Hook pre-save sur Asset
schema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.lastStatusChange = Date.now();
    const metadata = STATUS_METADATA[this.status];
    if (metadata) {
      this.statusCategory = metadata.category;
    }
  }
  next();
});
```

#### Frontend
```typescript
// Composant: client/src/components/AssetStatusDialog.tsx (18KB)
const AssetStatusDialog = ({ asset, onStatusChange }) => {
  // 1. Affiche statut actuel avec badge coloré
  // 2. Récupère transitions autorisées
  // 3. Affiche formulaire contextuel selon nouveau statut
  // 4. Valide et envoie au backend
  // 5. Rafraîchit les données
}
```

---

## 3. Gestion du Stock de Pièces

### Concept Révolutionnaire

TexMaintain implémente un système unique de **calcul automatique du stock optimal** basé sur:
- La consommation réelle par équipement
- La criticité pondérée
- Les délais d'approvisionnement
- Un coefficient de sécurité

### Fonctionnalités

#### Association Équipement-Pièce

✅ **Créer une association**
- Sélection de l'équipement
- Sélection de la pièce
- Paramètres de consommation:
  - Quantité par machine (ex: 2 courroies)
  - Fréquence de remplacement/an (ex: 4 = tous les 3 mois)
- Criticité pour cet équipement (low, medium, high, critical)
- Importance de la machine (1-100)
- Délai d'approvisionnement (jours)
- Coefficient de sécurité (1.0 à 3.0)
- **Calculs en temps réel** pendant la saisie
- Aperçu des résultats avant validation

✅ **Calculs automatiques**
- Consommation annuelle
- Consommation journalière
- Stock de sécurité
- Point de réapprovisionnement
- Date du prochain remplacement

✅ **Enregistrer un remplacement**
- Quantité utilisée
- Date du remplacement
- Personne ayant effectué
- Notes
- Mise à jour automatique du stock
- Calcul de la prochaine date
- Ajout à l'historique

✅ **Stock global calculé**
Pour une pièce utilisée sur plusieurs équipements:
- Consommation totale annuelle
- Consommation journalière totale
- Criticité moyenne pondérée
- Stock de sécurité global
- Point de réappro global
- Stock initial recommandé
- Détails par équipement

✅ **Alertes de réapprovisionnement**
- Liste des pièces sous le point de réappro
- Urgence: critical (sous stock sécurité) ou warning
- Déficit calculé
- Nombre d'équipements affectés
- Tri par urgence et déficit
- Actions: commander, voir détails

#### Exemple Concret

```
Pièce: Courroie B123
Utilisée sur 3 machines

Machine A (Juki DDL-8700):
- Quantité: 1 courroie
- Fréquence: 2 fois/an (tous les 6 mois)
- Criticité: high (score 3)
- Importance: 80/100
→ Consommation: 2 pièces/an

Machine B (Brother S-7300A):
- Quantité: 1 courroie
- Fréquence: 1 fois/an
- Criticité: medium (score 2)
- Importance: 50/100
→ Consommation: 1 pièce/an

Machine C (Singer 191D):
- Quantité: 2 courroies
- Fréquence: 0.5 fois/an (tous les 2 ans)
- Criticité: low (score 1)
- Importance: 30/100
→ Consommation: 1 pièce/an

CALCUL GLOBAL:
- Consommation totale: 4 pièces/an
- Consommation journalière: 0.011 pièces/jour
- Criticité moyenne: (3×80 + 2×50 + 1×30) / 160 = 2.31 (medium)
- Délai max: 15 jours
- Coeff. max: 1.4
- Stock de sécurité: ceil(0.011 × 15 × 1.4) = 1 pièce
- Point de réappro: ceil(1 + 0.011 × 15) = 2 pièces
- Stock initial recommandé: 2 pièces

Si stock actuel = 1 pièce:
→ ALERTE WARNING (sous le point de réappro)
→ Déficit: 1 pièce
→ 3 équipements affectés
```

### Implémentation

#### Backend
```javascript
// Modèle: server/models/AssetPart.js (9.8KB)
// Hook pre-save: calcule automatiquement tous les champs

// Routes: server/routes/assetPartsRoutes.js (11KB)
GET    /api/asset-parts
POST   /api/asset-parts
GET    /api/asset-parts/:id
PATCH  /api/asset-parts/:id
DELETE /api/asset-parts/:id
GET    /api/asset-parts/asset/:id
GET    /api/asset-parts/part/:id
GET    /api/asset-parts/part/:id/global-stock  // ⭐ Calcul global
GET    /api/asset-parts/reorder-alerts          // ⚠️ Alertes
POST   /api/asset-parts/:id/record-replacement  // 🔧 Remplacement
```

#### Frontend
```typescript
// Composants:
- AssetPartsList: Liste des pièces d'un équipement (12KB)
- AssetPartFormDialog: Formulaire avec calculs temps réel (13KB)
- RecordReplacementDialog: Enregistrer un remplacement (6KB)
- GlobalStockCard: Affichage du stock global calculé (10KB)
- PartAssetsList: Équipements utilisant une pièce (8KB)
- ReorderAlertsWidget: Widget alertes pour dashboard (6KB)

// Pages:
- PartDetails: Page complète pour une pièce (9KB)
- ReorderAlerts: Page dédiée aux alertes (14KB)

// API Client: client/src/api/assetParts.ts (8KB)
```

---

## 4. Gestion des Interventions

### Fonctionnalités

✅ **Types d'intervention**
- **Corrective**: Réparation suite à panne
- **Preventive**: Maintenance planifiée
- **Emergency**: Urgence critique

✅ **Niveaux de priorité**
- Low: Peut attendre
- Medium: À planifier
- High: Urgent
- Critical: Immédiat

✅ **Statuts**
- Pending: En attente
- In Progress: En cours
- Completed: Terminée
- Cancelled: Annulée

✅ **CRUD complet**
- Créer une intervention
- Assigner à un équipement
- Assigner à une personne
- Définir date d'échéance
- Suivre l'avancement
- Marquer comme terminée
- Historique complet

✅ **Lien avec équipements**
- Double référence (legacy + ObjectId)
- Affichage des interventions par équipement
- Filtrage par équipement

### Implémentation

#### Backend
```javascript
// Modèle: server/models/Intervention.js
// Routes: server/routes/interventionsRoutes.js
GET    /api/interventions
POST   /api/interventions
GET    /api/interventions/:id
PATCH  /api/interventions/:id
DELETE /api/interventions/:id
```

#### Frontend
```typescript
// Page: client/src/pages/Interventions.tsx (20KB)
// Page: client/src/pages/InterventionDetail.tsx
// Page: client/src/pages/AssetInterventions.tsx (14KB)
```

---

## 5. Dashboard et KPI

### Fonctionnalités

✅ **KPI Globaux**
- Nombre total d'équipements
- Équipements en production
- Équipements en maintenance
- Taux de disponibilité
- MTBF moyen
- MTTR moyen
- OEE estimé

✅ **Graphiques**
- Répartition par statut (pie chart)
- Répartition par catégorie (bar chart)
- Évolution dans le temps (line chart)
- Top équipements par pannes

✅ **Interventions récentes**
- Liste des 10 dernières
- Filtrage par type
- Filtrage par priorité
- Lien vers détails

✅ **Alertes de stock**
- Widget intégré
- Nombre d'alertes critiques
- Nombre d'alertes warning
- Lien vers page complète
- Auto-refresh toutes les 5 minutes

✅ **Statistiques temps réel**
- Mise à jour automatique
- Calculs côté backend
- Cache optimisé

### Implémentation

#### Backend
```javascript
// Routes: server/routes/dashboardRoutes.js
GET /api/dashboard/kpi
GET /api/dashboard/asset-status
GET /api/dashboard/recent-interventions
GET /api/dashboard/alerts
```

#### Frontend
```typescript
// Page: client/src/pages/Dashboard.tsx (10KB)
// Composant: client/src/components/ReorderAlertsWidget.tsx (6KB)
```

---

## 6. Gestion du Personnel

### 4 Types de Personnel

✅ **Machinists** (Machinistes)
- Opérateurs de machines
- Spécialité
- Disponibilité

✅ **Mechanics** (Mécaniciens)
- Réparations mécaniques
- Spécialité
- Certifications
- Disponibilité

✅ **Electricians** (Électriciens)
- Problèmes électriques
- Numéro de licence
- Certifications
- Disponibilité

✅ **MaintenanceWorkers** (Agents de maintenance)
- Maintenance générale
- Compétences multiples
- Disponibilité

### Fonctionnalités

✅ **CRUD complet** pour chaque type
- Créer
- Lister avec filtres
- Voir détails
- Modifier
- Supprimer (soft delete)

✅ **Assignation**
- Lors du changement de statut
- Lors de la création d'intervention
- Historique des assignations

✅ **Disponibilité**
- Marquage disponible/indisponible
- Filtrage par disponibilité

### Implémentation

#### Backend
```javascript
// Modèles:
- server/models/Machinist.js
- server/models/Mechanic.js
- server/models/Electrician.js
- server/models/MaintenanceWorker.js

// Routes: (4 fichiers × 5 endpoints = 20 endpoints)
- server/routes/machinistRoutes.js
- server/routes/mechanicRoutes.js
- server/routes/electricianRoutes.js
- server/routes/maintenanceWorkerRoutes.js
```

#### Frontend
```typescript
// Pages:
- client/src/pages/Machinists.tsx (11KB)
- client/src/pages/Mechanics.tsx (14KB)
- client/src/pages/Electricians.tsx (14KB)
- client/src/pages/MaintenanceWorkers.tsx (14KB)
```

---

## 7. Authentification et Sécurité

### Fonctionnalités

✅ **Authentification JWT**
- Access token (courte durée)
- Refresh token (longue durée)
- Rotation automatique des tokens

✅ **12 Rôles utilisateur**
- admin: Accès complet
- maintenance_manager: Gestion maintenance
- mechanic: Interventions mécaniques
- electrician: Interventions électriques
- general_maintenance_agent: Maintenance générale
- dockworker: Opérations dock
- assistant_maintenance_manager: Assistant
- factory_manager: Direction usine
- production_manager: Direction production
- line_manager: Chef de ligne
- foreman: Contremaître
- procurement_manager: Achats
- project_manager: Gestion projets

✅ **Inscription/Connexion**
- Validation email
- Hash bcrypt (10 rounds)
- Vérification mot de passe
- Génération tokens

✅ **Protection des routes**
- Middleware JWT
- Vérification token
- Refresh automatique
- Déconnexion

✅ **Sécurité renforcée**
- Helmet (headers HTTP sécurisés)
- Rate limiting (1000 req/15min)
- MongoDB sanitization (injection NoSQL)
- CORS configuré
- Compression gzip
- Logging structuré (Pino)

### Implémentation

#### Backend
```javascript
// Routes: server/routes/authRoutes.js
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me

// Middleware: server/routes/middleware/auth.js
const authenticateToken = (req, res, next) => {
  // Vérifie JWT
  // Attache user à req
}

// Sécurité: server/server.js
app.use(helmet())
app.use(rateLimit({ windowMs: 15*60*1000, max: 1000 }))
app.use(mongoSanitize())
app.use(compression())
```

#### Frontend
```typescript
// Context: client/src/contexts/AuthContext.tsx
const AuthContext = createContext({
  user, login, logout, register, isAuthenticated
})

// Composant: client/src/components/ProtectedRoute.tsx
const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated) return <Navigate to="/login" />
  return children
}

// Pages:
- client/src/pages/Login.tsx
- client/src/pages/Register.tsx
```

---

## 8. Upload de Médias

### Fonctionnalités

✅ **Upload de fichiers**
- Images: jpg, jpeg, png, gif, webp
- Vidéos: mp4, avi, mov
- Max 5 fichiers par upload
- Max 10MB par fichier

✅ **Médias de panne**
- Lien avec équipement
- Type de panne
- Description
- Métadonnées (nom, taille, type)
- Date d'upload
- Utilisateur ayant uploadé

✅ **Stockage**
- Dossier: `server/uploads/`
- Nommage unique (timestamp + random)
- Serveur de fichiers statiques

✅ **Affichage**
- Galerie d'images
- Lecteur vidéo
- Téléchargement
- Suppression

### Implémentation

#### Backend
```javascript
// Routes: server/routes/breakdownMedia.js
POST   /api/breakdown-media/upload
GET    /api/breakdown-media/asset/:id
DELETE /api/breakdown-media/:id

// Multer config:
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.random() + path.extname(file.originalname)
    cb(null, uniqueName)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'video/mp4', ...]
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Type non autorisé'))
  }
})

// Serveur statique:
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
```

---

## 9. Configuration

### Fonctionnalités

✅ **Catégories d'équipements**
- CRUD complet
- Nom et description
- Utilisées pour classification

✅ **Types d'équipements**
- CRUD complet
- Lien avec catégorie
- Nom et description

✅ **Marques**
- CRUD complet
- Nom, pays, site web
- Utilisées pour équipements

✅ **Lignes de production**
- CRUD complet
- Lien avec section
- Nom, description, statut actif

✅ **Sections de production**
- CRUD complet
- Nom, description, manager
- Statut actif

### Implémentation

#### Backend
```javascript
// Routes:
- server/routes/assetCategoriesRoutes.js
- server/routes/assetTypesRoutes.js
- server/routes/brandsRoutes.js
- server/routes/productionLinesRoutes.js
- server/routes/productionSectionsRoutes.js
```

#### Frontend
```typescript
// Pages:
- client/src/pages/AssetCategories.tsx (7KB)
- client/src/pages/SubCategorys.tsx (16KB)
- client/src/pages/Brands.tsx (7KB)
- client/src/pages/ProductionLines.tsx (72KB!)
```

---

## 🎯 RÉSUMÉ DES FONCTIONNALITÉS

### ✅ Implémentées (100%)
1. Gestion complète des équipements
2. Système de statuts avec 14 états
3. Historique complet traçable
4. Calcul automatique du stock optimal
5. Alertes de réapprovisionnement
6. Gestion des interventions
7. Dashboard avec KPI temps réel
8. Gestion du personnel (4 types)
9. Authentification JWT + 12 rôles
10. Upload de médias de panne
11. Configuration complète
12. Export CSV
13. Filtres et recherche avancée
14. Pagination optimisée

### ⏳ À Finaliser (8%)
1. Routes React Router (PartDetails, ReorderAlerts)
2. Liens menu navigation

### 🚀 Améliorations Futures
1. Tests E2E automatisés
2. Graphiques de consommation historique
3. Prévisions basées sur ML
4. Notifications push
5. Intégration système de commande
6. Application mobile
7. Rapports PDF
8. API publique

---

**Document créé le 1er Novembre 2025**
