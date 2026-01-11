# Guide de Redémarrage Rapide

## Problème: Les modifications du serveur ne sont pas prises en compte

### Solution 1: Redémarrage Manuel (Recommandé)

1. **Trouvez le terminal où le serveur backend tourne**
2. **Arrêtez le serveur** : Appuyez sur `Ctrl+C`
3. **Redémarrez le serveur** :
   ```bash
   cd server
   npm run dev
   ```

### Solution 2: Tuer tous les processus Node (Si le terminal est perdu)

⚠️ **Attention**: Cela arrêtera TOUS les processus Node, y compris le frontend.

```powershell
Get-Process -Name node | Stop-Process -Force
```

Ensuite, redémarrez le backend ET le frontend :

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

### Solution 3: Installer Nodemon pour le redémarrage automatique

Pour éviter ce problème à l'avenir, installez nodemon :

1. **Installer nodemon** :
   ```bash
   cd server
   npm install --save-dev nodemon
   ```

2. **Modifier package.json** :
   ```json
   {
     "scripts": {
       "start": "node server.js",
       "dev": "nodemon server.js",
       "test": "echo \"Error: no test specified\" && exit 1",
       "seed": "node ./seed.js"
     }
   }
   ```

3. **Redémarrer avec nodemon** :
   ```bash
   npm run dev
   ```

Maintenant, le serveur redémarrera automatiquement à chaque modification de fichier !

## Vérifier que le serveur tourne

```powershell
# Voir tous les processus Node
Get-Process -Name node

# Vérifier si le port 5000 est utilisé (backend)
netstat -ano | findstr :5000

# Vérifier si le port 5173 est utilisé (frontend Vite)
netstat -ano | findstr :5173
```

## Tester l'API après redémarrage

```powershell
# Test simple avec curl (si installé)
curl http://localhost:5000/api/asset

# Ou ouvrir dans le navigateur
start http://localhost:5000/api/asset
```

## Ordre de démarrage recommandé

1. **D'abord MongoDB** (si pas déjà démarré) :
   ```bash
   npm run db:up
   ```

2. **Ensuite le Backend** :
   ```bash
   cd server
   npm run dev
   ```

3. **Enfin le Frontend** :
   ```bash
   cd client
   npm run dev
   ```

## Logs utiles

### Voir les logs du serveur
Les logs du serveur s'affichent dans le terminal où vous avez lancé `npm run dev`.

### Erreurs communes

1. **Port déjà utilisé** :
   ```
   Error: listen EADDRINUSE: address already in use :::5000
   ```
   **Solution**: Tuez le processus qui utilise le port ou changez le port dans `.env`

2. **MongoDB non connecté** :
   ```
   MongooseError: Operation `asset.find()` buffering timed out
   ```
   **Solution**: Démarrez MongoDB avec `npm run db:up`

3. **Variables d'environnement manquantes** :
   ```
   Error: DATABASE_URL variables in .env missing
   ```
   **Solution**: Vérifiez que le fichier `.env` existe dans le dossier `server/`

## Après le redémarrage

1. ✅ Vérifiez que le serveur démarre sans erreur
2. ✅ Testez la création d'équipement sur `/asset`
3. ✅ Vérifiez les logs du serveur pour toute erreur
4. ✅ Testez les nouvelles pages de personnel de maintenance

## Besoin d'aide ?

Si le problème persiste :
1. Vérifiez les logs du serveur dans le terminal
2. Vérifiez la console du navigateur (F12)
3. Vérifiez que MongoDB est bien démarré
4. Vérifiez que toutes les dépendances sont installées (`npm install`)
