# 📊 ANALYSE COMPLÈTE DU SYSTÈME TEXMAINTAIN
**Date**: 1er Novembre 2025  
**Version**: 1.1.0  
**Analyste**: Cascade AI

---

## 🎯 VUE D'ENSEMBLE

**TexMaintain** est une application de gestion de maintenance industrielle (GMAO) pour l'industrie textile, développée avec une architecture MERN Stack moderne.

### Stack Technologique

#### Backend
- **Runtime**: Node.js v18+
- **Framework**: Express.js 4.18.2
- **Base de données**: MongoDB 8.1.1 (avec Mongoose ODM)
- **Authentification**: JWT (jsonwebtoken 9.0.2)
- **Validation**: Zod 3.23.8
- **Upload de fichiers**: Multer 2.0.2
- **Sécurité**: Helmet, express-mongo-sanitize, express-rate-limit
- **Logging**: Pino 9.5.0
- **Session**: express-session + connect-mongo

#### Frontend
- **Framework**: React 18+ avec TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui (Radix UI + Tailwind CSS)
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **State Management**: React Hooks (useState, useEffect)
- **Icons**: Lucide React

#### DevOps
- **Containerisation**: Docker + Docker Compose
- **Dev Server**: Nodemon 3.0.1
- **Proxy Dev**: Vite proxy (port 5173 → 3000)

---

## 📁 ARCHITECTURE DU PROJET

```
TexMaintain/
├── client/                    # Frontend React + TypeScript
│   ├── src/
│   │   ├── api/              # Clients API (axios)
│   │   ├── components/       # Composants réutilisables
│   │   ├── pages/            # Pages principales
│   │   ├── lib/              # Utilitaires
│   │   └── main.tsx          # Point d'entrée
│   ├── public/               # Assets statiques
│   ├── vite.config.ts        # Configuration Vite
│   └── package.json
│
├── server/                    # Backend Node.js + Express
│   ├── config/               # Configuration (DB, validation)
│   ├── models/               # Schémas Mongoose (16 modèles)
│   ├── routes/               # Routes API (19 fichiers)
│   ├── services/             # Logique métier
│   ├── utils/                # Utilitaires
│   ├── uploads/              # Fichiers uploadés
│   ├── server.js             # Point d'entrée
│   └── package.json
│
├── docker-compose.yml         # MongoDB + Mongo Express
└── README.md
```

---

## 🗄️ SCHÉMAS DE DONNÉES (MODÈLES)

### 1. **Equipment** (Équipement)
**Fichier**: `server/models/Equipment.js`

```javascript
{
  category: ObjectId → EquipmentCategory (requis)
  type: ObjectId → EquipmentType (requis)
  status: String (enum: 14 statuts) (requis, défaut: 'stored')
  statusCategory: String (enum: production|maintenance|out_of_service)
  lastStatusChange: Date
  lastStatusChangedBy: ObjectId → User
  currentStatusDuration: Number (minutes)
  
  location: String (requis)
  manufacturer: String
  model: String
  serialNumber: String (unique, sparse)
  chipNumber: String
  brand: ObjectId → Brand
  acquisitionDate: Date
  lastMaintenance: Date
  nextMaintenance: Date
  
  mtbf: Number (Mean Time Between Failures - heures)
  mttr: Number (Mean Time To Repair - heures)
  lastBreakdownType: String (enum: 8 types)
  lastBreakdownDescription: String
  specifications: Mixed (JSON flexible)
  
  createdAt: Date (immutable)
  updatedAt: Date
}
```

**Méthodes**:
- `canTransitionTo(newStatus)`: Vérifie si la transition de statut est autorisée
- `getAllowedTransitions()`: Retourne les transitions possibles
- `migrateLegacyStatus(legacyStatus)`: Migration des anciens statuts

**Hooks**:
- `pre('save')`: Met à jour `updatedAt`, `lastStatusChange` et `statusCategory`

---

### 2. **EquipmentStatusHistory** (Historique des statuts)
**Fichier**: `server/models/EquipmentStatusHistory.js`

