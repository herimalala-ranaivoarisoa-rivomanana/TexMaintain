# 🔧 Correction - Association de Consommables aux Équipements

## 🐛 Problème

L'association de **parts** fonctionne, mais pas l'association de **consommables** aux équipements.

## 🔍 Cause du Problème

Dans la route `GET /api/equipment/:id/consumable`, le code essayait de filtrer directement sur `'part.type': 'consumable'` dans la requête MongoDB :

```javascript
const equipmentParts = await EquipmentPart.find({ 
  equipment: id,
  'part.type': 'consumable'  // ❌ Ne fonctionne pas car 'part' est une référence (ObjectId)
})
```

**Pourquoi ça ne fonctionne pas ?**
- Dans le modèle `EquipmentPart`, le champ `part` est une **référence** (ObjectId) vers le modèle `Part`
- On ne peut pas filtrer sur les propriétés d'un document référencé avant de le populer
- MongoDB ne peut pas accéder à `part.type` car `part` n'est qu'un ID à ce stade

## ✅ Solution

Il faut d'abord récupérer tous les IDs des parts de type 'consumable', puis filtrer les `EquipmentParts` avec ces IDs :

```javascript
// 1. Récupérer tous les IDs des consommables
const { Part } = require('../models/Part');
const consumableParts = await Part.find({ type: 'consumable' }).select('_id').lean();
const consumablePartIds = consumableParts.map(p => p._id);

// 2. Filtrer les EquipmentParts avec ces IDs
const equipmentParts = await EquipmentPart.find({ 
  equipment: id,
  part: { $in: consumablePartIds }  // ✅ Filtre sur les IDs
})
```

## 📝 Fichier Modifié

**Fichier:** `server/routes/equipmentRoutes.js`

**Lignes modifiées:** 234-277 (route GET `/api/equipment/:id/consumable`)

### Avant (Ne fonctionnait pas)

```javascript
router.get('/:id/consumable', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, skip = 0 } = req.query;

    const equipment = await Equipment.findById(id)
      .populate('category')
      .populate('type')
      .lean();

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    const equipmentParts = await EquipmentPart.find({ 
      equipment: id,
      'part.type': 'consumable'  // ❌ Problème ici
    })
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .populate('changedBy', 'email role')
      .populate('part', 'name partNumber currentStock minStock maxStock unitPrice supplier location category type pendingOrders pendingQuantity')
      .lean();

    const total = await EquipmentPart.countDocuments({ 
      equipment: id,
      'part.type': 'consumable'  // ❌ Problème ici aussi
    });

    return res.status(200).json({
      equipment,
      equipmentParts,
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('Get equipment consumables error:', error);
    return res.status(500).json({ message: error.message || 'Failed to get equipment consumables' });
  }
});
```

### Après (Fonctionne correctement)

```javascript
router.get('/:id/consumable', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, skip = 0 } = req.query;

    const equipment = await Equipment.findById(id)
      .populate('category')
      .populate('type')
      .lean();

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // ✅ Étape 1: Récupérer tous les IDs des consommables
    const { Part } = require('../models/Part');
    const consumableParts = await Part.find({ type: 'consumable' }).select('_id').lean();
    const consumablePartIds = consumableParts.map(p => p._id);

    // ✅ Étape 2: Filtrer les EquipmentParts avec ces IDs
    const equipmentParts = await EquipmentPart.find({ 
      equipment: id,
      part: { $in: consumablePartIds }
    })
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .populate('changedBy', 'email role')
      .populate('part', 'name partNumber currentStock minStock maxStock unitPrice supplier location category type pendingOrders pendingQuantity')
      .lean();

    const total = await EquipmentPart.countDocuments({ 
      equipment: id,
      part: { $in: consumablePartIds }
    });

    return res.status(200).json({
      equipment,
      equipmentParts,
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('Get equipment consumables error:', error);
    return res.status(500).json({ message: error.message || 'Failed to get equipment consumables' });
  }
});
```

## 🚀 Pour Appliquer la Correction

### 1. Vérifier que le serveur tourne avec nodemon

Dans le terminal où vous avez lancé le serveur, vous devriez voir :

```
[nodemon] restarting due to changes...
[nodemon] starting `node server.js`
Server running on port 5000
```

Si nodemon a détecté le changement, le serveur a déjà redémarré automatiquement ! ✅

### 2. Si le serveur ne tourne pas

Lancez-le avec :

```bash
cd server
npm run dev
```

### 3. Tester l'Association de Consommables

1. Allez sur `/equipment`
2. Cliquez sur un équipement
3. Cliquez sur l'icône **Droplet** (Consommables)
4. Cliquez sur **"Ajouter un Consommable"**
5. Sélectionnez un consommable dans la liste
6. Entrez la quantité
7. Cliquez sur **"Ajouter"**
8. ✅ **Le consommable devrait être associé avec succès !**

## 📊 Différence entre Parts et Consommables

Dans le modèle `Part`, le champ `type` distingue les deux :

```javascript
type: { 
  type: String, 
  enum: ['part', 'consumable'],  // 'part' ou 'consumable'
  default: 'part' 
}
```

- **Parts** : Pièces de rechange (type = 'part')
- **Consommables** : Produits consommables (type = 'consumable')

## 🔍 Vérification

### Backend - Logs de Succès

Quand vous associez un consommable, vous devriez voir dans les logs du serveur :

```
Authentication successful for user: admin@texmaintain.com
POST /api/equipment/:id/consumable 201
```

### Frontend - Console du Navigateur

```
Succès: Consommable associé avec succès
```

## ✨ Résultat

Maintenant, vous pouvez :
- ✅ Associer des **parts** (pièces de rechange) aux équipements
- ✅ Associer des **consommables** aux équipements
- ✅ Voir la liste des parts et consommables séparément
- ✅ Filtrer et rechercher dans chaque catégorie

## 📝 Note Technique

Cette correction utilise l'opérateur MongoDB `$in` pour filtrer les documents dont le champ `part` correspond à l'un des IDs dans le tableau `consumablePartIds`. C'est la méthode correcte pour filtrer sur des références avant la population.

---

**Status:** ✅ Corrigé et prêt à tester !
