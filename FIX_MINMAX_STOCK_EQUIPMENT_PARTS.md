# 🔧 FIX - Min/Max Stock dans Equipment Parts

**Date**: 1er Novembre 2025  
**Statut**: ✅ CORRIGÉ

---

## 🐛 PROBLÈME IDENTIFIÉ

Les valeurs `minStock` et `maxStock` n'étaient pas retournées par l'API dans les routes equipment-parts, donc elles n'étaient pas disponibles dans le frontend pour afficher le statut du stock correctement.

### Symptômes
- `part.part.minStock` était `undefined`
- `part.part.maxStock` était `undefined`
- Le calcul du statut du stock ne fonctionnait pas correctement
- Les valeurs affichées étaient `0` au lieu des vraies valeurs de l'inventaire

---

## ✅ SOLUTION APPLIQUÉE

### Principe
Les valeurs `minStock` et `maxStock` doivent être les **mêmes** que celles de l'inventaire car elles proviennent du même objet `Part` dans la base de données. Il suffit de les inclure dans le `populate()` de l'API.

---

## 🔧 MODIFICATIONS EFFECTUÉES

### 1. Backend - Route par Équipement

**Fichier**: `server/routes/equipmentPartsRoutes.js` (ligne 85)

```javascript
// ❌ AVANT
.populate('part', 'name partNumber category type currentStock unitPrice supplier')

// ✅ APRÈS
.populate('part', 'name partNumber category type currentStock minStock maxStock unitPrice supplier')
//                                                             ^^^^^^^^ ^^^^^^^^
//                                                             Ajouté !
```

### 2. Backend - Route Principale

**Fichier**: `server/routes/equipmentPartsRoutes.js` (ligne 51)

```javascript
// ❌ AVANT
.populate('part', 'name partNumber category type currentStock')

// ✅ APRÈS
.populate('part', 'name partNumber category type currentStock minStock maxStock unitPrice supplier')
//                                                             ^^^^^^^^ ^^^^^^^^ ^^^^^^^^^ ^^^^^^^^
//                                                             Ajouté pour cohérence !
```

### 3. Frontend - Interface TypeScript

**Fichier**: `client/src/api/equipmentParts.ts` (lignes 16-27)

```typescript
// ❌ AVANT
part: {
  _id: string
  name: string
  partNumber: string
  category: string
  type: 'part' | 'consumable'
  currentStock: number
  unitPrice?: number
  supplier?: string
}

// ✅ APRÈS
part: {
  _id: string
  name: string
  partNumber: string
  category: string
  type: 'part' | 'consumable'
  currentStock: number
  minStock: number      // ✅ Ajouté
  maxStock: number      // ✅ Ajouté
  unitPrice?: number
  supplier?: string
}
```

---

## 📊 FLUX DE DONNÉES

### Avant le Fix
```
MongoDB (Part)
  ↓
  minStock: 10
  maxStock: 50
  ↓
API (populate sans minStock/maxStock)
  ↓
  part: { currentStock: 5 }  ❌ minStock et maxStock manquants
  ↓
Frontend
  ↓
  part.part.minStock = undefined  ❌
  part.part.maxStock = undefined  ❌
  ↓
Calcul du statut
  ↓
  getStockStatus(5, undefined, undefined)  ❌
  ↓
  Résultat incorrect
```

### Après le Fix
```
MongoDB (Part)
  ↓
  minStock: 10
  maxStock: 50
  currentStock: 5
  ↓
API (populate avec minStock/maxStock)
  ↓
  part: { 
    currentStock: 5,
    minStock: 10,     ✅
    maxStock: 50      ✅
  }
  ↓
Frontend
  ↓
  part.part.minStock = 10      ✅
  part.part.maxStock = 50      ✅
  part.part.currentStock = 5   ✅
  ↓
Calcul du statut
  ↓
  getStockStatus(5, 10, 50)    ✅
  ↓
  Résultat: "Critique" 🔴      ✅
```

---

## 🎯 COHÉRENCE DES DONNÉES

### Source Unique de Vérité
Les valeurs `minStock` et `maxStock` sont stockées **une seule fois** dans le modèle `Part` :

```javascript
// server/models/Part.js
const schema = new mongoose.Schema({
  name: String,
  partNumber: String,
  currentStock: { type: Number, default: 0 },
  minStock: { type: Number, default: 0 },      // ← Source unique
  maxStock: { type: Number, default: 0 },      // ← Source unique
  // ...
})
```

