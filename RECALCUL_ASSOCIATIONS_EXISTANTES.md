# 🔧 Recalcul des Associations Existantes

**Date**: 1er Novembre 2025  
**Problème**: Consommation annuelle = 0 pour certaines associations

---

## 🎯 Problème Identifié

### Symptôme

```
Équipement #1:
- Quantité: 1
- Fréquence: 2/an
- Consommation annuelle: 2 ✅ CORRECT

Équipement #2:
- Quantité: 1
- Fréquence: 2/an
- Consommation annuelle: 0 ❌ INCORRECT
```

### Cause

Les associations créées **avant** l'implémentation du hook `pre-save` n'ont pas leurs valeurs calculées (`annualConsumption`, `dailyConsumption`, `safetyStock`, `reorderPoint`).

---

## ✅ Solution

### Option 1: Via API (Recommandé)

**Route créée**: `POST /api/equipment-parts/recalculate-all`

#### Utilisation avec cURL

```bash
# Depuis le terminal
curl -X POST http://localhost:3000/api/equipment-parts/recalculate-all \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

#### Utilisation avec la Console du Navigateur

```javascript
// 1. Ouvrir l'application dans le navigateur
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
  console.log('✅ Recalcul terminé:', data)
  alert(`${data.updated} association(s) recalculée(s)`)
})
.catch(err => console.error('❌ Erreur:', err))
```

---

### Option 2: Via Script Node.js

**Fichier**: `server/scripts/recalculateAllAssociations.js`

```bash
# Depuis le dossier server
node scripts/recalculateAllAssociations.js
```

**Note**: Nécessite les bonnes credentials MongoDB dans `.env`

---

## 🔄 Ce que fait le Recalcul

Pour chaque association, le système recalcule automatiquement:

```javascript
// Valeurs recalculées
annualConsumption = quantityPerMachine × replacementFrequencyPerYear
dailyConsumption = annualConsumption / 365
safetyStock = Math.ceil(dailyConsumption × leadTimeDays × safetyCoefficient)
reorderPoint = Math.ceil(safetyStock + (dailyConsumption × leadTimeDays))
```

### Exemple

```
Avant recalcul:
- quantityPerMachine: 1
- replacementFrequencyPerYear: 2
- annualConsumption: 0 ❌
- dailyConsumption: 0 ❌
- safetyStock: 0 ❌
- reorderPoint: 0 ❌

Après recalcul:
- quantityPerMachine: 1
- replacementFrequencyPerYear: 2
- annualConsumption: 2 ✅
- dailyConsumption: 0.005 ✅
- safetyStock: 1 ✅
- reorderPoint: 1 ✅
```

---

## 📊 Vérification

### Avant le Recalcul

```bash
# Dans MongoDB Compass ou CLI
db.equipmentparts.find({ annualConsumption: 0 }).count()
# Résultat: X associations avec annualConsumption = 0
```

### Après le Recalcul

```bash
db.equipmentparts.find({ annualConsumption: 0 }).count()
# Résultat: 0 (toutes corrigées)
```

### Dans l'Interface

1. Aller sur `/inventory/[piece-id]`
2. Section "Équipements utilisant cette pièce"
3. Vérifier que **toutes** les associations affichent une consommation annuelle > 0

---

## 🎯 Quand Utiliser

### Situations nécessitant un recalcul:

1. **Après migration de données**
   - Importation d'anciennes associations

2. **Après mise à jour du modèle**
   - Changement de la formule de calcul
   - Ajout de nouveaux champs calculés

3. **Détection d'incohérences**
   - Consommation annuelle = 0 alors que quantité et fréquence > 0
   - Valeurs de stock aberrantes

4. **Maintenance préventive**
   - Tous les 6 mois pour garantir la cohérence

---

## ⚠️ Précautions

### Avant d'exécuter:

1. ✅ **Backup de la base de données**
   ```bash
   mongodump --db texmaintain --out backup_$(date +%Y%m%d)
   ```

2. ✅ **Vérifier qu'aucun utilisateur n'est en train de modifier des associations**

3. ✅ **Exécuter en dehors des heures de production si possible**

### Pendant l'exécution:

- Le processus peut prendre quelques secondes à quelques minutes selon le nombre d'associations
- Les utilisateurs peuvent continuer à utiliser l'application
- Aucune donnée n'est supprimée, seulement recalculée

---

## 🧪 Test

### Test Rapide

```javascript
// Console du navigateur
fetch('/api/equipment-parts/recalculate-all', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(res => res.json())
.then(data => console.log(data))
```

**Résultat attendu**:
```json
{
  "success": true,
  "updated": 42,
  "message": "42 association(s) recalculée(s)"
}
```

---

## 📝 Logs

### Backend

```
Console du serveur:
[INFO] Recalculating all associations...
[INFO] 42 associations found
[INFO] Association 1/42 recalculated
[INFO] Association 2/42 recalculated
...
[INFO] ✅ All 42 associations recalculated successfully
```

### Frontend

```
Console du navigateur:
✅ Recalcul terminé: {success: true, updated: 42, message: "42 association(s) recalculée(s)"}
```

---

## 🎉 Résultat Attendu

### Avant

```
Équipements utilisant cette pièce (2):

Équipement #1:
- Quantité: 1, Fréquence: 2/an
- Conso. annuelle: 2 pièces ✅

Équipement #2:
- Quantité: 1, Fréquence: 2/an
- Conso. annuelle: 0 pièces ❌ INCOHÉRENT
```

### Après

```
Équipements utilisant cette pièce (2):

Équipement #1:
- Quantité: 1, Fréquence: 2/an
- Conso. annuelle: 2 pièces ✅

Équipement #2:
- Quantité: 1, Fréquence: 2/an
- Conso. annuelle: 2 pièces ✅ CORRIGÉ
```

---

## 🔄 Automatisation Future

### Hook Pre-Save

Le hook `pre-save` dans le modèle `EquipmentPart` garantit que:
- ✅ Toute **nouvelle** association aura ses valeurs calculées automatiquement
- ✅ Toute **modification** d'association recalculera les valeurs
- ✅ Plus besoin de recalcul manuel pour les nouvelles données

### Code du Hook

```javascript
schema.pre('save', function(next) {
  // Calcul automatique
  this.annualConsumption = this.quantityPerMachine * this.replacementFrequencyPerYear
  this.dailyConsumption = this.annualConsumption / 365
  this.safetyStock = Math.ceil(this.dailyConsumption * this.leadTimeDays * this.safetyCoefficient)
  this.reorderPoint = Math.ceil(this.safetyStock + (this.dailyConsumption * this.leadTimeDays))
  next()
})
```

---

## ✅ Checklist

- [ ] Backup de la base de données effectué
- [ ] Aucun utilisateur en train de modifier des associations
- [ ] Route `/recalculate-all` accessible
- [ ] Token d'authentification valide
- [ ] Exécution du recalcul
- [ ] Vérification dans l'interface
- [ ] Vérification dans MongoDB
- [ ] Toutes les consommations annuelles > 0
- [ ] Logs vérifiés
- [ ] Utilisateurs informés

---

**Document créé le 1er Novembre 2025**  
**Correction des associations avec consommation annuelle = 0**
