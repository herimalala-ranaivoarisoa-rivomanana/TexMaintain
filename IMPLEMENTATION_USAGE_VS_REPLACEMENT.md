# 🔄 Implémentation : Utilisation vs Remplacement

**Date**: 1er Novembre 2025  
**Statut**: ✅ IMPLÉMENTÉ

---

## 🎯 Objectif

Différencier la terminologie entre **pièces de rechange** (parts) et **consommables** (consumables) pour une meilleure compréhension utilisateur.

---

## 📋 Changements Implémentés

### Terminologie Adaptée

| Type | Action | Bouton | Dialog |
|------|--------|--------|--------|
| **Part** (Pièce) | Remplacement | "📝 Enregistrer un remplacement" | RecordReplacementDialog |
| **Consumable** (Consommable) | Utilisation | "📝 Enregistrer une utilisation" | RecordUsageDialog |

---

## 🔧 Fichiers Modifiés/Créés

### 1. ✅ Nouveau Composant Frontend

**`client/src/components/RecordUsageDialog.tsx`** (CRÉÉ)

Dialog spécifique pour enregistrer l'utilisation des consommables :

```typescript
<Dialog>
  <DialogTitle>📝 Enregistrer une utilisation</DialogTitle>
  
  <form>
    <Label>Quantité utilisée *</Label>
    <Input type="number" step="0.1" />
    
    <Label>Nouveau stock</Label>
    <p>{newStock}</p>
    
    <Label>Notes (optionnel)</Label>
    <Textarea />
    
    <Alert>
      • La date d'utilisation sera enregistrée automatiquement
      • La consommation sera tracée dans l'historique
      • Le stock du consommable sera décrémenté
    </Alert>
  </form>
</Dialog>
```

**Différences avec RecordReplacementDialog :**
- Titre : "Enregistrer une utilisation" vs "Enregistrer un remplacement"
- Texte : "Quantité utilisée" vs "Quantité remplacée"
- Messages : "consommation" vs "remplacement"

---

### 2. ✅ API Client Mise à Jour

**`client/src/api/assetParts.ts`** (MODIFIÉ)

Ajout de la fonction `recordUsage()` :

```typescript
/**
 * Enregistre un remplacement de pièce (pour parts)
 */
export const recordReplacement = async (id: string, data: { 
  quantity: number
  notes?: string 
}) => {
  const response = await api.post(`/api/asset-parts/${id}/record-replacement`, data)
  return response.data
}

/**
 * Enregistre une utilisation de consommable (pour consumables)
 */
export const recordUsage = async (id: string, data: { 
  quantity: number
  notes?: string 
}) => {
  const response = await api.post(`/api/asset-parts/${id}/record-usage`, data)
  return response.data
}
```

---

### 3. ✅ Composant Liste Mis à Jour

**`client/src/components/AssetPartsList.tsx`** (MODIFIÉ)

#### Ajouts :

**a) Import du nouveau composant :**
```typescript
import { RecordUsageDialog } from './RecordUsageDialog'
```

**b) État pour le dialog d'utilisation :**
```typescript
const [recordingUsageFor, setRecordingUsageFor] = useState<AssetPart | null>(null)
```

**c) Label conditionnel :**
```typescript
const actionLabel = type === 'part' 
  ? '📝 Enregistrer un remplacement'
  : '📝 Enregistrer une utilisation'
```

**d) Handlers :**
```typescript
const handleRecordUsage = (part: AssetPart) => {
  setRecordingUsageFor(part)
}

const handleUsageRecorded = () => {
  setRecordingUsageFor(null)
  fetchParts()
}
```

**e) Bouton conditionnel :**
```typescript
<Button
  onClick={() => {
    if (type === 'part') {
      handleRecordReplacement(part)
    } else {
      handleRecordUsage(part)
    }
  }}
>
  {actionLabel}
</Button>
```

**f) Dialog conditionnel :**
```typescript
{recordingUsageFor && (
  <RecordUsageDialog
    assetPart={recordingUsageFor}
    onClose={() => setRecordingUsageFor(null)}
    onSuccess={handleUsageRecorded}
  />
)}
```

---

### 4. ✅ Route Backend Ajoutée

**`server/routes/assetPartsRoutes.js`** (MODIFIÉ)

Nouvelle route pour enregistrer l'utilisation :