### Affichage Partout
Ces valeurs sont maintenant disponibles dans :

1. **`/inventory`** - Liste des pièces
   ```javascript
   part.minStock  // ✅ Direct depuis Part
   part.maxStock  // ✅ Direct depuis Part
   ```

2. **`/inventory/:id`** - Détails d'une pièce
   ```javascript
   part.minStock  // ✅ Direct depuis Part
   part.maxStock  // ✅ Direct depuis Part
   ```

3. **`/equipment/:id/parts`** - Pièces d'un équipement
   ```javascript
   association.part.minStock  // ✅ Via populate
   association.part.maxStock  // ✅ Via populate
   ```

4. **`/equipment/:id/consumable`** - Consommables d'un équipement
   ```javascript
   association.part.minStock  // ✅ Via populate
   association.part.maxStock  // ✅ Via populate
   ```

---

## 🧪 TESTS À EFFECTUER

### Test 1 : Vérifier l'API

**Méthode 1 - Avec curl** :
```bash
# Remplacer [EQUIPMENT_ID] par un ID valide
curl -X GET "http://localhost:3000/api/equipment-parts/equipment/[EQUIPMENT_ID]" \
  -H "Authorization: Bearer [YOUR_TOKEN]"
```

**Vérifier dans la réponse** :
```json
{
  "success": true,
  "associations": [
    {
      "_id": "...",
      "part": {
        "_id": "...",
        "name": "Courroie B123",
        "partNumber": "B123-XL",
        "category": "Transmission",
        "type": "part",
        "currentStock": 5,
        "minStock": 10,        // ✅ Doit être présent
        "maxStock": 50,        // ✅ Doit être présent
        "unitPrice": 25,
        "supplier": "Industrial Belts Ltd."
      }
    }
  ]
}
```

### Test 2 : Vérifier le Frontend

```bash
1. Redémarrer le serveur backend
   cd server && npm run dev

2. Vider le cache du navigateur
   F12 → Application → Clear storage

3. Aller sur /equipment/[id]/parts

4. Ouvrir la console (F12)

5. Observer les logs:
   📦 Response from API: {...}
   
6. Vérifier dans la réponse:
   associations[0].part.minStock = 10  ✅
   associations[0].part.maxStock = 50  ✅

7. Vérifier l'affichage:
   - Badge de statut correct (🔴 si stock < min)
   - Section "Stock min: 10" visible
   - Section "Stock max: 50" visible
```

### Test 3 : Vérifier le Calcul du Statut

```bash
# Scénario 1: Stock Critique
Données:
  currentStock: 3
  minStock: 10
  maxStock: 50

Résultat attendu:
  Badge: 🔴 Critique
  Calcul: 3 <= 10 * 0.5 → Critique ✅

# Scénario 2: Stock Bas
Données:
  currentStock: 8
  minStock: 10
  maxStock: 50

Résultat attendu:
  Badge: 🟠 Bas
  Calcul: 8 <= 10 → Bas ✅

# Scénario 3: Stock Normal
Données:
  currentStock: 25
  minStock: 10
  maxStock: 50

Résultat attendu:
  Badge: 🟢 Normal
  Calcul: 10 < 25 < 45 → Normal ✅

# Scénario 4: Stock Élevé
Données:
  currentStock: 48
  minStock: 10
  maxStock: 50

Résultat attendu:
  Badge: 🔵 Élevé
  Calcul: 48 >= 50 * 0.9 → Élevé ✅
```

---

## 🔄 POUR APPLIQUER LE FIX

### Étape 1 : Redémarrer le Backend
```bash
cd server
# Ctrl+C pour arrêter
npm run dev
```

**IMPORTANT** : Les modifications dans `equipmentPartsRoutes.js` nécessitent un redémarrage du serveur.

### Étape 2 : Vider le Cache
```bash
# Dans le navigateur
F12 → Application → Clear storage → Clear site data
# Ou
Ctrl+Shift+R (hard refresh)
```

### Étape 3 : Tester
```bash
1. Aller sur /equipment/[id]/parts
2. Vérifier que les valeurs s'affichent correctement
3. Vérifier que le badge de statut est correct
```

---