```javascript
{
  equipment: ObjectId → Equipment (requis)
  previousStatus: String (enum: statuts)
  newStatus: String (enum: statuts) (requis)
  changedBy: ObjectId → User (requis)
  reason: String
  notes: String
  timestamp: Date (défaut: now)
  
  // Personnel assigné selon le statut
  machinist: ObjectId → Machinist
  mechanic: ObjectId → Mechanic
  electrician: ObjectId → Electrician
  maintenanceWorker: ObjectId → MaintenanceWorker
  
  // Détails de la panne
  breakdownType: String (enum: 8 types)
  breakdownDescription: String
  
  // Lien vers intervention
  intervention: ObjectId → Intervention
}
```

**14 Statuts disponibles**:

#### 🟢 Production (4 statuts)
1. `in_production` - En production active
2. `setup_adjustment` - Réglage/ajustement
3. `paused_by_operator` - Pause opérateur
4. `changeover` - Changement de série

#### 🟠 Maintenance (7 statuts)
5. `scheduled_maintenance` - Maintenance préventive
6. `breakdown` - Panne
7. `under_repair` - En réparation
8. `in_workshop` - À l'atelier
9. `waiting_spare_parts` - Attente pièces
10. `testing_after_repair` - Test après réparation
11. `under_inspection` - Inspection
12. `pending_validation` - Validation en attente

#### ⚫ Hors service (3 statuts)
13. `stored` - Stocké
14. `offline` - Hors ligne
15. `scrapped` - Mis au rebut (état terminal)

**Transitions autorisées**: Définies dans `STATUS_METADATA` avec validation stricte

---

### 3. **BreakdownMedia** (Médias de panne)
**Fichier**: `server/models/BreakdownMedia.js`

```javascript
{
  equipment: ObjectId → Equipment (requis)
  breakdownType: String (enum: 8 types) (requis)
  description: String (requis)
  files: [{
    filename: String (requis)
    originalName: String (requis)
    mimetype: String (requis)
    size: Number (requis)
    path: String (requis)
    uploadedAt: Date (défaut: now)
  }]
  uploadedBy: ObjectId → User (requis)
  createdAt: Date (défaut: now)
}
```

**Contraintes**:
- Max 5 fichiers par upload
- Max 10MB par fichier
- Types acceptés: images (jpg, png, gif, webp) et vidéos (mp4, avi, mov)

---

### 4. **Intervention** (Intervention de maintenance)
**Fichier**: `server/models/Intervention.js`

```javascript
{
  equipment: ObjectId → Equipment (requis)
  type: String (enum: corrective|preventive|predictive) (requis)
  status: String (enum: pending|in_progress|completed|cancelled)
  priority: String (enum: low|medium|high|critical)
  
  description: String (requis)
  diagnosis: String
  actions: String
  
  scheduledDate: Date
  startDate: Date
  endDate: Date
  duration: Number (minutes)
  
  assignedTo: ObjectId → User
  completedBy: ObjectId → User
  
  parts: [ObjectId → Part]
  cost: Number
  
  createdAt: Date
  updatedAt: Date
}
```

---

### 5. **User** (Utilisateur)
**Fichier**: `server/models/User.js`

```javascript
{
  email: String (unique, requis)
  password: String (bcrypt hash, requis)
  role: String (enum: 7 rôles) (requis)
  fullName: String (requis)
  matricule: String (unique)
  phone: String
  isActive: Boolean (défaut: true)
  lastLogin: Date
  createdAt: Date
  updatedAt: Date
}
```

**7 Rôles disponibles**:
1. `admin` - Administrateur système
2. `maintenance_manager` - Responsable maintenance
3. `assistant_maintenance_manager` - Assistant responsable
4. `production_manager` - Responsable production
5. `line_manager` - Chef de ligne
6. `foreman` - Contremaître
7. `operator` - Opérateur

---

### 6. **Personnel spécialisé** (4 modèles)

#### Machinist (Machiniste)
```javascript
{
  fullName: String (requis)
  matricule: String (unique, requis)
  phone: String
  email: String
  shift: String (enum: morning|afternoon|night)
  specialization: String
  isActive: Boolean (défaut: true)
  createdAt: Date
}
```

