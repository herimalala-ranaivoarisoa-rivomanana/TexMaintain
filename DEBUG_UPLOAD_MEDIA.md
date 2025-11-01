# 🐛 DEBUG: Upload de Médias de Panne

**Problème**: "Partially Updated - Status changed but media upload failed"

---

## 🔍 DIAGNOSTIC

### Erreur observée
```
Partially Updated
Status changed but media upload failed
```

Cela signifie :
- ✅ Le changement de statut vers "Breakdown" a réussi
- ❌ L'upload des fichiers médias a échoué

---

## 🛠️ CORRECTIONS APPORTÉES

### 1. Limite de fichiers cohérente
**Avant** : Route acceptait 10 fichiers mais config limitait à 5
**Après** : Limite uniforme de 5 fichiers partout

### 2. Gestion d'erreurs améliorée
Ajout de messages d'erreur spécifiques :
- `LIMIT_FILE_SIZE` : Fichier trop grand (>10MB)
- `LIMIT_FILE_COUNT` : Trop de fichiers (>5)
- Validation MIME type
- Validation extension

### 3. Logging détaillé
Ajout de logs pour déboguer :
```javascript
📤 Breakdown media upload request: {
  equipmentId, breakdownType, description,
  filesCount, user
}
✅ Breakdown media uploaded successfully
```

---

## 🧪 TESTS À EFFECTUER

### Test 1 : Upload sans fichier
```bash
# Devrait réussir (fichiers optionnels)
curl -X POST http://localhost:3000/api/breakdown-media \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "equipmentId=123" \
  -F "breakdownType=electrical" \
  -F "description=Test sans fichier"
```

### Test 2 : Upload avec 1 fichier valide
```bash
curl -X POST http://localhost:3000/api/breakdown-media \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "equipmentId=123" \
  -F "breakdownType=electrical" \
  -F "description=Test avec image" \
  -F "files=@photo.jpg"
```

### Test 3 : Upload avec fichier trop grand
```bash
# Devrait échouer avec message clair
curl -X POST http://localhost:3000/api/breakdown-media \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "equipmentId=123" \
  -F "breakdownType=electrical" \
  -F "description=Test fichier trop grand" \
  -F "files=@large_file.jpg"  # >10MB

# Erreur attendue: "File too large. Maximum size is 10MB per file."
```

### Test 4 : Upload avec trop de fichiers
```bash
# Devrait échouer avec message clair
curl -X POST http://localhost:3000/api/breakdown-media \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "equipmentId=123" \
  -F "breakdownType=electrical" \
  -F "description=Test trop de fichiers" \
  -F "files=@file1.jpg" \
  -F "files=@file2.jpg" \
  -F "files=@file3.jpg" \
  -F "files=@file4.jpg" \
  -F "files=@file5.jpg" \
  -F "files=@file6.jpg"  # 6 fichiers > limite de 5

# Erreur attendue: "Too many files. Maximum is 5 files per upload."
```

### Test 5 : Upload avec type de fichier invalide
```bash
# Devrait échouer avec message clair
curl -X POST http://localhost:3000/api/breakdown-media \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "equipmentId=123" \
  -F "breakdownType=electrical" \
  -F "description=Test fichier invalide" \
  -F "files=@malware.exe"

# Erreur attendue: "Invalid file type. Allowed types: images and videos only"
```

---

## 📋 CHECKLIST DE VÉRIFICATION

Quand vous testez l'upload depuis l'interface :

### Côté Frontend
- [ ] Vérifier la console du navigateur pour les erreurs
- [ ] Vérifier le Network tab pour voir la requête/réponse
- [ ] Vérifier que les fichiers sont bien ajoutés au FormData
- [ ] Vérifier la taille des fichiers (<10MB chacun)
- [ ] Vérifier le nombre de fichiers (≤5)
- [ ] Vérifier le type de fichiers (images/vidéos uniquement)

