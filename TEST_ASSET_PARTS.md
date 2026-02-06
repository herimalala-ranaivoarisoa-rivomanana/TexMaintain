# 🧪 TESTS - GESTION DES PIÈCES PAR ÉQUIPEMENT

## Prérequis

1. Serveur démarré : `npm run dev` (port 3000)
2. Token JWT valide (admin ou maintenance_manager)
3. Au moins 1 équipement et 1 pièce dans la base

---

## 📝 SCÉNARIO DE TEST COMPLET

### Étape 1 : Créer des associations

```bash
# Association 1 : Machine A - Courroie B123
curl -X POST http://localhost:3000/api/asset-parts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "asset": "EQUIPMENT_ID_A",
    "part": "PART_ID_B123",
    "quantityPerMachine": 1,
    "replacementFrequencyPerYear": 2,
    "criticality": "high",
    "machineImportance": 80,
    "leadTimeDays": 15,
    "safetyCoefficient": 1.4,
    "notes": "Courroie principale - Machine A"
  }'

# Association 2 : Machine B - Courroie B123
curl -X POST http://localhost:3000/api/asset-parts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "asset": "EQUIPMENT_ID_B",
    "part": "PART_ID_B123",
    "quantityPerMachine": 1,
    "replacementFrequencyPerYear": 1,
    "criticality": "medium",
    "machineImportance": 50,
    "leadTimeDays": 15,
    "safetyCoefficient": 1.4,
    "notes": "Courroie principale - Machine B"
  }'

# Association 3 : Machine C - Courroie B123
curl -X POST http://localhost:3000/api/asset-parts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "asset": "EQUIPMENT_ID_C",
    "part": "PART_ID_B123",
    "quantityPerMachine": 2,
    "replacementFrequencyPerYear": 0.5,
    "criticality": "low",
    "machineImportance": 30,
    "leadTimeDays": 15,
    "safetyCoefficient": 1.4,
    "notes": "Courroie secondaire - Machine C"
  }'
```

**Résultat attendu** : 3 associations créées avec calculs automatiques

---

### Étape 2 : Vérifier les calculs automatiques

```bash
# Récupérer une association
curl http://localhost:3000/api/asset-parts/ASSOCIATION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Vérifications** :
- `annualConsumption` = `quantityPerMachine × replacementFrequencyPerYear`
- `dailyConsumption` = `annualConsumption / 365`
- `safetyStock` = arrondi supérieur de (`dailyConsumption × leadTimeDays × safetyCoefficient`)
- `reorderPoint` = arrondi supérieur de (`safetyStock + dailyConsumption × leadTimeDays`)

**Exemple pour Machine A** :
```json
{
  "quantityPerMachine": 1,
  "replacementFrequencyPerYear": 2,
  "annualConsumption": 2,           // 1 × 2
  "dailyConsumption": 0.005479,     // 2 / 365
  "safetyStock": 1,                 // ceil(0.005479 × 15 × 1.4) = 1
  "reorderPoint": 1                 // ceil(1 + 0.005479 × 15) = 1
}
```

---

### Étape 3 : Calculer le stock global

```bash
# Calcul global pour la pièce B123
curl http://localhost:3000/api/asset-parts/part/PART_ID_B123/global-stock \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Résultat attendu** :
```json
{
  "success": true,
  "part": {
    "_id": "...",
    "name": "Courroie trapézoïdale",
    "partNumber": "B123",
    "currentStock": 5
  },
  "globalStock": {
    "totalAnnualConsumption": 4,      // 2 + 1 + 1
    "totalDailyConsumption": 0.01096,  // 4 / 365
    "weightedCriticality": 2.4375,     // (3×80 + 2×50 + 1×30) / 160
    "weightedCriticalityLabel": "medium",
    "globalSafetyStock": 1,            // ceil(0.01096 × 15 × 1.4)
    "globalReorderPoint": 2,           // ceil(1 + 0.01096 × 15)
    "recommendedInitialStock": 2,
    "assetCount": 3,
    "details": [...]
  },
  "status": "ok"  // ou "warning" ou "critical"
}
```

**Vérifications** :
- `totalAnnualConsumption` = somme des consommations annuelles
- `weightedCriticality` = moyenne pondérée correcte
- `globalSafetyStock` et `globalReorderPoint` calculés avec les valeurs max

---

### Étape 4 : Lister les pièces d'un équipement

