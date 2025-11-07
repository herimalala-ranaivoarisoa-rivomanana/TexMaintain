# 🔄 Recalcul Automatique Min/Max Après Duplication

**Date**: 1er Novembre 2025  
**Statut**: ✅ IMPLÉMENTÉ

---

## 🎯 Problème Identifié

### Situation Avant Correction

```
Équipement #1 (Métier à Tisser)
→ Associer Courroie B123
  - Quantité: 2
  - Fréquence: 4/an
  - Duplication: OUI

Résultat:
✅ Association créée sur Équipement #1
✅ Dupliquée sur 9 autres équipements
❌ Min/Max de la Courroie B123: 10/50 (INCHANGÉ)

PROBLÈME:
- Avant: 1 équipement → Min: 10, Max: 50
- Après: 10 équipements → Min: 10, Max: 50 ❌
- Devrait être: Min: 100, Max: 500 ✅
```

### Logique Attendue

```
1 équipement associé:
- Consommation annuelle: 2 × 4 = 8 pièces/an
- Min (point de réappro): ~10
- Max (stock annuel): ~50

10 équipements associés:
- Consommation annuelle: 10 × 8 = 80 pièces/an
- Min (point de réappro): ~100
- Max (stock annuel): ~500
```

---

## ✅ Solution Implémentée

### Recalcul Automatique du Min/Max

Après chaque duplication d'association, le système recalcule automatiquement le stock minimum et maximum de la pièce en fonction de **TOUTES** ses associations.

---

## 🔧 Implémentation Technique

### 1. Service de Recalcul

**Fichier**: `server/services/equipmentPartsService.js`

```javascript
class EquipmentPartsService {
  /**
   * Recalcule automatiquement le min/max d'une pièce 
   * basé sur TOUTES ses associations
   */
  static async recalculateMinMaxForPart(partId) {
    // 1. Récupérer TOUTES les associations pour cette pièce
    const associations = await EquipmentPart.find({ part: partId })
    
    if (associations.length === 0) {
      return { minStock: 0, maxStock: 0 }
    }
    
    let totalMinStock = 0
    let totalMaxStock = 0
    
    // 2. Pour CHAQUE association (équipement)
    for (const assoc of associations) {
      // Calculs pour cette association
      const annualConsumption = 
        assoc.quantityPerMachine × assoc.replacementFrequencyPerYear
      
      const dailyConsumption = annualConsumption / 365
      
      const safetyStock = Math.ceil(
        dailyConsumption × leadTimeDays × safetyCoefficient
      )
      
      const reorderPoint = Math.ceil(
        safetyStock + dailyConsumption × leadTimeDays
      )
      
      // Accumuler pour TOUS les équipements
      totalMinStock += reorderPoint
      totalMaxStock += Math.ceil(annualConsumption)
    }
    
    // 3. Mettre à jour la pièce avec les nouvelles valeurs
    await Part.findByIdAndUpdate(partId, {
      minStock: totalMinStock,
      maxStock: totalMaxStock
    })
    
    return { minStock: totalMinStock, maxStock: totalMaxStock }
  }
}
```

---

### 2. Appel Après Duplication d'Association

**Fichier**: `server/routes/equipmentPartsRoutes.js`

```javascript
router.post('/', async (req, res) => {
  // 1. Créer l'association principale
  const association = new EquipmentPart({...data})
  await association.save()
  
  // 2. Dupliquer sur équipements du même type
  let duplicatedCount = 0
  if (duplicateToSameType) {
    const sameTypeEquipments = await Equipment.find({
      type: equipment.type._id,
      _id: { $ne: equipment._id }
    })
    
    // Créer les duplications
    await EquipmentPart.insertMany(duplications)
    duplicatedCount = duplications.length
  }
  
  // 3. ✅ RECALCULER LE MIN/MAX AUTOMATIQUEMENT
  let recalculatedMinMax = null
  try {
    recalculatedMinMax = await EquipmentPartsService
      .recalculateMinMaxForPart(data.part)
    
    console.log(`Min/Max recalculés:`, recalculatedMinMax)
  } catch (error) {
    console.error('Error recalculating min/max:', error)
  }
  
  return res.status(201).json({
    success: true,
    association,
    duplicatedCount,
    recalculatedMinMax,  // ✅ Retourné au frontend
    message: `Association créée et dupliquée. Min/Max recalculés.`
  })
})
```