### Côté Backend
- [ ] Vérifier les logs du serveur
- [ ] Chercher le log `📤 Breakdown media upload request:`
- [ ] Vérifier si erreur Multer apparaît
- [ ] Vérifier le dossier `server/uploads/breakdown-media/`
- [ ] Vérifier que MongoDB est connecté

---

## 🔧 COMMANDES DE DEBUG

### Voir les logs du serveur
```bash
cd server
npm run dev
# Regarder les logs en temps réel
```

### Vérifier les fichiers uploadés
```bash
# Windows
dir server\uploads\breakdown-media

# Git Bash
ls -lah server/uploads/breakdown-media/
```

### Vérifier MongoDB
```bash
# Via Mongo Express
http://localhost:8081

# Ou via mongosh
mongosh mongodb://root:example@localhost:27017/texmaintain?authSource=admin
use texmaintain
db.breakdownmedias.find().pretty()
```

---

## 🐛 ERREURS COURANTES

### 1. "File upload failed" (générique)
**Cause** : Erreur Multer non spécifique
**Solution** : Vérifier les logs du serveur pour plus de détails

### 2. "File too large"
**Cause** : Fichier > 10MB
**Solution** : Réduire la taille du fichier ou augmenter la limite dans `.env`

### 3. "Too many files"
**Cause** : Plus de 5 fichiers
**Solution** : Sélectionner maximum 5 fichiers

### 4. "Invalid file type"
**Cause** : Type de fichier non autorisé
**Solution** : Utiliser uniquement images (.jpg, .png, .gif, .webp) ou vidéos (.mp4, .mpeg, .mov)

### 5. "Equipment ID, breakdown type, and description are required"
**Cause** : Champs manquants
**Solution** : Vérifier que tous les champs sont remplis dans le formulaire

### 6. "Unauthorized"
**Cause** : Token JWT manquant ou expiré
**Solution** : Se reconnecter

---

## 📊 FORMAT DES LOGS

### Logs de succès
```
📤 Breakdown media upload request: {
  equipmentId: '6905b7c4684b94f91c133a7b',
  breakdownType: 'electrical',
  description: 'Court-circuit',
  filesCount: 2,
  user: 'admin@texmaintain.com'
}
✅ Breakdown media uploaded successfully: {
  id: '690...',
  equipment: '6905b7c4684b94f91c133a7b',
  filesCount: 2
}
```

### Logs d'erreur
```
Multer upload error: Error: Invalid file type
❌ Error uploading breakdown media: [détails]
```

---

## 🚀 APRÈS LE REDÉMARRAGE

1. **Redémarrez le serveur** :
```bash
cd server
npm run dev
```

2. **Testez depuis l'interface** :
   - Créer une panne (Breakdown)
   - Sélectionner 1-2 images (< 10MB chacune)
   - Soumettre

3. **Vérifiez les logs** :
   - Cherchez `📤 Breakdown media upload request:`
   - Si succès : `✅ Breakdown media uploaded successfully`
   - Si erreur : Message d'erreur spécifique

4. **Vérifiez les fichiers** :
```bash
ls server/uploads/breakdown-media/
# Devrait montrer les fichiers uploadés
```

---

## 💡 CONFIGURATION ACTUELLE

### Limites d'upload
```javascript
// server/routes/breakdownMedia.js
limits: {
  fileSize: 10 * 1024 * 1024,  // 10MB par fichier
  files: 5                      // 5 fichiers max
}
```

### Types de fichiers autorisés
```javascript
// Images
'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'

// Vidéos
'video/mp4', 'video/mpeg', 'video/quicktime'
```

### Extensions autorisées
```javascript
.jpg, .jpeg, .png, .gif, .webp, .mp4, .mpeg, .mov
```

---

## ✅ VALIDATION FINALE

Pour confirmer que tout fonctionne :

1. ✅ Serveur démarre sans erreur
2. ✅ MongoDB connecté
3. ✅ Upload d'une image réussit
4. ✅ Fichier apparaît dans `uploads/breakdown-media/`
5. ✅ Données sauvegardées dans MongoDB
6. ✅ Pas de message "media upload failed"

**Si tous les points sont OK : Le problème est résolu !** 🎉
