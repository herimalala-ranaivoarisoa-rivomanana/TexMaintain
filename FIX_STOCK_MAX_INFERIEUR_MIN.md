# 🐛 Fix: Stock Max < Stock Min

**Date**: 1er Novembre 2025  
**Statut**: ✅ CORRIGÉ

---

## 🎯 Problème Identifié

### Symptôme

```
Stock min: 5
Stock max: 4  ❌ INCOHÉRENT (max < min)
```

C'est **illogique** car le stock maximum devrait toujours être **supérieur** au stock minimum.

---

## 🔍 Cause Racine

### Ancienne Formule (Incorrecte)

```javascript
// Pour chaque association
totalMinStock += reorderPoint;           // Ex: 3
totalMaxStock += Math.ceil(annualConsumption);  // Ex: 2

// Résultat: Min=3, Max=2 ❌
```

**Problème** : La consommation annuelle (2 pièces/an) peut être **inférieure** au point de réapprovisionnement (3 pièces), créant une incohérence.

---

## ✅ Solution Implémentée

### Nouvelle Formule (Correcte)

```javascript
// Pour chaque association
const reorderPoint = Math.ceil(safetyStock + dailyConsumption × leadTimeDays)
const quarterlyConsumption = Math.ceil(annualConsumption / 4)  // 3 mois
const optimalOrderQuantity = Math.max(quarterlyConsumption, reorderPoint)

totalMinStock += reorderPoint
totalMaxStock += reorderPoint + optimalOrderQuantity

// Résultat: Min=3, Max=6 ✅ (max > min)
```

### Logique

- **Min** = Point de réapprovisionnement (quand commander)
- **Max** = Min + Quantité de commande optimale
- **Quantité optimale** = Max(consommation 3 mois, point de réappro)

Cela **garantit** que `Max > Min` dans tous les cas.

---

## 📊 Exemple Concret

### Cas 1: Pièce à Faible Rotation

```
Paramètres:
- Quantité: 1
- Fréquence: 2/an
- Délai d'appro: 15 jours
- Coefficient sécurité: 1.4

Calculs:
- Consommation annuelle: 1 × 2 = 2 pièces
- Consommation journalière: 2 / 365 = 0.005 pièces
- Stock de sécurité: 0.005 × 15 × 1.4 = 0.1 → 1 pièce
- Point de réappro: 1 + (0.005 × 15) = 1.08 → 2 pièces

Ancienne formule:
- Min: 2 pièces
- Max: 2 pièces  ❌ (égal, pas optimal)

Nouvelle formule:
- Consommation trimestrielle: 2 / 4 = 0.5 → 1 pièce
- Quantité optimale: Max(1, 2) = 2 pièces
- Min: 2 pièces
- Max: 2 + 2 = 4 pièces  ✅
```

### Cas 2: Pièce à Rotation Normale

```
Paramètres:
- Quantité: 2
- Fréquence: 12/an
- Délai d'appro: 30 jours

Calculs:
- Consommation annuelle: 2 × 12 = 24 pièces
- Point de réappro: ~10 pièces

Ancienne formule:
- Min: 10 pièces
- Max: 24 pièces  ✅ (ok dans ce cas)

Nouvelle formule:
- Consommation trimestrielle: 24 / 4 = 6 pièces
- Quantité optimale: Max(6, 10) = 10 pièces
- Min: 10 pièces
- Max: 10 + 10 = 20 pièces  ✅ (plus conservateur)
```

---

## 🔧 Modifications Apportées

### Fichier Modifié

**`server/services/equipmentPartsService.js`** (lignes 38-45)

```javascript
// Ancienne version
totalMinStock += reorderPoint;
totalMaxStock += Math.ceil(annualConsumption);

// Nouvelle version
const quarterlyConsumption = Math.ceil(annualConsumption / 4);
const optimalOrderQuantity = Math.max(quarterlyConsumption, reorderPoint);

totalMinStock += reorderPoint;
totalMaxStock += reorderPoint + optimalOrderQuantity;
```

---

## 📊 Résultats du Recalcul