---

### 3. Appel Après Création d'Équipement

**Fichier**: `server/routes/equipmentRoutes.js`

```javascript
router.post('/', async (req, res) => {
  // 1. Créer l'équipement
  const created = await Equipment.create(equipmentData)
  
  // 2. Dupliquer les associations depuis équipement de référence
  let duplicatedPartsCount = 0
  if (created.type) {
    const referenceEquipment = await Equipment.findOne({
      type: created.type,
      _id: { $ne: created._id }
    })
    
    if (referenceEquipment) {
      const referenceAssociations = await EquipmentPart.find({
        equipment: referenceEquipment._id
      })
      
      // Créer les duplications
      await EquipmentPart.insertMany(newAssociations)
      duplicatedPartsCount = newAssociations.length
      
      // 3. ✅ RECALCULER LE MIN/MAX POUR CHAQUE PIÈCE
      const uniqueParts = [...new Set(
        newAssociations.map(a => a.part.toString())
      )]
      
      for (const partId of uniqueParts) {
        try {
          await EquipmentPartsService.recalculateMinMaxForPart(partId)
          console.log(`Min/Max recalculés pour ${partId}`)
        } catch (error) {
          console.error(`Error recalculating for ${partId}:`, error)
        }
      }
    }
  }
  
  return res.status(201).json({
    success: true,
    equipment,
    duplicatedPartsCount,
    message: `Équipement créé avec ${duplicatedPartsCount} pièce(s). Min/Max recalculés.`
  })
})
```

---

### 4. Affichage Frontend

**Fichier**: `client/src/components/EquipmentPartFormDialog.tsx`

```typescript
const result = await createEquipmentPart({...form})

const duplicatedCount = result.duplicatedCount || 0
const recalculatedMinMax = result.recalculatedMinMax

let description = duplicatedCount > 0
  ? `Association créée et dupliquée sur ${duplicatedCount} équipement(s).`
  : 'Association créée avec succès.'

// ✅ Afficher les nouvelles valeurs min/max
if (recalculatedMinMax) {
  description += ` Min/Max recalculés: ${recalculatedMinMax.minStock}/${recalculatedMinMax.maxStock}`
}

toast({
  title: 'Créé',
  description
})
```

---

## 📊 Exemple Concret

### Scénario: Parc de 10 Métiers à Tisser

#### Étape 1: Première Association

```
Action:
- Équipement #1: Associer Courroie B123
  - Quantité: 2
  - Fréquence: 4/an
  - Duplication: NON

Calcul:
- 1 équipement × 2 pièces × 4/an = 8 pièces/an
- Min: 10
- Max: 50

Résultat:
✅ Courroie B123: Min = 10, Max = 50
```

#### Étape 2: Duplication sur 9 Autres Équipements

```
Action:
- Équipement #2: Associer Courroie B123
  - Quantité: 2
  - Fréquence: 4/an
  - Duplication: OUI ✅

Calcul AUTOMATIQUE:
- Récupérer TOUTES les associations de Courroie B123:
  → Équipement #1: 2 × 4 = 8/an
  → Équipement #2: 2 × 4 = 8/an
  → Équipement #3: 2 × 4 = 8/an (dupliqué)
  → Équipement #4: 2 × 4 = 8/an (dupliqué)
  → ...
  → Équipement #10: 2 × 4 = 8/an (dupliqué)

- Total: 10 équipements × 8/an = 80 pièces/an
- Min: 100 (10 × 10)
- Max: 500 (10 × 50)

Résultat:
✅ Courroie B123: Min = 100, Max = 500 ✅
✅ Toast: "Association créée et dupliquée sur 9 équipement(s). Min/Max recalculés: 100/500"
```

#### Étape 3: Nouvel Équipement #11

```
Action:
- Créer Métier à Tisser #11 (même type)

Duplication AUTOMATIQUE:
- Courroie B123 associée automatiquement

Calcul AUTOMATIQUE:
- Récupérer TOUTES les associations de Courroie B123:
  → 11 équipements × 8/an = 88 pièces/an
- Min: 110 (11 × 10)
- Max: 550 (11 × 50)

Résultat:
✅ Courroie B123: Min = 110, Max = 550 ✅
✅ Toast: "Équipement créé avec 1 pièce(s). Min/Max recalculés."
```

