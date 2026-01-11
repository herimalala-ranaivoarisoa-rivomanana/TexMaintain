# 🔄 Duplication Automatique des Associations - Équipements du Même Type

**Date**: 1er Novembre 2025  
**Statut**: ✅ IMPLÉMENTÉ

---

## 🎯 Objectif

Automatiser la duplication des associations de pièces/consommables pour tous les équipements du même type, existants et futurs.

---

## 💡 Cas d'Usage

### Scénario Réel

```
Parc d'équipements:
- 10 × "Métier à Tisser Modèle A"
- 5 × "Machine de Découpe Modèle B"
- 8 × "Presse Hydraulique Modèle C"

Action:
Sur "Métier à Tisser #1", on associe:
  - Courroie B123
  - Quantité: 2
  - Fréquence: 4/an
  - Criticité: Haute
  - Importance: 80/100

Résultat AUTOMATIQUE:
✅ Les 9 autres "Métier à Tisser Modèle A" reçoivent la même association
✅ Tout futur "Métier à Tisser Modèle A" créé recevra aussi cette association
```

---

## 🔧 Fonctionnalités Implémentées

### 1. ✅ Duplication sur Équipements Existants

**Quand** : Lors de la création d'une nouvelle association pièce/équipement

**Comment** :
- Le système identifie le type d'équipement
- Trouve tous les autres équipements du même type
- Crée automatiquement la même association pour chacun
- Évite les doublons (vérifie si l'association existe déjà)

**Exemple** :
```
POST /api/asset-parts
{
  "asset": "equip-001",  // Métier à Tisser #1
  "part": "part-123",        // Courroie B123
  "quantityPerMachine": 2,
  "replacementFrequencyPerYear": 4,
  "criticality": "high",
  "duplicateToSameType": true  // ✅ Activé par défaut
}

Résultat:
✅ Association créée sur equip-001
✅ Dupliquée sur equip-002 (même type)
✅ Dupliquée sur equip-003 (même type)
✅ ...
✅ Dupliquée sur equip-010 (même type)

Response:
{
  "success": true,
  "association": {...},
  "duplicatedCount": 9,
  "message": "Association créée et dupliquée sur 9 équipement(s) du même type"
}
```

---

### 2. ✅ Duplication sur Nouveaux Équipements

**Quand** : Lors de la création d'un nouvel équipement

**Comment** :
- Le système identifie le type d'équipement
- Trouve un équipement de référence du même type
- Copie toutes ses associations de pièces/consommables
- Crée les mêmes associations pour le nouvel équipement

**Exemple** :
```
POST /api/asset
{
  "type": "type-A",  // Métier à Tisser Modèle A
  "model": "Métier à Tisser #11",
  "location": "Atelier 2",
  ...
}

Résultat:
✅ Équipement créé
✅ Trouve "Métier à Tisser #1" comme référence
✅ Copie ses 5 associations de pièces
✅ Crée les mêmes associations pour #11

Response:
{
  "success": true,
  "asset": {...},
  "duplicatedPartsCount": 5,
  "message": "Équipement créé avec 5 pièce(s)/consommable(s) auto-dupliqué(s)"
}
```

---

## 📊 Architecture Technique

### Backend - Route POST /asset-parts

**Fichier** : `server/routes/assetPartsRoutes.js`

```javascript
router.post('/', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  const { duplicateToSameType = true } = req.body
  
  // 1. Créer l'association principale
  const association = new AssetPart({...data, changedBy: req.user._id})
  await association.save()
  
  let duplicatedCount = 0
  
  // 2. Dupliquer sur équipements du même type si activé
  if (duplicateToSameType && asset.type) {
    // Trouver tous les autres équipements du même type
    const sameTypeAssets = await Asset.find({
      type: asset.type._id,
      _id: { $ne: asset._id }
    })
    
    // Créer les associations
    const duplications = []
    for (const otherAsset of sameTypeAssets) {
      // Vérifier qu'il n'existe pas déjà
      const existingAssoc = await AssetPart.findOne({
        asset: otherAsset._id,
        part: data.part
      })
      
      if (!existingAssoc) {
        duplications.push({
          asset: otherAsset._id,
          part: data.part,
          quantityPerMachine: data.quantityPerMachine,
          replacementFrequencyPerYear: data.replacementFrequencyPerYear,
          criticality: data.criticality,
          // ... tous les autres champs
          changedBy: req.user._id
        })
      }
    }
    
    if (duplications.length > 0) {
      await AssetPart.insertMany(duplications)
      duplicatedCount = duplications.length
    }
  }
  
  return res.status(201).json({
    success: true,
    association,
    duplicatedCount,
    message: duplicatedCount > 0 
      ? `Association créée et dupliquée sur ${duplicatedCount} équipement(s)`
      : 'Association créée'
  })
})
```

---

### Backend - Route POST /asset

**Fichier** : `server/routes/assetRoutes.js`

```javascript
router.post('/', requireUser, requireRole(['admin', 'maintenance_manager']), async (req, res) => {
  // 1. Créer l'équipement
  const created = await Asset.create(assetData)
  
  // 2. Dupliquer les associations depuis un équipement de référence
  let duplicatedPartsCount = 0
  if (created.type) {
    // Trouver un équipement de référence du même type
    const referenceAsset = await Asset.findOne({
      type: created.type,
      _id: { $ne: created._id }
    })
    
    if (referenceAsset) {
      // Récupérer toutes ses associations
      const referenceAssociations = await AssetPart.find({
        asset: referenceAsset._id
      })
      
      if (referenceAssociations.length > 0) {
        // Créer les mêmes pour le nouvel équipement
        const newAssociations = referenceAssociations.map(assoc => ({
          asset: created._id,
          part: assoc.part,
          quantityPerMachine: assoc.quantityPerMachine,
          replacementFrequencyPerYear: assoc.replacementFrequencyPerYear,
          criticality: assoc.criticality,
          // ... tous les autres champs
          notes: assoc.notes 
            ? `Auto-dupliqué depuis équipement de référence. ${assoc.notes}`
            : 'Auto-dupliqué depuis équipement de référence',
          changedBy: req.user._id
        }))
        
        await AssetPart.insertMany(newAssociations)
        duplicatedPartsCount = newAssociations.length
      }
    }
  }
  
  return res.status(201).json({
    success: true,
    asset,
    duplicatedPartsCount,
    message: duplicatedPartsCount > 0
      ? `Équipement créé avec ${duplicatedPartsCount} pièce(s) auto-dupliqué(s)`
      : 'Équipement créé'
  })
})
```

---

### Frontend - Formulaire d'Association

**Fichier** : `client/src/components/AssetPartFormDialog.tsx`

#### Ajout du Champ

```typescript
const [form, setForm] = useState({
  part: '',
  quantityPerMachine: 1,
  replacementFrequencyPerYear: 1,
  criticality: 'medium',
  // ...
  duplicateToSameType: true  // ✅ Par défaut activé
})
```

#### Checkbox dans le Formulaire

```tsx
{!editingPart && (
  <Alert>
    <AlertDescription>
      <div className="flex items-start space-x-3">
        <Checkbox
          id="duplicateToSameType"
          checked={form.duplicateToSameType}
          onCheckedChange={(checked) => 
            setForm({ ...form, duplicateToSameType: checked as boolean })
          }
        />
        <div className="space-y-1">
          <Label htmlFor="duplicateToSameType">
            Dupliquer sur tous les équipements du même type
          </Label>
          <p className="text-sm text-slate-500">
            Cette association sera automatiquement créée pour tous les 
            équipements existants et futurs du même type.
          </p>
        </div>
      </div>
    </AlertDescription>
  </Alert>
)}
```

#### Envoi avec le Paramètre

```typescript
const result = await createAssetPart({
  asset: assetId,
  part: form.part,
  quantityPerMachine: form.quantityPerMachine,
  // ...
  duplicateToSameType: form.duplicateToSameType  // ✅
})

const duplicatedCount = result.duplicatedCount || 0
toast({
  title: 'Créé',
  description: duplicatedCount > 0
    ? `Association créée et dupliquée sur ${duplicatedCount} équipement(s) du même type`
    : 'Association créée avec succès'
})
```

---

## 🎯 Avantages

### 1. Gain de Temps Massif

**Avant** :
```
10 Métiers à Tisser Modèle A
→ Associer la Courroie B123 manuellement sur chacun
→ Temps: 10 × 2 minutes = 20 minutes
→ Risque d'oubli ou d'erreur
```

**Après** :
```
10 Métiers à Tisser Modèle A
→ Associer la Courroie B123 sur 1 seul
→ Temps: 2 minutes
→ Les 9 autres sont faits automatiquement
→ Gain: 18 minutes (90%)
```

### 2. Cohérence Garantie

Tous les équipements du même type ont **exactement** les mêmes associations :
- Mêmes pièces
- Mêmes quantités
- Mêmes fréquences
- Mêmes criticités
- Mêmes paramètres

### 3. Maintenance Simplifiée

```
Nouveau Métier à Tisser #11 arrive
→ Créé dans le système
→ Reçoit automatiquement toutes les associations
→ Prêt pour la maintenance immédiatement
→ Pas de configuration manuelle
```

### 4. Calculs Min/Max Précis

Avec toutes les associations en place :
- Le calcul automatique de min/max fonctionne immédiatement
- Les prévisions de stock sont précises
- Les alertes de réapprovisionnement sont correctes

---

## 🧪 Tests à Effectuer

### Test 1 : Duplication sur Équipements Existants

```bash
PRÉREQUIS:
- 3 équipements du même type (ex: Métier à Tisser Modèle A)
- 1 pièce (ex: Courroie B123)

ÉTAPES:
1. Aller sur /asset/[equip-1]/parts
2. Cliquer "Ajouter une pièce"
3. Sélectionner "Courroie B123"
4. Remplir les paramètres
5. Vérifier que la checkbox "Dupliquer..." est cochée
6. Valider

RÉSULTAT ATTENDU:
✓ Toast: "Association créée et dupliquée sur 2 équipement(s)"
✓ Aller sur /asset/[equip-2]/parts
✓ La Courroie B123 est présente avec les mêmes paramètres
✓ Aller sur /asset/[equip-3]/parts
✓ La Courroie B123 est présente avec les mêmes paramètres
```

### Test 2 : Désactivation de la Duplication

```bash
ÉTAPES:
1. Aller sur /asset/[equip-1]/parts
2. Cliquer "Ajouter une pièce"
3. Sélectionner une pièce
4. Décocher "Dupliquer sur tous les équipements..."
5. Valider

RÉSULTAT ATTENDU:
✓ Toast: "Association créée avec succès" (sans mention de duplication)
✓ Aller sur /asset/[equip-2]/parts
✓ La pièce N'EST PAS présente
```

### Test 3 : Duplication sur Nouvel Équipement

```bash
PRÉREQUIS:
- 1 équipement existant "Métier à Tisser #1" avec 3 pièces associées

ÉTAPES:
1. Aller sur /asset
2. Cliquer "Ajouter un équipement"
3. Sélectionner le même type: "Métier à Tisser Modèle A"
4. Remplir les autres champs
5. Valider

RÉSULTAT ATTENDU:
✓ Toast: "Équipement créé avec 3 pièce(s)/consommable(s) auto-dupliqué(s)"
✓ Aller sur /asset/[new-equip]/parts
✓ Les 3 pièces sont présentes
✓ Avec les mêmes paramètres que l'équipement de référence
✓ Notes contiennent "Auto-dupliqué depuis équipement de référence"
```

### Test 4 : Éviter les Doublons

```bash
PRÉREQUIS:
- 2 équipements du même type
- Équipement #2 a déjà la Courroie B123

ÉTAPES:
1. Sur équipement #1, associer Courroie B123
2. Avec duplication activée
3. Valider

RÉSULTAT ATTENDU:
✓ Toast: "Association créée et dupliquée sur 0 équipement(s)"
  (car équipement #2 l'a déjà)
✓ Pas de doublon créé sur équipement #2
```

---

## 📊 Flux de Données

### Création d'Association avec Duplication

```
┌─────────────────────────────────────────────────────────┐
│ UTILISATEUR                                             │
│ Crée association sur Équipement #1                     │
│ ✓ Courroie B123                                         │
│ ✓ Quantité: 2                                           │
│ ✓ Fréquence: 4/an                                       │
│ ✓ Duplication: OUI                                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ BACKEND - POST /api/asset-parts                     │
│                                                         │
│ 1. Créer association sur Équipement #1 ✓               │
│                                                         │
│ 2. Trouver équipements du même type:                    │
│    → Équipement #2 (même type) ✓                        │
│    → Équipement #3 (même type) ✓                        │
│    → Équipement #4 (autre type) ✗                       │
│                                                         │
│ 3. Pour chaque équipement du même type:                 │
│    → Vérifier si association existe déjà                │
│    → Si non, créer la même association                  │
│                                                         │
│ 4. Résultat:                                            │
│    → Association créée: 1                               │
│    → Associations dupliquées: 2                         │
│    → Total: 3 équipements configurés                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ FRONTEND - Toast                                        │
│ "Association créée et dupliquée sur 2 équipement(s)"    │
└─────────────────────────────────────────────────────────┘
```

### Création d'Équipement avec Auto-Duplication

```
┌─────────────────────────────────────────────────────────┐
│ UTILISATEUR                                             │
│ Crée nouvel équipement                                  │
│ ✓ Type: Métier à Tisser Modèle A                       │
│ ✓ Modèle: #11                                           │
│ ✓ Location: Atelier 2                                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ BACKEND - POST /api/asset                           │
│                                                         │
│ 1. Créer l'équipement #11 ✓                             │
│                                                         │
│ 2. Trouver équipement de référence du même type:        │
│    → Équipement #1 (même type) ✓                        │
│                                                         │
│ 3. Récupérer ses associations:                          │
│    → Courroie B123 (qty: 2, freq: 4/an)                 │
│    → Filtre à air F456 (qty: 1, freq: 12/an)            │
│    → Huile H789 (qty: 0.5, freq: 12/an)                 │
│                                                         │
│ 4. Créer les mêmes pour #11:                            │
│    → Courroie B123 ✓                                    │
│    → Filtre à air F456 ✓                                │
│    → Huile H789 ✓                                       │
│                                                         │
│ 5. Résultat:                                            │
│    → Équipement créé: 1                                 │
│    → Associations dupliquées: 3                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ FRONTEND - Toast                                        │
│ "Équipement créé avec 3 pièce(s) auto-dupliqué(s)"     │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 Interface Utilisateur

### Formulaire d'Association

```
┌──────────────────────────────────────────────────────┐
│ Ajouter une pièce                                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Pièce *                                              │
│ [Courroie B123 (B123-XL) ▼]                         │
│                                                      │
│ Quantité par machine: [2]                            │
│ Fréquence de remplacement: [4] fois/an               │
│ Criticité: [Haute ▼]                                 │
│ ...                                                  │
│                                                      │
│ ┌────────────────────────────────────────────────┐  │
│ │ ☑ Dupliquer sur tous les équipements du même  │  │
│ │   type                                         │  │
│ │                                                │  │
│ │   Cette association sera automatiquement      │  │
│ │   créée pour tous les équipements existants   │  │
│ │   et futurs du même type avec les mêmes       │  │
│ │   paramètres.                                  │  │
│ └────────────────────────────────────────────────┘  │
│                                                      │
│ [Annuler]  [Créer]                                   │
└──────────────────────────────────────────────────────┘
```

### Toast de Confirmation

```
┌──────────────────────────────────────────────────────┐
│ ✓ Créé                                               │
│                                                      │
│ Association créée et dupliquée sur 9 équipement(s)   │
│ du même type                                         │
└──────────────────────────────────────────────────────┘
```

---

## 💡 Cas d'Usage Avancés

### Cas 1 : Parc Homogène

```
Parc: 50 Métiers à Tisser identiques

Action:
- Configurer 1 seul métier avec toutes ses pièces (10 pièces)
- Duplication automatique

Résultat:
- 50 × 10 = 500 associations créées automatiquement
- Temps économisé: ~16 heures de saisie manuelle
```

### Cas 2 : Nouvelle Ligne de Production

```
Nouvelle ligne: 20 Machines de Découpe identiques

Action:
- Créer les 20 machines
- Configurer la 1ère avec ses pièces
- Les 19 autres reçoivent automatiquement les associations

Résultat:
- Configuration complète en quelques minutes
- Cohérence garantie sur toute la ligne
```

### Cas 3 : Standardisation Progressive

```
Situation:
- 10 Presses Hydrauliques
- Seulement 3 ont la Courroie B123 associée

Action:
- Sur une 4ème presse, associer Courroie B123
- Avec duplication activée

Résultat:
- Les 6 autres presses reçoivent l'association
- Standardisation complète du parc
```

---

## 📝 Résumé des Fichiers Modifiés

### Backend (2 fichiers)

1. **`server/routes/assetPartsRoutes.js`**
   - Ajout logique de duplication dans POST /
   - Paramètre `duplicateToSameType`
   - Retour du nombre d'équipements dupliqués

2. **`server/routes/assetRoutes.js`**
   - Ajout logique de duplication dans POST /
   - Copie depuis équipement de référence
   - Retour du nombre de pièces dupliquées

### Frontend (1 fichier)

3. **`client/src/components/AssetPartFormDialog.tsx`**
   - Ajout champ `duplicateToSameType` dans le formulaire
   - Checkbox pour activer/désactiver
   - Affichage du nombre d'équipements dupliqués dans le toast

---

## ✅ Checklist de Vérification

- [x] Backend: Duplication sur équipements existants
- [x] Backend: Duplication sur nouveaux équipements
- [x] Backend: Éviter les doublons
- [x] Backend: Retour du nombre de duplications
- [x] Frontend: Checkbox de duplication
- [x] Frontend: Paramètre envoyé à l'API
- [x] Frontend: Toast avec nombre de duplications
- [ ] Tests: Duplication activée
- [ ] Tests: Duplication désactivée
- [ ] Tests: Nouvel équipement
- [ ] Tests: Éviter doublons

---

## 🎉 Résultat Final

### Avant
```
❌ Saisie manuelle sur chaque équipement
❌ Risque d'oubli ou d'erreur
❌ Temps de configuration très long
❌ Incohérences possibles
❌ Nouveaux équipements vides
```

### Après
```
✅ Saisie sur 1 seul équipement
✅ Duplication automatique sur tous les autres
✅ Configuration en quelques secondes
✅ Cohérence garantie
✅ Nouveaux équipements pré-configurés
✅ Gain de temps massif (90%)
```

---

**Document créé le 1er Novembre 2025**  
**Automatisation de la duplication des associations d'équipements**
