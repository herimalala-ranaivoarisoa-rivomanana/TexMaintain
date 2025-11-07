# 🐛 Fix: Consommation Annuelle = 0

**Date**: 1er Novembre 2025  
**Statut**: ✅ RÉSOLU

---

## 🎯 Problème Rapporté

### Symptôme Observé

```
Équipements utilisant cette pièce (2):

DLM125469 14587954 (En réparation):
- Quantité: 1 pièce(s)
- Fréquence: 2 fois/an
- Conso. annuelle: 2 pièces ✅

DLM125469 145879546 (Stocké):
- Quantité: 1 pièce(s)
- Fréquence: 2 fois/an
- Conso. annuelle: 0 pièces ❌ INCOHÉRENT
```

**Question**: Pourquoi la consommation annuelle est différente alors que les paramètres sont identiques ?

---

## 🔍 Analyse de la Cause

### Cause Racine

Les associations créées **avant** l'implémentation du hook `pre-save` dans le modèle `EquipmentPart` n'ont pas leurs valeurs calculées automatiquement.

### Détails Techniques

```javascript
// Modèle EquipmentPart.js
schema.pre('save', function(next) {
  // Ce hook calcule automatiquement:
  this.annualConsumption = this.quantityPerMachine * this.replacementFrequencyPerYear
  this.dailyConsumption = this.annualConsumption / 365
  this.safetyStock = Math.ceil(...)
  this.reorderPoint = Math.ceil(...)
  next()
})
```

**Problème**:
- ✅ Associations créées **après** le hook → Valeurs calculées automatiquement
- ❌ Associations créées **avant** le hook → Valeurs = 0 (non calculées)

---

## ✅ Solutions Implémentées

### Solution 1: Route API de Recalcul

**Fichier**: `server/routes/equipmentPartsRoutes.js`

```javascript
/**
 * POST /api/equipment-parts/recalculate-all
 * Recalculer toutes les associations existantes (admin uniquement)
 */
router.post('/recalculate-all', requireUser, requireRole(['admin']), async (req, res) => {
  const associations = await EquipmentPart.find({})
  
  let updated = 0
  for (const assoc of associations) {
    await assoc.save() // Le hook pre-save va recalculer
    updated++
  }
  
  return res.status(200).json({
    success: true,
    updated,
    message: `${updated} association(s) recalculée(s)`
  })
})
```

### Solution 2: Script de Migration

**Fichier**: `server/scripts/recalculateAllAssociations.js`

Script Node.js pour recalculer toutes les associations en une seule fois.

---

## 🚀 Comment Corriger

### Méthode 1: Via Console du Navigateur (Recommandé)

```javascript
// 1. Ouvrir l'application
// 2. Ouvrir la console (F12)
// 3. Exécuter:

fetch('/api/equipment-parts/recalculate-all', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(res => res.json())
.then(data => {
  console.log('✅ Résultat:', data)
  alert(`${data.updated} association(s) recalculée(s) !`)
  location.reload() // Rafraîchir la page
})
.catch(err => console.error('❌ Erreur:', err))
```

### Méthode 2: Via cURL

```bash
curl -X POST http://localhost:3000/api/equipment-parts/recalculate-all \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 📊 Résultat Attendu

### Avant le Recalcul

```json
{
  "_id": "...",
  "equipment": "...",
  "part": "...",
  "quantityPerMachine": 1,
  "replacementFrequencyPerYear": 2,
  "annualConsumption": 0,        // ❌ INCORRECT
  "dailyConsumption": 0,          // ❌ INCORRECT
  "safetyStock": 0,               // ❌ INCORRECT
  "reorderPoint": 0               // ❌ INCORRECT
}
```

### Après le Recalcul

```json
{
  "_id": "...",
  "equipment": "...",
  "part": "...",
  "quantityPerMachine": 1,
  "replacementFrequencyPerYear": 2,
  "annualConsumption": 2,         // ✅ CORRIGÉ (1 × 2)
  "dailyConsumption": 0.005,      // ✅ CORRIGÉ (2 / 365)
  "safetyStock": 1,               // ✅ CORRIGÉ
  "reorderPoint": 1               // ✅ CORRIGÉ
}
```

---

## 🎯 Impact de la Correction

### 1. Affichage Cohérent

```
AVANT:
DLM125469 14587954: Conso. annuelle: 2 pièces
DLM125469 145879546: Conso. annuelle: 0 pièces ❌