```bash
curl http://localhost:3000/api/asset-parts/asset/EQUIPMENT_ID_A \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Résultat attendu** : Liste des pièces associées à l'équipement A

---

### Étape 5 : Lister les équipements utilisant une pièce

```bash
curl http://localhost:3000/api/asset-parts/part/PART_ID_B123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Résultat attendu** : Liste des 3 équipements (A, B, C) avec leurs paramètres

---

### Étape 6 : Enregistrer un remplacement

```bash
curl -X POST http://localhost:3000/api/asset-parts/ASSOCIATION_ID/record-replacement \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "quantityUsed": 1,
    "notes": "Remplacement préventif planifié"
  }'
```

**Vérifications** :
- `lastReplacementDate` mis à jour
- `nextReplacementDate` calculé (date actuelle + 365/replacementFrequencyPerYear jours)
- Entrée ajoutée dans `replacementHistory`
- Stock de la pièce décrémenté de `quantityUsed`

---

### Étape 7 : Obtenir les alertes de réapprovisionnement

```bash
curl http://localhost:3000/api/asset-parts/reorder-alerts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Résultat attendu** :
- Liste des pièces dont `currentStock <= globalReorderPoint`
- Triées par urgence (critical > warning) puis par déficit
- Urgence = "critical" si `currentStock <= globalSafetyStock`

---

### Étape 8 : Modifier une association

```bash
curl -X PATCH http://localhost:3000/api/asset-parts/ASSOCIATION_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "replacementFrequencyPerYear": 3,
    "criticality": "critical",
    "machineImportance": 90
  }'
```

**Vérifications** :
- Champs mis à jour
- Calculs automatiques recalculés (hook pre-save)

---

### Étape 9 : Supprimer une association

```bash
curl -X DELETE http://localhost:3000/api/asset-parts/ASSOCIATION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Résultat attendu** : Association supprimée avec succès

---

## 🧮 TESTS DE CALCUL

### Test 1 : Consommation annuelle

**Données** :
- quantityPerMachine = 2
- replacementFrequencyPerYear = 3

**Calcul** :
```
annualConsumption = 2 × 3 = 6
```

**Vérification** :
```javascript
const association = await AssetPart.findById(id);
assert.equal(association.annualConsumption, 6);
```

---

### Test 2 : Stock de sécurité

**Données** :
- annualConsumption = 6
- dailyConsumption = 6 / 365 = 0.0164
- leadTimeDays = 30
- safetyCoefficient = 1.5

**Calcul** :
```
safetyStock = ceil(0.0164 × 30 × 1.5) = ceil(0.738) = 1
```

**Vérification** :
```javascript
assert.equal(association.safetyStock, 1);
```

---

### Test 3 : Point de réapprovisionnement

**Données** :
- safetyStock = 1
- dailyConsumption = 0.0164
- leadTimeDays = 30

**Calcul** :
```
reorderPoint = ceil(1 + 0.0164 × 30) = ceil(1.492) = 2
```

**Vérification** :
```javascript
assert.equal(association.reorderPoint, 2);
```

---

### Test 4 : Criticité moyenne pondérée

**Données** :
| Machine | Criticité | Score | Importance |
|---------|-----------|-------|------------|
| A | critical | 4 | 60 |
| B | high | 3 | 30 |
| C | low | 1 | 10 |

**Calcul** :
```
weightedCriticality = (4×60 + 3×30 + 1×10) / 100 = 3.4
weightedCriticalityLabel = "high"
```

**Vérification** :
```javascript
const globalStock = await AssetPart.calculateGlobalStock(partId);
assert.equal(globalStock.weightedCriticality, 3.4);
assert.equal(globalStock.weightedCriticalityLabel, 'high');
```

---

## 🔍 TESTS D'EDGE CASES

### Test 5 : Fréquence de remplacement < 1

**Données** :
- quantityPerMachine = 1
- replacementFrequencyPerYear = 0.25 (tous les 4 ans)

**Calcul** :
```
annualConsumption = 1 × 0.25 = 0.25
dailyConsumption = 0.25 / 365 = 0.000685
```

**Vérification** : Pas d'erreur, calculs corrects

---

### Test 6 : Quantité fractionnaire

**Données** :
- quantityPerMachine = 0.5 (demi-pièce, ex: liquide)
- replacementFrequencyPerYear = 4