#### Mechanic (Mécanicien)
```javascript
{
  fullName: String (requis)
  matricule: String (unique, requis)
  phone: String
  email: String
  specialization: String
  certifications: [String]
  isActive: Boolean (défaut: true)
  createdAt: Date
}
```

#### Electrician (Électricien)
```javascript
{
  fullName: String (requis)
  matricule: String (unique, requis)
  phone: String
  email: String
  specialization: String
  certifications: [String]
  isActive: Boolean (défaut: true)
  createdAt: Date
}
```

#### MaintenanceWorker (Agent de maintenance)
```javascript
{
  fullName: String (requis)
  matricule: String (unique, requis)
  phone: String
  email: String
  skills: [String]
  isActive: Boolean (défaut: true)
  createdAt: Date
}
```

---

### 7. **Production** (2 modèles)

#### ProductionLine (Ligne de production)
```javascript
{
  name: String (unique, requis)
  code: String (unique, requis)
  description: String
  isActive: Boolean (défaut: true)
  capacity: Number
  createdAt: Date
}
```

#### ProductionSection (Section de production)
```javascript
{
  name: String (requis)
  productionLine: ObjectId → ProductionLine (requis)
  equipment: [{
    equipmentId: ObjectId → Equipment (requis)
    position: Number
    assignedAt: Date (défaut: now)
  }]
  isActive: Boolean (défaut: true)
  createdAt: Date
}
```

---

### 8. **Catalogue** (4 modèles)

#### EquipmentCategory (Catégorie d'équipement)
```javascript
{
  name: String (unique, requis)
  description: String
  icon: String
  createdAt: Date
}
```

#### EquipmentType (Type d'équipement)
```javascript
{
  name: String (requis)
  category: ObjectId → EquipmentCategory (requis)
  description: String
  specifications: Mixed
  createdAt: Date
}
```

#### Brand (Marque)
```javascript
{
  name: String (unique, requis)
  description: String
  createdAt: Date
}
```

#### Part (Pièce détachée)
```javascript
{
  name: String (requis)
  reference: String (unique, requis)
  description: String
  category: String
  supplier: String
  unitPrice: Number
  stockQuantity: Number (défaut: 0)
  minStockLevel: Number
  unit: String
  equipmentTypes: [ObjectId → EquipmentType]
  createdAt: Date
  updatedAt: Date
}
```

---

## 🔌 API ENDPOINTS

### **Authentication** (`/api/auth`)
```
POST   /register          - Créer un compte utilisateur
POST   /login             - Se connecter (retourne JWT)
POST   /logout            - Se déconnecter
GET    /me                - Obtenir l'utilisateur connecté
```

### **Equipment** (`/api/equipment`)
```
GET    /                  - Liste paginée (filtres: status, q, sort, order)
POST   /                  - Créer un équipement (admin, maintenance_manager)
GET    /:id               - Détails d'un équipement
PATCH  /:id               - Modifier un équipement
DELETE /:id               - Supprimer un équipement (admin only)
POST   /:id/change-status - Changer le statut avec tracking
GET    /:id/status-history - Historique des statuts
```

### **Breakdown Media** (`/api/breakdown-media`)
```
POST   /                  - Upload médias de panne (max 5 fichiers, 10MB/fichier)
GET    /equipment/:id     - Médias d'un équipement
GET    /:id               - Détails d'un média
DELETE /:id               - Supprimer un média
```

### **Personnel** (4 endpoints similaires)
```
GET    /api/machinists           - Liste des machinistes
POST   /api/machinists           - Créer un machiniste
PATCH  /api/machinists/:id       - Modifier
DELETE /api/machinists/:id       - Supprimer

GET    /api/mechanics            - Liste des mécaniciens
GET    /api/electricians         - Liste des électriciens
GET    /api/maintenance-workers  - Liste des agents
```

### **Production** (`/api/process-area`, `/api/production-sections`)
```
GET    /process-area         - Liste des lignes
POST   /process-area         - Créer une ligne
PATCH  /process-area/:id     - Modifier
DELETE /process-area/:id     - Supprimer

GET    /production-sections      - Liste des sections
POST   /production-sections      - Créer une section
PATCH  /production-sections/:id  - Modifier
DELETE /production-sections/:id  - Supprimer
```