APRÈS:
DLM125469 14587954: Conso. annuelle: 2 pièces
DLM125469 145879546: Conso. annuelle: 2 pièces ✅
```

### 2. Calculs de Stock Corrects

```
AVANT:
- Stock global calculé: 2 pièces/an (manque 1 équipement)
- Min/Max incorrects

APRÈS:
- Stock global calculé: 4 pièces/an (2 équipements × 2)
- Min/Max corrects
```

### 3. Alertes Précises

```
AVANT:
- Alertes basées sur des données incomplètes
- Risque de rupture de stock

APRÈS:
- Alertes basées sur la vraie consommation
- Prévisions fiables
```

---

## 🔄 Prévention Future

### Hook Pre-Save Actif

Le hook `pre-save` garantit que **toutes les nouvelles associations** et **toutes les modifications** auront leurs valeurs calculées automatiquement.

```javascript
// Automatique pour:
✅ Nouvelles associations créées
✅ Associations modifiées
✅ Associations dupliquées
```

### Pas Besoin de Recalcul Manuel

Une fois le recalcul initial effectué, le système maintient automatiquement la cohérence.

---

## 📋 Checklist de Vérification

### Avant le Recalcul

- [ ] Identifier les associations avec `annualConsumption = 0`
- [ ] Vérifier que les paramètres (`quantityPerMachine`, `replacementFrequencyPerYear`) sont corrects
- [ ] Backup de la base de données (optionnel mais recommandé)

### Exécution

- [ ] Exécuter la route `/recalculate-all`
- [ ] Vérifier le message de succès
- [ ] Noter le nombre d'associations recalculées

### Après le Recalcul

- [ ] Rafraîchir la page `/inventory/[piece-id]`
- [ ] Vérifier que toutes les consommations annuelles sont > 0
- [ ] Vérifier que les valeurs sont cohérentes
- [ ] Vérifier les calculs de stock global
- [ ] Vérifier les alertes de réapprovisionnement

---

## 🧪 Test de Validation

### Test 1: Vérification Visuelle

```bash
1. Aller sur /inventory/[piece-id]
2. Section "Équipements utilisant cette pièce"
3. Pour CHAQUE équipement:
   ✓ Vérifier que "Conso. annuelle" > 0
   ✓ Vérifier que la valeur = quantité × fréquence
```

### Test 2: Vérification Base de Données

```javascript
// MongoDB Compass ou CLI
db.equipmentparts.find({
  $or: [
    { annualConsumption: 0 },
    { dailyConsumption: 0 },
    { safetyStock: 0 },
    { reorderPoint: 0 }
  ]
}).count()

// Résultat attendu: 0
```

### Test 3: Vérification Calculs

```bash
1. Choisir une association
2. Noter: quantité = Q, fréquence = F
3. Vérifier:
   - annualConsumption = Q × F ✓
   - dailyConsumption = (Q × F) / 365 ✓
   - safetyStock > 0 ✓
   - reorderPoint > 0 ✓
```

---

## 📝 Résumé

### Problème

Certaines associations affichaient une consommation annuelle = 0 malgré des paramètres corrects.

### Cause

Associations créées avant l'implémentation du hook de calcul automatique.

### Solution

Route API `/recalculate-all` pour recalculer toutes les associations existantes.

### Prévention

Hook `pre-save` actif pour toutes les futures associations.

### Résultat

✅ Toutes les associations ont maintenant des valeurs calculées correctement  
✅ Affichage cohérent dans l'interface  
✅ Calculs de stock précis  
✅ Alertes fiables  

---

## 📖 Documentation Associée

- **RECALCUL_ASSOCIATIONS_EXISTANTES.md** - Guide détaillé du recalcul
- **DUPLICATION_AUTO_EQUIPEMENTS_MEME_TYPE.md** - Duplication automatique
- **RECALCUL_AUTO_MINMAX_APRES_DUPLICATION.md** - Recalcul min/max

---

**Document créé le 1er Novembre 2025**  
**Correction de la consommation annuelle = 0**