```javascript
/**
 * POST /api/asset-parts/:id/record-usage
 * Enregistrer une utilisation de consommable (pour consumables)
 */
router.post('/:id/record-usage', requireUser, async (req, res) => {
  try {
    const { id } = req.params
    
    // Validation
    const parse = recordReplacementSchema.safeParse(req.body)
    if (!parse.success) {
      return res.status(400).json({ 
        message: parse.error.issues[0]?.message || 'Invalid request' 
      })
    }
    
    const { quantityUsed, notes } = parse.data
    
    const association = await AssetPart.findById(id)
    if (!association) {
      return res.status(404).json({ message: 'Association not found' })
    }
    
    // Enregistrer l'utilisation
    await association.recordReplacement(quantityUsed, req.user._id, notes || '')
    
    // Décrémenter le stock
    await Part.findByIdAndUpdate(
      association.part,
      { $inc: { currentStock: -quantityUsed } }
    )
    
    const updated = await AssetPart.findById(id)
      .populate('asset', 'model serialNumber')
      .populate('part', 'name partNumber currentStock')
      .populate('replacementHistory.performedBy', 'fullName email')
      .lean()
    
    return res.status(200).json({
      success: true,
      association: updated,
      message: 'Usage recorded successfully'
    })
  } catch (error) {
    console.error('Error recording usage:', error)
    return res.status(500).json({ message: error.message })
  }
})
```

**Note :** La logique backend est identique à `record-replacement`. La différence est uniquement sémantique pour l'utilisateur.

---

## 📊 Comparaison Visuelle

### Page `/asset/A-123/parts` (Pièces)

```
┌────────────────────────────────────────────────┐
│ Rotary Cutter 45mm                             │
│ CUT-ROT-45MM                                   │
│                                                │
│ 🔴 Critique  Stock: 3  [Commander]             │
│                                                │
│ Stock: 3  │ Min: 10  │ Max: 50  │ Prix: 25€  │
│                                                │
│ [📝 Enregistrer un remplacement]               │
└────────────────────────────────────────────────┘

Clic → RecordReplacementDialog
       "Enregistrer un remplacement"
       "Quantité remplacée"
```

### Page `/asset/A-123/consumable` (Consommables)

```
┌────────────────────────────────────────────────┐
│ Huile de lubrification 5L                      │
│ OIL-LUB-5L                                     │
│                                                │
│ 🟢 Normal  Stock: 25.5 L                       │
│                                                │
│ Stock: 25.5│ Min: 10  │ Max: 50  │ Prix: 15€  │
│                                                │
│ [📝 Enregistrer une utilisation]               │
└────────────────────────────────────────────────┘

Clic → RecordUsageDialog
       "Enregistrer une utilisation"
       "Quantité utilisée"
```

---

## 🔄 Flux Utilisateur

### Pour Parts (Pièces de Rechange)

```
1. Technicien va sur /asset/A-123/parts
2. Voit "Rotary Cutter 45mm"
3. Vient de remplacer le cutter usé
4. Clic sur "📝 Enregistrer un remplacement"
5. Dialog s'ouvre :
   - Titre : "Enregistrer un remplacement"
   - Quantité remplacée : 1
   - Notes : "Usure normale"
6. Valide
7. Résultat :
   ✅ Stock : 17 → 16
   ✅ Date de remplacement enregistrée
   ✅ Prochain remplacement calculé
```

### Pour Consumables (Consommables)

```
1. Technicien va sur /asset/A-123/consumable
2. Voit "Huile de lubrification 5L"
3. Vient de lubrifier la machine
4. Clic sur "📝 Enregistrer une utilisation"
5. Dialog s'ouvre :
   - Titre : "Enregistrer une utilisation"
   - Quantité utilisée : 0.5 L
   - Notes : "Lubrification mensuelle"
6. Valide
7. Résultat :
   ✅ Stock : 25.5 → 25.0 L
   ✅ Date d'utilisation enregistrée
   ✅ Consommation tracée
```

---

## 🎯 Avantages de Cette Approche

### 1. Clarté Sémantique

```
❌ AVANT (confus) :
   Parts : "Enregistrer un remplacement" ✓
   Consumables : "Enregistrer un remplacement" ✗ (incorrect)

✅ APRÈS (clair) :
   Parts : "Enregistrer un remplacement" ✓
   Consumables : "Enregistrer une utilisation" ✓
```

### 2. Compréhension Utilisateur

Les utilisateurs comprennent immédiatement :
- **Pièce** → On la **remplace** (ancien → nouveau)
- **Consommable** → On l'**utilise** (consommation progressive)

### 3. Professionnalisme

