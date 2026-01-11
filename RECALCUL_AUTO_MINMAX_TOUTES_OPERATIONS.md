# 🔄 Recalcul Automatique Min/Max - Toutes Opérations

**Date**: 1er Novembre 2025  
**Statut**: ✅ IMPLÉMENTÉ

---

## 🎯 Objectif

Le stock min/max d'une pièce doit être **automatiquement recalculé** à chaque fois qu'une association équipement-pièce est :
- ✅ **Créée**
- ✅ **Modifiée**
- ✅ **Supprimée**
- ✅ **Dupliquée**

---

## 💡 Logique

### Principe

Le stock min/max d'une pièce dépend de **TOUTES** ses associations avec les équipements :

```javascript
// Pour chaque association
annualConsumption = quantityPerMachine × replacementFrequencyPerYear

// Total pour la pièce
totalMinStock = Σ(reorderPoint de chaque association)
totalMaxStock = Σ(annualConsumption de chaque association)
```

### Exemple

```
Pièce: Courroie B123

Association 1 (Équipement #1):
- Quantité: 2, Fréquence: 4/an
- Consommation annuelle: 8
- Point de réappro: 10

Association 2 (Équipement #2):
- Quantité: 1, Fréquence: 2/an
- Consommation annuelle: 2
- Point de réappro: 5

Stock de la pièce:
- Min: 10 + 5 = 15
- Max: 8 + 2 = 10
```

---

## ✅ Opérations avec Recalcul Automatique

### 1. Création d'Association (POST)

**Route** : `POST /api/asset-parts`

**Quand** :
- Création d'une nouvelle association
- Duplication automatique sur équipements du même type

**Recalcul** :
```javascript
// Après création
const recalculatedMinMax = await AssetPartsService.recalculateMinMaxForPart(partId)

// Résultat
{
  minStock: 15,
  maxStock: 10
}
```

**Toast Frontend** :
```
✅ Créé
Association créée et dupliquée sur 9 équipement(s).
Min/Max recalculés: 100/500
```

---

### 2. Modification d'Association (PATCH)

**Route** : `PATCH /api/asset-parts/:id`

**Quand** :
- Modification de la quantité
- Modification de la fréquence
- Modification de la criticité
- Modification des délais

**Exemple** :
```
Avant modification:
- Quantité: 1, Fréquence: 2/an
- Min total: 20, Max total: 40

Modification:
- Quantité: 2, Fréquence: 4/an

Après modification:
- Min total: 30, Max total: 80
- ✅ Recalculé automatiquement
```

**Toast Frontend** :
```
✅ Modifié
Association modifiée avec succès.
Min/Max recalculés: 30/80
```

---

### 3. Suppression d'Association (DELETE)

**Route** : `DELETE /api/asset-parts/:id`

**Quand** :
- Suppression d'une association équipement-pièce

**Exemple** :
```
Avant suppression:
- 3 associations pour la pièce
- Min total: 30, Max total: 60

Suppression d'une association:
- 2 associations restantes
- Min total: 20, Max total: 40
- ✅ Recalculé automatiquement
```

**Toast Frontend** :
```
✅ Supprimé
Association supprimée.
Min/Max recalculés: 20/40
```

---

### 4. Duplication sur Nouveaux Équipements

**Route** : `POST /api/asset`

**Quand** :
- Création d'un nouvel équipement
- Duplication automatique des associations

**Exemple** :
```
Avant création:
- 10 équipements du type A
- Min: 100, Max: 500

Création équipement #11 (type A):
- Duplication de 5 pièces
- Min: 110, Max: 550
- ✅ Recalculé automatiquement pour chaque pièce
```

---

## 🔧 Implémentation Technique

### Backend - Service de Recalcul

**Fichier** : `server/services/assetPartsService.js`