### **Catalogue**
```
GET    /api/equipment-categories - Liste des catégories
POST   /api/equipment-categories - Créer une catégorie
PATCH  /api/equipment-categories/:id
DELETE /api/equipment-categories/:id

GET    /api/equipment-types      - Liste des types
GET    /api/brands               - Liste des marques
GET    /api/inventory            - Inventaire des pièces
```

### **Interventions** (`/api/interventions`)
```
GET    /                  - Liste des interventions
POST   /                  - Créer une intervention
GET    /:id               - Détails
PATCH  /:id               - Modifier
DELETE /:id               - Supprimer
```

### **Dashboard** (`/api/dashboard`)
```
GET    /stats             - Statistiques globales
GET    /equipment-status  - Répartition des statuts
GET    /mtbf-mttr         - Indicateurs de fiabilité
```

### **Seed** (`/api/seed`)
```
POST   /all               - Seed toutes les données (admin only)
POST   /users             - Seed utilisateurs
POST   /categories        - Seed catégories
POST   /types             - Seed types
POST   /brands            - Seed marques
POST   /equipment         - Seed équipements
POST   /parts             - Seed pièces
```

### **Health** (`/api`)
```
GET    /health            - Vérification de santé
GET    /health/db         - État de la base de données
```

---

## 🔐 SÉCURITÉ

### Authentification
- **JWT** avec tokens d'accès et de rafraîchissement
- Tokens stockés dans `localStorage` (client)
- Middleware `requireUser` pour protéger les routes
- Middleware `requireRole` pour contrôle d'accès basé sur les rôles

### Middlewares de sécurité
1. **Helmet**: Headers HTTP sécurisés
2. **CORS**: Origines autorisées configurables
3. **Rate Limiting**: 1000 requêtes / 15 minutes
4. **Mongo Sanitize**: Protection contre NoSQL injection
5. **Express Validator**: Validation des entrées
6. **Zod**: Validation de schémas TypeScript

### Upload de fichiers
- **Multer** avec validation:
  - Types MIME autorisés
  - Taille max: 10MB par fichier
  - Nombre max: 5 fichiers
  - Stockage: `server/uploads/breakdown-media/`

---

## 🎨 INTERFACE UTILISATEUR (FRONTEND)

### Pages principales

#### 1. **Dashboard** (`/`)
- Statistiques en temps réel
- Graphiques de statuts
- Indicateurs KPI (MTBF, MTTR, disponibilité)
- Alertes et notifications

#### 2. **Equipment** (`/equipment`)
- Liste paginée avec filtres (statut, recherche)
- Tri par colonne
- Actions: Créer, Modifier, Supprimer
- Changement de statut avec modal
- Upload de médias de panne
- Sélection de personnel selon le statut

#### 3. **Process areas** (`/process-area`)
- Vue des lignes de production
- Sections et équipements assignés
- Changement de statut rapide
- Drag & drop pour réorganisation

#### 4. **Interventions** (`/interventions`)
- Liste des interventions
- Filtres par type, statut, priorité
- Création et suivi d'interventions
- Association de pièces

#### 5. **Inventory** (`/inventory`)
- Gestion des pièces détachées
- Alertes de stock bas
- Historique des mouvements

### Composants réutilisables (shadcn/ui)
- `Button`, `Input`, `Select`, `Textarea`
- `Dialog`, `Sheet`, `Popover`, `Tooltip`
- `Table`, `Card`, `Badge`, `Alert`
- `Tabs`, `Accordion`, `Separator`
- `Toast` (notifications)

### Features UX
- **Mise à jour optimiste**: UI réactive avant confirmation serveur
- **Rechargement automatique**: Toutes les 30 secondes
- **Validation en temps réel**: Formulaires avec feedback immédiat
- **Responsive design**: Mobile-first avec Tailwind CSS
- **Dark mode ready**: Variables CSS personnalisables

---

## 🔄 LOGIQUE MÉTIER CLÉS