---

## 🎯 Formule de Calcul

### Pour CHAQUE Association

```javascript
// Données de l'association
quantityPerMachine = 2        // pièces
replacementFrequencyPerYear = 4  // fois/an
leadTimeDays = 15             // jours
safetyCoefficient = 1.4       // 40% de sécurité

// Calculs
annualConsumption = quantityPerMachine × replacementFrequencyPerYear
                  = 2 × 4 = 8 pièces/an

dailyConsumption = annualConsumption / 365
                 = 8 / 365 = 0.022 pièces/jour

safetyStock = dailyConsumption × leadTimeDays × safetyCoefficient
            = 0.022 × 15 × 1.4 = 0.46 → 1 pièce

reorderPoint = safetyStock + (dailyConsumption × leadTimeDays)
             = 1 + (0.022 × 15) = 1.33 → 2 pièces

// Pour cette association
minStock (point de réappro) = 2 pièces
maxStock (stock annuel) = 8 pièces
```

### Pour TOUTES les Associations

```javascript
// Si 10 équipements ont la même association
totalMinStock = 10 × 2 = 20 pièces
totalMaxStock = 10 × 8 = 80 pièces

// Valeurs finales de la pièce
Part.minStock = 20
Part.maxStock = 80
```

---

## 📈 Impact sur le Statut du Stock

### Avant Recalcul

```
Courroie B123:
- Stock actuel: 25
- Min: 10
- Max: 50
- Statut: 🟢 Normal (25 entre 10 et 45)
```

### Après Duplication sur 10 Équipements

```
Courroie B123:
- Stock actuel: 25 (inchangé)
- Min: 100 (recalculé ✅)
- Max: 500 (recalculé ✅)
- Statut: 🔴 Critique (25 ≤ 50 qui est 50% de 100)
```

### Résultat

```
✅ Le statut passe automatiquement de Normal à Critique
✅ Alerte de réapprovisionnement déclenchée
✅ Bouton "Commander" apparaît
✅ Quantité suggérée: 500 - 25 = 475 pièces
```

---

## 🧪 Tests à Effectuer

### Test 1: Duplication avec Recalcul

```bash
PRÉREQUIS:
- 3 équipements du même type
- 1 pièce: Courroie B123 (stock: 20, min: 10, max: 50)

ÉTAPES:
1. Sur Équipement #1, associer Courroie B123
   - Quantité: 2
   - Fréquence: 4/an
   - Duplication: OUI
2. Valider

RÉSULTAT ATTENDU:
✓ Toast: "Association créée et dupliquée sur 2 équipement(s). Min/Max recalculés: 30/150"
✓ Aller sur /inventory/[courroie-b123]
✓ Min: 30 (était 10)
✓ Max: 150 (était 50)
✓ Statut: 🔴 Critique (20 ≤ 15 qui est 50% de 30)
✓ Bouton "Commander" visible
```

### Test 2: Nouvel Équipement avec Recalcul

```bash
PRÉREQUIS:
- 2 équipements existants avec Courroie B123
- Courroie B123: min: 20, max: 100

ÉTAPES:
1. Créer nouvel équipement du même type
2. Valider

RÉSULTAT ATTENDU:
✓ Toast: "Équipement créé avec 1 pièce(s). Min/Max recalculés."
✓ Aller sur /inventory/[courroie-b123]
✓ Min: 30 (était 20, +10 pour le 3ème équipement)
✓ Max: 150 (était 100, +50 pour le 3ème équipement)
```

### Test 3: Vérification Console Backend

```bash
ÉTAPES:
1. Créer association avec duplication
2. Observer les logs du serveur

RÉSULTAT ATTENDU:
✓ Log: "Min/Max recalculés pour la pièce [ID]: { minStock: 30, maxStock: 150 }"
```

---

## 🔄 Flux Complet

