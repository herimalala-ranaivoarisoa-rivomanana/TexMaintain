# Configuration de Nodemon - Redémarrage Automatique

## ✅ Modifications Effectuées

J'ai configuré nodemon pour le redémarrage automatique du serveur backend.

### Fichiers modifiés:
1. **`server/package.json`** - Scripts mis à jour
2. **`server/nodemon.json`** - Configuration de nodemon créée

## 📋 Étapes d'Installation

### Option 1: Installation via npm (Recommandé)

Ouvrez un terminal **en tant qu'administrateur** ou dans un terminal normal:

```bash
cd server
npm install
```

Cela installera nodemon automatiquement car il est maintenant dans `devDependencies`.

### Option 2: Si PowerShell bloque l'exécution

Si vous obtenez une erreur de politique d'exécution, exécutez ceci **en tant qu'administrateur**:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Puis réessayez:
```bash
cd server
npm install
```

### Option 3: Utiliser CMD au lieu de PowerShell

Ouvrez **Command Prompt (CMD)** au lieu de PowerShell:

```cmd
cd server
npm install
```

## 🚀 Utilisation

### Démarrer le serveur avec nodemon (redémarrage automatique):

```bash
cd server
npm run dev
```

Le serveur redémarrera automatiquement à chaque modification de fichier `.js` ou `.json` !

### Démarrer sans nodemon (si besoin):

```bash
cd server
npm run dev:plain
```

## 🔧 Configuration Nodemon

Le fichier `server/nodemon.json` contient la configuration:

```json
{
  "watch": ["."],              // Surveille tous les fichiers
  "ext": "js,json",            // Extensions surveillées
  "ignore": ["node_modules/**"], // Dossiers ignorés
  "exec": "node server.js",    // Commande à exécuter
  "delay": "1000"              // Délai de 1s avant redémarrage
}
```

## ✨ Avantages

- ✅ **Redémarrage automatique** lors des modifications de code
- ✅ **Gain de temps** - Plus besoin de redémarrer manuellement
- ✅ **Détection intelligente** - Ignore node_modules et fichiers de test
- ✅ **Délai configurable** - Évite les redémarrages multiples

## 🐛 Dépannage

### Problème: "nodemon: command not found"

**Solution**: Installez nodemon globalement (optionnel):
```bash
npm install -g nodemon
```

### Problème: Le serveur ne redémarre pas

**Solution**: Vérifiez que vous êtes dans le bon dossier:
```bash
cd server
npm run dev
```

### Problème: Erreur de politique PowerShell

**Solution**: Utilisez CMD ou changez la politique:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 📝 Prochaines Étapes

1. **Arrêtez le serveur actuel** (Ctrl+C)
2. **Installez les dépendances**:
   ```bash
   cd server
   npm install
   ```
3. **Redémarrez avec nodemon**:
   ```bash
   npm run dev
   ```
4. **Testez la création d'équipement** sur `/asset`

Maintenant, chaque fois que vous modifiez un fichier du serveur, il redémarrera automatiquement ! 🎉

## 🔍 Vérification

Vous devriez voir dans le terminal:
```
[nodemon] 3.0.1
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): *.*
[nodemon] watching extensions: js,json
[nodemon] starting `node server.js`
Server running on port 5000
```

Quand vous modifiez un fichier:
```
[nodemon] restarting due to changes...
[nodemon] starting `node server.js`
Server running on port 5000
```