## 📊 RÉSUMÉ DES FICHIERS MODIFIÉS

### Backend (1 fichier)
1. ✅ `server/routes/equipmentPartsRoutes.js`
   - Ligne 51 : Ajout de `minStock maxStock unitPrice supplier` dans populate (route principale)
   - Ligne 85 : Ajout de `minStock maxStock` dans populate (route par équipement)

### Frontend (1 fichier)
2. ✅ `client/src/api/equipmentParts.ts`
   - Lignes 23-24 : Ajout de `minStock: number` et `maxStock: number` dans l'interface

### Total : 2 fichiers modifiés

---

## ✅ CHECKLIST DE VÉRIFICATION

Avant de considérer le fix comme complet :

- [x] Backend : `minStock` ajouté dans populate (ligne 85)
- [x] Backend : `maxStock` ajouté dans populate (ligne 85)
- [x] Backend : Champs ajoutés aussi dans route principale (ligne 51)
- [x] Frontend : Interface TypeScript mise à jour
- [ ] Serveur backend redémarré
- [ ] Cache navigateur vidé
- [ ] API testée (curl ou Postman)
- [ ] Frontend testé (valeurs affichées)
- [ ] Calcul du statut vérifié
- [ ] Badge de statut correct

---

## 🎯 RÉSULTAT ATTENDU

### Avant le Fix
```
/equipment/123/parts

┌────────────────────────────────────┐
│ Courroie B123                      │
│ 🟢 Normal  Stock: 5                │  ❌ Mauvais statut
│                                    │
│ Stock: 5  │ Min: 0  │ Max: 0     │  ❌ Valeurs incorrectes
└────────────────────────────────────┘
```

### Après le Fix
```
/equipment/123/parts

┌────────────────────────────────────┐
│ Courroie B123                      │
│ 🔴 Critique  Stock: 5  [Commander] │  ✅ Bon statut
│                                    │
│ Stock: 5  │ Min: 10  │ Max: 50   │  ✅ Valeurs correctes
└────────────────────────────────────┘
```

---

## 💡 NOTES IMPORTANTES

### 1. Source Unique de Vérité
Les valeurs `minStock` et `maxStock` sont stockées **uniquement** dans le modèle `Part`. Elles ne sont **jamais** dupliquées dans `EquipmentPart`.

### 2. Calcul Automatique
Ces valeurs peuvent être calculées automatiquement via :
```javascript
POST /api/inventory/:id/calculate-min-max
```

Cette route utilise les associations `EquipmentPart` pour calculer les valeurs optimales et les enregistre dans `Part`.

### 3. Cohérence Garantie
Comme il n'y a qu'une seule source, les valeurs sont **toujours cohérentes** partout dans l'application :
- `/inventory` affiche les mêmes valeurs
- `/inventory/:id` affiche les mêmes valeurs
- `/equipment/:id/parts` affiche les mêmes valeurs
- `/equipment/:id/consumable` affiche les mêmes valeurs

---

## 🚨 SI LE PROBLÈME PERSISTE

### Diagnostic 1 : Vérifier la Base de Données
```javascript
// Dans MongoDB
db.parts.findOne({ _id: ObjectId("[PART_ID]") })

// Vérifier que minStock et maxStock existent
{
  _id: ...,
  name: "Courroie B123",
  minStock: 10,     // ← Doit exister
  maxStock: 50,     // ← Doit exister
  currentStock: 5
}
```

### Diagnostic 2 : Vérifier l'API
```bash
# Tester directement l'API
curl http://localhost:3000/api/equipment-parts/equipment/[ID] \
  -H "Authorization: Bearer [token]" | jq '.associations[0].part'

# Vérifier que minStock et maxStock sont présents
{
  "_id": "...",
  "name": "...",
  "minStock": 10,    # ← Doit être présent
  "maxStock": 50,    # ← Doit être présent
  "currentStock": 5
}
```

### Diagnostic 3 : Vérifier le Frontend
```javascript
// Dans la console du navigateur
// Sur /equipment/[id]/parts

// Observer les logs
console.log('Part data:', parts[0].part)

// Vérifier
{
  minStock: 10,    // ← Doit être présent
  maxStock: 50,    // ← Doit être présent
  currentStock: 5
}
```

---

**Document créé le 1er Novembre 2025**  
**Fix critique pour l'affichage correct du statut de stock**
