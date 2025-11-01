# 🔍 DIAGNOSTIC IMMÉDIAT - Upload Media Failed

## 📋 ÉTAPES DE DIAGNOSTIC

### 1. Ouvrez la Console du Navigateur (F12)

Quand vous voyez "Partially Updated - Status changed but media upload failed" :

1. **Ouvrez la console** (F12 → Console)
2. **Cherchez les logs** :
   ```
   ❌ Error uploading media: [...]
   Error details: { message: ..., response: ..., status: ... }
   ```

3. **Notez** :
   - Le message d'erreur
   - Le status HTTP (400, 401, 500, etc.)
   - La réponse du serveur

### 2. Vérifiez l'Onglet Network

1. **Ouvrez Network** (F12 → Network)
2. **Reproduisez l'erreur**
3. **Cherchez la requête** `breakdown-media`
4. **Cliquez dessus** et regardez :
   - **Status** : Code HTTP
   - **Response** : Message d'erreur du serveur
   - **Request Payload** : Données envoyées

### 3. Vérifiez les Logs du Serveur

Dans le terminal où tourne le serveur, cherchez :

```
📤 Breakdown media upload request: { ... }
```

**Si vous voyez ça** : La requête arrive au serveur ✅

**Si vous ne voyez PAS ça** : La requête n'arrive pas au serveur ❌

---

## 🐛 ERREURS COURANTES ET SOLUTIONS

### Erreur 1 : "Equipment ID, breakdown type, and description are required"

**Cause** : Champs manquants dans la requête

**Solution** :
- Vérifiez que `breakdownType` est bien sélectionné
- Vérifiez que `breakdownDescription` est rempli
- Vérifiez que `equipmentId` est valide

**Code à vérifier** :
```typescript
// Dans Equipment.tsx ou ProductionLines.tsx
console.log('Upload params:', {
  equipmentId: editingItem._id,
  breakdownType,
  breakdownDescription,
  filesCount: breakdownMedia.length
})
```

### Erreur 2 : "File too large. Maximum size is 10MB per file."

**Cause** : Un ou plusieurs fichiers > 10MB

**Solution** :
- Réduire la taille des images
- Compresser les vidéos
- Ou augmenter la limite dans `.env` :
  ```env
  MAX_FILE_SIZE=20971520  # 20MB
  ```

### Erreur 3 : "Too many files. Maximum is 5 files per upload."

**Cause** : Plus de 5 fichiers sélectionnés

**Solution** :
- Sélectionner maximum 5 fichiers
- Ou augmenter la limite dans le code

### Erreur 4 : "Invalid file type. Allowed types: images and videos only"

**Cause** : Type de fichier non autorisé

**Solution** :
- Utiliser uniquement :
  - Images : `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
  - Vidéos : `.mp4`, `.mpeg`, `.mov`

### Erreur 5 : 401 Unauthorized

**Cause** : Token JWT manquant ou expiré

**Solution** :
- Se déconnecter et reconnecter
- Vérifier que le token est bien envoyé dans les headers

### Erreur 6 : 500 Internal Server Error

**Cause** : Erreur serveur (MongoDB, filesystem, etc.)

**Solution** :
- Vérifier les logs du serveur
- Vérifier que MongoDB est connecté
- Vérifier que le dossier `uploads/breakdown-media/` existe

---

## 🧪 TEST RAPIDE

### Test 1 : Vérifier que le serveur reçoit la requête

Ajoutez ce log temporaire dans `Equipment.tsx` :

```typescript
// Avant await uploadBreakdownMedia(...)
console.log('🚀 About to upload:', {
  equipmentId: editingItem._id,
  breakdownType,
  breakdownDescription,
  filesCount: breakdownMedia.length,
  files: breakdownMedia.map(f => ({ name: f.name, size: f.size, type: f.type }))
})
```

### Test 2 : Vérifier la réponse du serveur

Dans la console du navigateur, après l'erreur :

```javascript
// Copier-coller dans la console
localStorage.getItem('token')  // Vérifier le token
```

### Test 3 : Test manuel avec curl

```bash
# Récupérer le token depuis localStorage
# Puis tester :

curl -X POST http://localhost:3000/api/breakdown-media \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -F "equipmentId=EQUIPMENT_ID" \
  -F "breakdownType=electrical" \
  -F "description=Test" \
  -F "files=@test.jpg"
```

---

## 📊 CHECKLIST DE VÉRIFICATION

Avant de tester à nouveau :

- [ ] Serveur redémarré avec les nouveaux logs
- [ ] Console du navigateur ouverte (F12)
- [ ] Network tab ouvert
- [ ] Fichiers < 10MB chacun
- [ ] Maximum 5 fichiers
- [ ] Types de fichiers valides (images/vidéos)
- [ ] `breakdownType` sélectionné
- [ ] `breakdownDescription` rempli
- [ ] Connecté avec un compte valide

---

## 🎯 ACTIONS IMMÉDIATES

### Action 1 : Activer les logs détaillés

Les logs sont maintenant activés dans :
- ✅ `Equipment.tsx` - Logs d'erreur détaillés
- ✅ `ProductionLines.tsx` - Logs d'erreur détaillés
- ✅ `breakdownMedia.js` - Logs serveur

### Action 2 : Reproduire l'erreur

1. Rafraîchir la page (F5)
2. Ouvrir la console (F12)
3. Essayer de créer une panne avec média
4. **Noter exactement ce qui apparaît dans la console**

### Action 3 : Partager les logs

Copiez et partagez :
1. **Console du navigateur** : Tous les messages d'erreur
2. **Network → breakdown-media → Response** : La réponse du serveur
3. **Logs du serveur** : Ce qui apparaît dans le terminal

---

## 💡 INFORMATIONS UTILES

### Format de la requête attendue

```
POST /api/breakdown-media
Headers:
  Authorization: Bearer <token>
  Content-Type: multipart/form-data

Body (FormData):
  equipmentId: string
  breakdownType: string (electrical, mechanical, etc.)
  description: string
  files: File[] (max 5, max 10MB each)
```

### Réponse de succès attendue

```json
{
  "message": "Breakdown media uploaded successfully",
  "breakdownMedia": {
    "_id": "...",
    "equipment": "...",
    "breakdownType": "electrical",
    "description": "...",
    "files": [...]
  }
}
```

### Réponse d'erreur attendue

```json
{
  "error": "Description de l'erreur"
}
```

---

## 🚀 PROCHAINE ÉTAPE

**Reproduisez l'erreur** et partagez :

1. **Message exact de la console** (copier-coller)
2. **Status HTTP** (Network tab)
3. **Réponse du serveur** (Network tab → Response)
4. **Logs du serveur** (terminal)

Avec ces informations, on pourra identifier le problème exact ! 🎯
