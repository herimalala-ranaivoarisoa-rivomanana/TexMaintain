# TexMaintain - Dev DB via Docker

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

## Tests API (Postman)
1) Importer `TexMaintain.postman_collection.json` dans Postman/Insomnia.
2) Définir la variable `baseUrl` (par défaut http://localhost:3000).
3) Appeler `Seed > Seed Admin`, puis `Auth > Login` et copier les `accessToken`/`refreshToken` dans les variables.
4) Tester Equipment, Inventory, Interventions (CRUD et stock).

## Arrêter / logs DB
```bash
npm run db:logs   # logs Mongo
npm run db:ps     # status
npm run db:down   # stop & remove
```