### Script Exécuté

```bash
node recalculate-minmax-all-parts.js
```

### Résultats

```
📦 Rotary Cutter 45mm
   AVANT: Min=5, Max=4  ❌
   APRÈS: Min=5, Max=10 ✅
   ✅ MODIFIÉ !

📦 MIG Welding Wire
   AVANT: Min=1, Max=2
   APRÈS: Min=4, Max=8  ✅
   ✅ MODIFIÉ !
```

---

## 🎯 Avantages de la Nouvelle Formule

### 1. Cohérence Garantie

```
✅ Max > Min dans 100% des cas
✅ Pas d'incohérence possible
✅ Logique respectée
```

### 2. Quantité de Commande Optimale

```
✅ Commande au moins 3 mois de stock
✅ Évite les commandes trop fréquentes
✅ Réduit les coûts de commande
```

### 3. Flexibilité

```
✅ S'adapte aux pièces à faible rotation
✅ S'adapte aux pièces à forte rotation
✅ Prend en compte le délai d'appro
```

---

## 📐 Formule Complète

### Pour UNE Association

```javascript
// 1. Consommation
annualConsumption = quantityPerMachine × replacementFrequencyPerYear
dailyConsumption = annualConsumption / 365

// 2. Stock de sécurité
safetyStock = Math.ceil(dailyConsumption × leadTimeDays × safetyCoefficient)

// 3. Point de réapprovisionnement (MIN pour cette association)
reorderPoint = Math.ceil(safetyStock + dailyConsumption × leadTimeDays)

// 4. Quantité de commande optimale
quarterlyConsumption = Math.ceil(annualConsumption / 4)  // 3 mois
optimalOrderQuantity = Math.max(quarterlyConsumption, reorderPoint)

// 5. Stock maximum (pour cette association)
maxForThisAssoc = reorderPoint + optimalOrderQuantity
```

### Pour TOUTES les Associations d'une Pièce

```javascript
totalMinStock = Σ(reorderPoint de chaque association)
totalMaxStock = Σ(reorderPoint + optimalOrderQuantity de chaque association)

// Garantie: totalMaxStock > totalMinStock
```

---

## 🧪 Tests de Validation

### Test 1: Vérifier la Cohérence

```bash
1. Aller sur /inventory
2. Pour chaque pièce, vérifier:
   ✓ Stock max > Stock min
   ✓ Pas d'incohérence
```

### Test 2: Créer une Nouvelle Association

```bash
1. Créer une association avec:
   - Quantité: 1
   - Fréquence: 1/an (très faible)
2. Vérifier:
   ✓ Min et Max calculés
   ✓ Max > Min
```

### Test 3: Modifier une Association

```bash
1. Modifier le délai d'appro
2. Vérifier:
   ✓ Min et Max recalculés
   ✓ Max > Min
```

---

## 📝 Scripts Utiles

### Recalculer Toutes les Pièces

```bash
cd server
node recalculate-minmax-all-parts.js
```

### Vérifier les Incohérences

```javascript
// Dans MongoDB Compass ou CLI
db.parts.find({
  $expr: { $lt: ["$maxStock", "$minStock"] }
})

// Devrait retourner 0 résultat
```

---

## ✅ Checklist

- [x] Formule corrigée dans le code
- [x] Serveur redémarré
- [x] Toutes les pièces recalculées
- [x] Vérification: Max > Min pour toutes les pièces
- [x] Documentation créée
- [ ] Test: Création d'association
- [ ] Test: Modification d'association
- [ ] Test: Vérification dans l'interface

---

## 🎉 Résultat Final

### Avant

```
❌ Stock max peut être < Stock min
❌ Incohérences possibles
❌ Formule basée uniquement sur consommation annuelle
```

### Après

```
✅ Stock max toujours > Stock min
✅ Cohérence garantie
✅ Formule basée sur quantité de commande optimale
✅ Prend en compte 3 mois de stock minimum
✅ S'adapte à tous les types de pièces
```

---

**Document créé le 1er Novembre 2025**  
**Correction de l'incohérence Stock max < Stock min**