**Calcul** :
```
annualConsumption = 0.5 × 4 = 2
```

**Vérification** : Accepté, calculs corrects

---

### Test 7 : Doublon (même équipement + même pièce)

**Action** : Créer deux fois la même association

**Résultat attendu** :
```json
{
  "message": "This part is already associated with this asset"
}
```

**Code d'erreur** : 400

---

### Test 8 : Équipement inexistant

**Action** : Créer une association avec un ID d'équipement invalide

**Résultat attendu** :
```json
{
  "message": "Asset not found"
}
```

**Code d'erreur** : 404

---

### Test 9 : Pièce inexistante

**Action** : Créer une association avec un ID de pièce invalide

**Résultat attendu** :
```json
{
  "message": "Part not found"
}
```

**Code d'erreur** : 404

---

### Test 10 : Enregistrement de remplacement avec stock insuffisant

**Données** :
- currentStock = 0
- quantityUsed = 1

**Résultat** : Le remplacement est enregistré, le stock devient négatif (-1)

**Note** : C'est intentionnel pour permettre le suivi même en rupture de stock. Une alerte sera générée.

---

## ✅ CHECKLIST DE VALIDATION

### Calculs automatiques
- [ ] `annualConsumption` calculé correctement
- [ ] `dailyConsumption` calculé correctement
- [ ] `criticalityScore` mappé correctement
- [ ] `safetyStock` arrondi au supérieur
- [ ] `reorderPoint` arrondi au supérieur

### Stock global
- [ ] `totalAnnualConsumption` = somme correcte
- [ ] `weightedCriticality` pondéré correctement
- [ ] `globalSafetyStock` utilise les valeurs max
- [ ] `globalReorderPoint` calculé correctement
- [ ] `details` contient toutes les associations

### Alertes de réapprovisionnement
- [ ] Pièces avec stock <= reorderPoint listées
- [ ] Urgence "critical" si stock <= safetyStock
- [ ] Tri correct (critical > warning, puis par déficit)
- [ ] Compteurs corrects (count, critical, warning)

### Enregistrement de remplacement
- [ ] `lastReplacementDate` mis à jour
- [ ] `nextReplacementDate` calculé correctement
- [ ] Historique ajouté
- [ ] Stock de la pièce décrémenté

### Validation et sécurité
- [ ] Authentification requise sur toutes les routes
- [ ] Rôles vérifiés (admin, maintenance_manager)
- [ ] Validation Zod fonctionnelle
- [ ] Gestion des doublons
- [ ] Gestion des IDs invalides

---

## 🐛 PROBLÈMES CONNUS ET SOLUTIONS

### Problème 1 : Stock négatif après remplacement

**Cause** : Pas de vérification du stock avant décrémentation

**Solution actuelle** : Accepté, permet le suivi en rupture

**Solution future** : Ajouter une option pour bloquer si stock insuffisant

---

### Problème 2 : Calcul de nextReplacementDate imprécis

**Cause** : Utilise des jours fixes (365 / fréquence)

**Solution actuelle** : Approximation acceptable

**Solution future** : Utiliser les heures de fonctionnement réelles de l'équipement

---

### Problème 3 : Criticité moyenne peut être trompeuse

**Cause** : Une machine très importante peut masquer les autres

**Solution actuelle** : Utiliser aussi `weightedCriticalityLabel`

**Solution future** : Afficher la distribution des criticités

---

## 📊 RÉSULTATS ATTENDUS

### Exemple complet : Pièce B123 sur 3 machines

**Input** :
- Machine A : 1 × 2/an, high (80)
- Machine B : 1 × 1/an, medium (50)
- Machine C : 2 × 0.5/an, low (30)

**Output** :
```json
{
  "totalAnnualConsumption": 4,
  "totalDailyConsumption": 0.01096,
  "weightedCriticality": 2.4375,
  "weightedCriticalityLabel": "medium",
  "globalSafetyStock": 1,
  "globalReorderPoint": 2,
  "recommendedInitialStock": 2,
  "assetCount": 3
}
```

**Interprétation** :
- Consommation annuelle totale : 4 pièces
- Criticité moyenne : medium (2.4/4)
- Stock minimum : 1 pièce
- Commander quand stock ≤ 2 pièces
- Stock initial recommandé : 2 pièces

---

**Fin des tests**  
*Document créé par Cascade AI - 1er Novembre 2025*
