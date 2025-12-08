# Computerized Maintenance Management System for AQUARELLE ANTSIRABE-1 - Dev DB via Docker

## Prérequis
- Docker Desktop
- Node 18+

## Démarrer la base MongoDB (Docker)
```bash
npm run db:up
```

Services:
- MongoDB: mongodb://root:example@localhost:27017 (authSource=admin)
- Mongo Express (UI): http://localhost:8081 (admin/admin)

## Configuration serveur
Créer `server/.env` avec:
```
DATABASE_URL=mongodb://root:example@localhost:27017/texmaintain?authSource=admin
JWT_SECRET=change_me_access
REFRESH_TOKEN_SECRET=change_me_refresh
PORT=3000
```

## Sécurité & Validation

- Helmet et rate limiting activés côté serveur.
- Validation d’entrée avec Zod pour Auth, Equipment, Inventory, Interventions.

## Démarrer l’application complète

Front-end (client):
```
cd client
npm install
npm run dev
```

Back-end (server):
```
cd server
npm install
npm run dev
```

Le client proxy `/api` vers `http://localhost:3000` en développement.

## Lancer l'appli
```bash
npm install
npm start
```

## Initialisation de la base de données

### Via script automatique (recommandé)
```bash
# Depuis la racine du projet
npm run seed

# Ou depuis le dossier server
cd server && npm run seed
```
Cette commande exécute automatiquement tous les seeders dans l'ordre correct.

### Via API (alternative)
1) Importer `Computerized Maintenance Management System for AQUARELLE ANTSIRABE-1.postman_collection.json` dans Postman/Insomnia.
2) Définir la variable `baseUrl` (par défaut http://localhost:3000).
3) Appeler `Seed > Seed All` pour initialiser toute la base de données.
4) Ou utiliser individuellement :
   - `Seed > Seed Admin` (utilisateur admin)
   - `Seed > Seed Equipment Categories`
   - `Seed > Seed Equipment Types`
   - `Seed > Seed Equipment` (échantillons)
   - `Seed > Seed Parts`

### Via interface web
Une fois l'application démarrée, les administrateurs peuvent gérer :
- **Catégories d'équipement** : `/equipment-categories`
- **Types d'équipement** : `/equipment-types`

## Tests API (Postman)
Après initialisation, connecter avec l'utilisateur admin et tester :
- Authentification (login/register)
- Equipment, Inventory, Interventions (CRUD et stock)
- Gestion des catégories et types d'équipement

## Arrêter / logs DB
```bash
npm run db:logs   # logs Mongo
npm run db:ps     # status
npm run db:down   # stop & remove
```

## Data Migration

### Migrate Intervention Equipment References
If you have existing interventions with string-based equipment references, run this migration to add strong ObjectId references:

```bash
node server/migrations/migrateInterventionEquipmentId.js
```

This migration will:
- Match intervention.equipment strings with Equipment.location
- Add equipmentId ObjectId references
- Report unmatched interventions for manual review

## Recent Improvements

### Equipment Status & KPIs
- Fixed equipment status checks to use `EQUIPMENT_STATUSES.IN_PRODUCTION` instead of legacy 'online' string
- Improved KPI calculations (MTBF, MTTR, availability) for accuracy
- Dashboard now shows real-time availability based on equipment in production status

### Intervention-Equipment Linking
- Added `equipmentId` ObjectId reference to Intervention model for strong typing
- Maintained backward compatibility with string-based `equipment` field
- API now accepts both `equipment` (string) and `equipmentId` (ObjectId)
- Interventions now populate equipment details (location, status, category, type)

### Dashboard KPIs
- Real MTTR calculation from completed corrective/emergency interventions
- Real MTBF calculation from failure intervals
- Dynamic availability based on equipment production status
- Estimated OEE calculation