```javascript
class AssetPartsService {
  static async recalculateMinMaxForPart(partId) {
    // 1. Récupérer TOUTES les associations pour cette pièce
    const associations = await AssetPart.find({ part: partId })
    
    if (associations.length === 0) {
      // Aucune association → min/max = 0
      await Part.findByIdAndUpdate(partId, {
        minStock: 0,
        maxStock: 0
      })
      return { minStock: 0, maxStock: 0 }
    }
    
    let totalMinStock = 0
    let totalMaxStock = 0
    
    // 2. Pour CHAQUE association
    for (const assoc of associations) {
      const annualConsumption = assoc.quantityPerMachine × assoc.replacementFrequencyPerYear
      const dailyConsumption = annualConsumption / 365
      const safetyStock = Math.ceil(dailyConsumption × leadTimeDays × safetyCoefficient)
      const reorderPoint = Math.ceil(safetyStock + dailyConsumption × leadTimeDays)
      
      totalMinStock += reorderPoint
      totalMaxStock += Math.ceil(annualConsumption)
    }
    
    // 3. Mettre à jour la pièce
    await Part.findByIdAndUpdate(partId, {
      minStock: totalMinStock,
      maxStock: totalMaxStock
    })
    
    return { minStock: totalMinStock, maxStock: totalMaxStock }
  }
}
```

---

### Backend - Routes avec Recalcul

#### POST /api/asset-parts

```javascript
router.post('/', async (req, res) => {
  // 1. Créer l'association
  const association = new AssetPart({...data})
  await association.save()
  
  // 2. Dupliquer si nécessaire
  if (duplicateToSameType) {
    await AssetPart.insertMany(duplications)
  }
  
  // 3. ✅ RECALCULER MIN/MAX
  const recalculatedMinMax = await AssetPartsService.recalculateMinMaxForPart(partId)
  
  return res.json({
    success: true,
    association,
    recalculatedMinMax
  })
})
```

#### PATCH /api/asset-parts/:id

```javascript
router.patch('/:id', async (req, res) => {
  // 1. Modifier l'association
  const association = await AssetPart.findByIdAndUpdate(id, updates)
  
  // 2. ✅ RECALCULER MIN/MAX
  const recalculatedMinMax = await AssetPartsService.recalculateMinMaxForPart(association.part._id)
  
  return res.json({
    success: true,
    association,
    recalculatedMinMax,
    message: `Association modifiée. Min/Max recalculés: ${recalculatedMinMax.minStock}/${recalculatedMinMax.maxStock}`
  })
})
```

#### DELETE /api/asset-parts/:id

```javascript
router.delete('/:id', async (req, res) => {
  // 1. Récupérer l'association (pour avoir le partId)
  const association = await AssetPart.findById(id)
  const partId = association.part
  
  // 2. Supprimer l'association
  await AssetPart.findByIdAndDelete(id)
  
  // 3. ✅ RECALCULER MIN/MAX
  const recalculatedMinMax = await AssetPartsService.recalculateMinMaxForPart(partId)
  
  return res.json({
    success: true,
    recalculatedMinMax,
    message: `Association supprimée. Min/Max recalculés: ${recalculatedMinMax.minStock}/${recalculatedMinMax.maxStock}`
  })
})
```

---

### Frontend - Affichage des Résultats

**Fichier** : `client/src/components/AssetPartFormDialog.tsx`

```typescript
// Modification
const result = await updateAssetPart(id, {...data})

const recalculatedMinMax = result.recalculatedMinMax
let description = 'Association modifiée avec succès.'

if (recalculatedMinMax) {
  description += ` Min/Max recalculés: ${recalculatedMinMax.minStock}/${recalculatedMinMax.maxStock}`
}

toast({
  title: 'Modifié',
  description
})
```

---

## 📊 Scénarios d'Utilisation

### Scénario 1: Augmentation de la Fréquence

```
Situation:
- Courroie B123 utilisée sur 5 machines
- Fréquence actuelle: 2/an
- Min: 50, Max: 100

Action:
- Modifier la fréquence à 4/an sur une machine

Résultat automatique:
- Min: 60 (+10)
- Max: 120 (+20)
- ✅ Toast: "Min/Max recalculés: 60/120"
```