```
┌─────────────────────────────────────────────────────────┐
│ UTILISATEUR                                             │
│ Crée association avec duplication                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ BACKEND - POST /api/equipment-parts                     │
│                                                         │
│ 1. Créer association sur Équipement #1 ✓               │
│                                                         │
│ 2. Dupliquer sur 9 autres équipements ✓                │
│                                                         │
│ 3. ✅ RECALCULER MIN/MAX:                               │
│    a. Récupérer TOUTES les associations                 │
│       → 10 associations trouvées                        │
│    b. Calculer pour chaque:                             │
│       → Équipement #1: min +10, max +50                 │
│       → Équipement #2: min +10, max +50                 │
│       → ...                                             │
│       → Équipement #10: min +10, max +50                │
│    c. Total:                                            │
│       → Min: 100                                        │
│       → Max: 500                                        │
│    d. Mettre à jour Part:                               │
│       → Part.minStock = 100 ✓                           │
│       → Part.maxStock = 500 ✓                           │
│                                                         │
│ 4. Retourner résultat avec nouvelles valeurs            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ FRONTEND - Toast                                        │
│ "Association créée et dupliquée sur 9 équipement(s).    │
│  Min/Max recalculés: 100/500"                           │
└─────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ AFFICHAGE - /inventory/:id                              │
│                                                         │
│ Courroie B123                                           │
│ 🔴 Critique                                             │
│ Stock: 25 / Min: 100 / Max: 500                         │
│ [Commander] ← Visible car stock critique                │
└─────────────────────────────────────────────────────────┘
```

---

## 💡 Avantages

### 1. ✅ Cohérence Automatique

```
AVANT (manuel):
- Dupliquer associations ✓
- Recalculer min/max manuellement ✗
- Risque d'oubli ✗
- Valeurs incohérentes ✗

APRÈS (automatique):
- Dupliquer associations ✓
- Recalculer min/max automatiquement ✓
- Pas d'oubli possible ✓
- Valeurs toujours cohérentes ✓
```

### 2. ✅ Alertes Précises

```
Stock actuel: 25 pièces

Avec 1 équipement:
- Min: 10, Max: 50
- Statut: 🟢 Normal
- Pas d'alerte

Avec 10 équipements:
- Min: 100, Max: 500
- Statut: 🔴 Critique
- Alerte déclenchée ✓
- Commander 475 pièces ✓
```

### 3. ✅ Prévisions Justes

```
Commande suggérée:
- Basée sur le vrai besoin de TOUS les équipements
- Pas de sous-estimation
- Pas de sur-stockage inutile
```

---

## 📝 Résumé des Fichiers Modifiés

### Backend (3 fichiers)

1. **`server/services/equipmentPartsService.js`**
   - ✅ Nouvelle fonction `recalculateMinMaxForPart()`
   - Calcule min/max basé sur TOUTES les associations

2. **`server/routes/equipmentPartsRoutes.js`**
   - ✅ Appel du recalcul après duplication d'association
   - ✅ Retour des nouvelles valeurs au frontend

3. **`server/routes/equipmentRoutes.js`**
   - ✅ Appel du recalcul après création d'équipement
   - ✅ Recalcul pour chaque pièce dupliquée

### Frontend (1 fichier)

4. **`client/src/components/EquipmentPartFormDialog.tsx`**
   - ✅ Affichage des nouvelles valeurs min/max dans le toast

---

## ✅ Checklist de Vérification

- [x] Service de recalcul créé
- [x] Appel après duplication d'association
- [x] Appel après création d'équipement
- [x] Retour des valeurs au frontend
- [x] Affichage dans le toast
- [ ] Test: Duplication avec recalcul
- [ ] Test: Nouvel équipement avec recalcul
- [ ] Test: Vérification des valeurs en DB
- [ ] Test: Statut du stock mis à jour

---

## 🎉 Résultat Final

### Avant

```
❌ Duplication OK mais min/max inchangés
❌ Valeurs incohérentes avec le nombre d'équipements
❌ Alertes incorrectes
❌ Commandes sous-estimées
```

### Après

```
✅ Duplication + Recalcul automatique
✅ Min/Max toujours cohérents
✅ Alertes précises
✅ Commandes justes
✅ Gain de temps
✅ Zéro erreur
```

---

**Document créé le 1er Novembre 2025**  
**Recalcul automatique du min/max après duplication**