### 1. **Changement de statut d'équipement**
**Service**: `server/services/equipmentStatusService.js`

```javascript
async changeStatus(equipmentId, newStatus, userId, options) {
  // 1. Validation de la transition
  // 2. Vérification du personnel requis
  // 3. Mise à jour de l'équipement
  // 4. Création d'une entrée dans l'historique
  // 5. Création d'intervention si nécessaire
  // 6. Retour de l'équipement mis à jour
}
```

**Règles**:
- `in_production` → Machiniste requis
- `under_repair`, `in_workshop`, `scheduled_maintenance`, `under_inspection` → Au moins un personnel de maintenance requis (mécanicien, électricien ou agent)
- `breakdown` → Type de panne et description requis + médias optionnels
- `scrapped` → État terminal, aucune transition possible

### 2. **Upload de médias de panne**
**Route**: `POST /api/breakdown-media`

```javascript
// Multer configuration
const upload = multer({
  storage: diskStorage({
    destination: 'uploads/breakdown-media/',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, uniqueSuffix + path.extname(file.originalname))
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo']
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type'))
    }
  }
})
```

### 3. **Pagination et filtrage**
**Exemple**: `GET /api/equipment?page=1&limit=10&status=breakdown&q=DDL&sort=createdAt&order=desc`

```javascript
const page = parseInt(req.query.page) || 1
const limit = parseInt(req.query.limit) || 10
const skip = (page - 1) * limit

const filter = {}
if (req.query.status) filter.status = req.query.status
if (req.query.q) {
  filter.$or = [
    { model: { $regex: req.query.q, $options: 'i' } },
    { serialNumber: { $regex: req.query.q, $options: 'i' } },
    { chipNumber: { $regex: req.query.q, $options: 'i' } }
  ]
}

const equipment = await Equipment.find(filter)
  .populate('category type brand lastStatusChangedBy')
  .sort({ [sort]: order === 'asc' ? 1 : -1 })
  .skip(skip)
  .limit(limit)
  .lean()

const total = await Equipment.countDocuments(filter)
```

### 4. **Seed de données**
**Script**: `server/seed.js` et `server/services/seedService.js`

Ordre de seeding:
1. Users (admin + 6 autres rôles)
2. Equipment Categories (10 catégories)
3. Equipment Types (30+ types)
4. Brands (15 marques)
5. Process areas (5 lignes)
6. Production Sections (15 sections)
7. Equipment (50+ équipements)
8. Parts (100+ pièces)
9. Personnel (machinistes, mécaniciens, électriciens, agents)

---

## 📊 INDICATEURS DE PERFORMANCE (KPI)

### MTBF (Mean Time Between Failures)
```javascript
mtbf = totalOperatingTime / numberOfBreakdowns
```

### MTTR (Mean Time To Repair)
```javascript
mttr = totalRepairTime / numberOfRepairs
```

### Disponibilité (Availability)
```javascript
availability = (totalTime - downtime) / totalTime * 100
```

### TRS (Taux de Rendement Synthétique)
```javascript
trs = disponibilité * performance * qualité
```

---

## 🐛 CORRECTIONS RÉCENTES (Session actuelle)

### 1. **Erreur MongoDB Authentication**
- **Problème**: `MongoServerError: Command find requires authentication`
- **Solution**: Mise à jour de `.env` avec `DATABASE_URL=mongodb://root:example@localhost:27017/texmaintain?authSource=admin`

### 2. **Upload de médias échoué (404)**
- **Problème**: Frontend appelait `/breakdown-media` au lieu de `/api/breakdown-media`
- **Solution**: Ajout du préfixe `/api/` dans `client/src/api/breakdownMedia.ts`

### 3. **Erreur 400 sur PATCH equipment (brand vide)**
- **Problème**: Chaîne vide `""` envoyée pour `brand` (ObjectId attendu)
- **Solution**: Transformation de `brand: ""` en suppression du champ dans la route PATCH

### 4. **Statut ne persiste pas après refresh**
- **Problème**: Changement de statut non envoyé au serveur si personnel non requis
- **Solution**: Envoi du changement de statut pour TOUS les statuts, pas seulement ceux nécessitant du personnel