### Scénario 2: Ajout d'un Équipement

```
Situation:
- 10 machines utilisent la Courroie B123
- Min: 100, Max: 200

Action:
- Créer machine #11 (même type)
- Duplication automatique

Résultat automatique:
- 11 machines ont la Courroie B123
- Min: 110, Max: 220
- ✅ Toast: "Équipement créé avec 5 pièce(s). Min/Max recalculés."
```

### Scénario 3: Suppression d'une Association

```
Situation:
- 5 machines utilisent le Filtre F456
- Min: 50, Max: 100

Action:
- Supprimer l'association sur machine #3

Résultat automatique:
- 4 machines utilisent le Filtre F456
- Min: 40, Max: 80
- ✅ Toast: "Association supprimée. Min/Max recalculés: 40/80"
```

---

## 🎯 Avantages

### 1. Cohérence Garantie

```
✅ Min/Max toujours à jour
✅ Pas de valeurs obsolètes
✅ Pas d'intervention manuelle nécessaire
```

### 2. Alertes Précises

```
Stock actuel: 45

Avant modification (Min: 50):
- Statut: 🟢 Normal

Après modification (Min: 60):
- Statut: 🟡 Bas
- ✅ Alerte déclenchée automatiquement
```

### 3. Prévisions Justes

```
Commande suggérée basée sur:
- Le vrai besoin de TOUS les équipements
- Les vraies fréquences actuelles
- Les vrais paramètres de sécurité
```

---

## 🧪 Tests

### Test 1: Modification de Quantité

```bash
1. Modifier une association:
   - Quantité: 1 → 2
2. Vérifier le toast:
   ✓ "Min/Max recalculés: XX/YYY"
3. Aller sur /inventory/[piece-id]
4. Vérifier:
   ✓ Min/Max ont augmenté
```

### Test 2: Suppression d'Association

```bash
1. Supprimer une association
2. Vérifier le toast:
   ✓ "Association supprimée. Min/Max recalculés: XX/YYY"
3. Vérifier:
   ✓ Min/Max ont diminué
```

### Test 3: Création avec Duplication

```bash
1. Créer association avec duplication
2. Vérifier le toast:
   ✓ "Association créée et dupliquée sur X équipement(s). Min/Max recalculés: XX/YYY"
3. Vérifier:
   ✓ Min/Max reflètent toutes les associations
```

---

## 📝 Résumé des Fichiers Modifiés

### Backend (2 fichiers)

1. **`server/services/assetPartsService.js`**
   - ✅ Fonction `recalculateMinMaxForPart()` (déjà existante)

2. **`server/routes/assetPartsRoutes.js`**
   - ✅ POST / : Recalcul après création
   - ✅ PATCH /:id : Recalcul après modification
   - ✅ DELETE /:id : Recalcul après suppression

### Frontend (1 fichier)

3. **`client/src/components/AssetPartFormDialog.tsx`**
   - ✅ Affichage du min/max après modification

---

## ✅ Checklist

- [x] Recalcul après création (POST)
- [x] Recalcul après modification (PATCH)
- [x] Recalcul après suppression (DELETE)
- [x] Recalcul après duplication (POST asset)
- [x] Affichage dans toast (création)
- [x] Affichage dans toast (modification)
- [x] Affichage dans toast (suppression)
- [ ] Test: Modification de quantité
- [ ] Test: Modification de fréquence
- [ ] Test: Suppression d'association
- [ ] Test: Création avec duplication

---

## 🎉 Résultat Final

```
✅ Création → Recalcul automatique
✅ Modification → Recalcul automatique
✅ Suppression → Recalcul automatique
✅ Duplication → Recalcul automatique
✅ Toast informatif avec nouvelles valeurs
✅ Cohérence garantie en permanence
✅ Zéro intervention manuelle
```

---

**Document créé le 1er Novembre 2025**  
**Recalcul automatique du min/max pour toutes les opérations**