Terminologie correcte et professionnelle adaptée au domaine de la GMAO.

### 4. Cohérence

Tous les textes sont cohérents dans l'interface :
- Titres de dialog
- Labels de champs
- Messages de confirmation
- Historique

---

## 🧪 Tests à Effectuer

### Test 1 : Parts (Pièces)

```bash
1. Aller sur /asset/[id]/parts
2. Vérifier le bouton : "📝 Enregistrer un remplacement"
3. Cliquer sur le bouton
4. Vérifier le dialog :
   ✓ Titre : "Enregistrer un remplacement"
   ✓ Label : "Quantité remplacée"
   ✓ Message : "date du remplacement sera enregistrée"
5. Remplir et valider
6. Vérifier :
   ✓ Stock décrémenté
   ✓ Toast : "Replacement recorded successfully"
```

### Test 2 : Consumables (Consommables)

```bash
1. Aller sur /asset/[id]/consumable
2. Vérifier le bouton : "📝 Enregistrer une utilisation"
3. Cliquer sur le bouton
4. Vérifier le dialog :
   ✓ Titre : "Enregistrer une utilisation"
   ✓ Label : "Quantité utilisée"
   ✓ Message : "date d'utilisation sera enregistrée"
5. Remplir et valider
6. Vérifier :
   ✓ Stock décrémenté
   ✓ Toast : "Usage recorded successfully"
```

### Test 3 : API Backend

```bash
# Test record-replacement (parts)
curl -X POST http://localhost:3000/api/asset-parts/[ID]/record-replacement \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"quantityUsed": 1, "notes": "Test remplacement"}'

# Test record-usage (consumables)
curl -X POST http://localhost:3000/api/asset-parts/[ID]/record-usage \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"quantityUsed": 0.5, "notes": "Test utilisation"}'
```

---

## 📝 Résumé des Fichiers

### Fichiers Créés (1)
1. ✅ `client/src/components/RecordUsageDialog.tsx`

### Fichiers Modifiés (3)
2. ✅ `client/src/api/assetParts.ts` - Ajout fonction `recordUsage()`
3. ✅ `client/src/components/AssetPartsList.tsx` - Bouton et dialog conditionnels
4. ✅ `server/routes/assetPartsRoutes.js` - Nouvelle route `/record-usage`

### Total : 4 fichiers

---

## 🚀 Pour Appliquer

### Étape 1 : Redémarrer le Backend
```bash
cd server
# Ctrl+C
npm run dev
```

### Étape 2 : Vider le Cache
```bash
F12 → Application → Clear storage
Ctrl+Shift+R
```

### Étape 3 : Tester
```bash
1. /asset/[id]/parts → "Enregistrer un remplacement"
2. /asset/[id]/consumable → "Enregistrer une utilisation"
```

---

## ✅ Checklist de Vérification

- [x] RecordUsageDialog créé
- [x] recordUsage() ajouté dans API client
- [x] AssetPartsList mis à jour avec bouton conditionnel
- [x] Route backend /record-usage ajoutée
- [x] Labels conditionnels selon type
- [x] Handlers pour usage ajoutés
- [x] Dialog conditionnel rendu
- [ ] Backend redémarré
- [ ] Cache vidé
- [ ] Tests effectués sur parts
- [ ] Tests effectués sur consumables
- [ ] Validation utilisateur

---

## 💡 Notes Techniques

### Pourquoi Deux Routes Séparées ?

Bien que la logique backend soit identique, avoir deux routes séparées permet :

1. **Clarté du code** : Intent explicite
2. **Messages différents** : "Replacement recorded" vs "Usage recorded"
3. **Évolution future** : Logique potentiellement différente
4. **Logs distincts** : Traçabilité séparée
5. **Analytics** : Statistiques séparées

### Pourquoi Deux Dialogs Séparés ?

1. **Textes adaptés** : Terminologie correcte
2. **Messages différents** : Alertes appropriées
3. **Évolution future** : Champs potentiellement différents
4. **Maintenabilité** : Modifications indépendantes

---

## 🎉 Résultat Final

### Avant
```
Parts : "Enregistrer un remplacement" ✓
Consumables : "Enregistrer un remplacement" ✗ (incorrect)
```

### Après
```
Parts : "Enregistrer un remplacement" ✓
Consumables : "Enregistrer une utilisation" ✓
```

**Terminologie professionnelle et adaptée ! 🚀**

---

**Document créé le 1er Novembre 2025**  
**Amélioration de la terminologie pour parts vs consumables**