### 5. **Erreur `Cannot find name 'fetchData'`**
- **Problème**: Appel à une fonction locale dans un scope incorrect
- **Solution**: Remplacement par `fetchEquipment()` qui est la fonction correcte

### 6. **Formulaire d'édition non scrollable**
- **Problème**: Contenu trop long dépassait l'écran
- **Solution**: Ajout de `max-h-[90vh] overflow-y-auto` au DialogContent

### 7. **Script Pythagora.ai causant erreur de connexion**
- **Problème**: `POST http://localhost:4444/logs net::ERR_CONNECTION_REFUSED`
- **Solution**: Commentaire du script externe dans `client/index.html`

---

## 🚀 DÉMARRAGE RAPIDE

### Prérequis
- Node.js 18+
- MongoDB (via Docker ou local)
- npm ou yarn

### Installation

```bash
# 1. Cloner le repo
git clone <repo-url>
cd TexMaintain

# 2. Démarrer MongoDB (Docker)
docker-compose up -d

# 3. Backend
cd server
npm install
cp .env.example .env
# Éditer .env avec les bonnes credentials
npm run seed  # Seed les données
npm run dev   # Démarrer le serveur (port 3000)

# 4. Frontend (nouveau terminal)
cd ../client
npm install
npm run dev   # Démarrer Vite (port 5173)
```

### Accès
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Mongo Express**: http://localhost:8081

### Comptes de test
```
Admin:
  email: admin@texmaintain.com
  password: Admin123!

Maintenance Manager:
  email: maintenance.manager@texmaintain.com
  password: Manager123!
```

---

## 📈 AMÉLIORATIONS FUTURES

### Court terme
- [ ] Tests unitaires (Jest + Supertest)
- [ ] Tests E2E (Playwright)
- [ ] Documentation API (Swagger/OpenAPI)
- [ ] Logs structurés (Winston)
- [ ] Monitoring (Prometheus + Grafana)

### Moyen terme
- [ ] Notifications en temps réel (WebSockets)
- [ ] Export PDF/Excel des rapports
- [ ] Planification automatique de maintenance
- [ ] Intégration IoT (capteurs équipements)
- [ ] Application mobile (React Native)

### Long terme
- [ ] IA prédictive pour pannes
- [ ] Réalité augmentée pour maintenance
- [ ] Blockchain pour traçabilité
- [ ] Multi-tenant (SaaS)

---

## 📝 NOTES TECHNIQUES

### Conventions de code
- **Backend**: JavaScript ES6+ avec CommonJS
- **Frontend**: TypeScript strict mode
- **Naming**: camelCase (variables), PascalCase (composants/classes)
- **Commits**: Conventional Commits (feat, fix, docs, etc.)

### Performance
- **Pagination**: Limite par défaut 10 items
- **Cache**: Pas de cache actuellement (à implémenter avec Redis)
- **Indexes MongoDB**: Sur `serialNumber`, `chipNumber`, `status`, `category`, `type`

### Logging
- **Niveau**: info (production), debug (development)
- **Format**: JSON structuré (Pino)
- **Rotation**: Pas configurée (à implémenter)

---

## 🤝 CONTRIBUTION

### Workflow Git
1. Créer une branche feature: `git checkout -b feature/nom-feature`
2. Commit avec message descriptif
3. Push et créer une Pull Request
4. Review + tests automatiques
5. Merge après approbation

### Standards de qualité
- Code review obligatoire
- Tests passants (quand implémentés)
- Pas de console.log en production
- Documentation des fonctions complexes

---

## 📞 SUPPORT

Pour toute question ou problème:
1. Consulter cette documentation
2. Vérifier les fichiers `DEBUG_*.md` et `FIX_*.md`
3. Consulter les logs serveur et navigateur
4. Créer une issue GitHub avec:
   - Description du problème
   - Steps to reproduce
   - Logs pertinents
   - Version du système

---

**Fin de l'analyse complète**  
*Document généré automatiquement par Cascade AI*  
*Dernière mise à jour: 1er Novembre 2025*
