# 🧪 Test: Recalcul Automatique après Modification

**Date**: 1er Novembre 2025  
**Objectif**: Vérifier que le min/max est recalculé automatiquement après modification d'une association

---

## 🎯 Scénario de Test

### Situation Initiale

```
Pièce: Rotary Cutter 45mm
- Min actuel: X
- Max actuel: Y

Association sur DLM125469 (14587954):
- Quantité: 1
- Fréquence: 2/an
- Délai d'appro: 15 jours
- Coefficient de sécurité: 1.4
```

---

## 📋 Étapes de Test

### Test 1: Modification du Délai d'Appro

```bash
1. Aller sur /equipment/[id]/parts
   (Exemple: l'équipement DLM125469)

2. Cliquer sur "Modifier" pour "Rotary Cutter 45mm"

3. Changer le délai d'appro:
   - Avant: 15 jours
   - Après: 30 jours

4. Cliquer sur "Modifier"

5. Observer le toast:
   ✓ Devrait afficher: "Association modifiée. Min/Max recalculés: XX/YYY"

6. Aller sur /inventory/[piece-id]
   (Exemple: Rotary Cutter 45mm)

7. Vérifier:
   ✓ Min a augmenté (car délai plus long)
   ✓ Max a augmenté
```

### Test 2: Modification de la Quantité

```bash
1. Aller sur /equipment/[id]/parts

2. Cliquer sur "Modifier" pour une pièce

3. Changer la quantité:
   - Avant: 1
   - Après: 2

4. Cliquer sur "Modifier"

5. Observer le toast:
   ✓ "Association modifiée. Min/Max recalculés: XX/YYY"

6. Vérifier dans /inventory:
   ✓ Min a doublé
   ✓ Max a doublé
```

### Test 3: Modification de la Fréquence

```bash
1. Aller sur /equipment/[id]/parts

2. Cliquer sur "Modifier" pour une pièce

3. Changer la fréquence:
   - Avant: 2/an
   - Après: 4/an

4. Cliquer sur "Modifier"

5. Observer le toast:
   ✓ "Association modifiée. Min/Max recalculés: XX/YYY"

6. Vérifier dans /inventory:
   ✓ Min a doublé
   ✓ Max a doublé
```

---

## 🔍 Vérification des Logs Backend

### Console du Serveur

Après chaque modification, vous devriez voir dans les logs du serveur :

```
Min/Max recalculés après modification pour la pièce [ID]: { minStock: XX, maxStock: YYY }
```

### Si Vous Ne Voyez Pas Ce Log

Cela signifie que le recalcul n'a pas été déclenché. Vérifiez :

1. **Le serveur a-t-il été redémarré ?**
   ```bash
   # Redémarrer le serveur
   cd server
   # Ctrl+C puis
   npm run dev
   ```

2. **Le code est-il bien présent ?**
   - Vérifier `server/routes/equipmentPartsRoutes.js` ligne 383-400

3. **Y a-t-il des erreurs ?**
   - Regarder les logs du serveur pour des erreurs

---

## 📊 Résultats Attendus

### Exemple Concret

```
État initial:
- 2 équipements utilisent Rotary Cutter 45mm
- Chaque équipement: qty=1, freq=2/an, délai=15j
- Min total: 6
- Max total: 4

Modification sur équipement #1:
- Délai d'appro: 15j → 30j

Résultat attendu:
- Min total: 9 (augmenté de ~3)
- Max total: 4 (inchangé)
- Toast: "Association modifiée. Min/Max recalculés: 9/4"
```

---

## ❌ Si le Recalcul Ne Fonctionne Pas

### Diagnostic

1. **Vérifier la console du navigateur (F12)**
   - Y a-t-il des erreurs ?
   - La requête PATCH a-t-elle réussi ?

2. **Vérifier la réponse de l'API**
   ```javascript
   // Dans l'onglet Network (F12)
   // Chercher la requête PATCH /api/equipment-parts/[id]
   // Vérifier la réponse:
   {
     "success": true,
     "association": {...},
     "recalculatedMinMax": {
       "minStock": XX,
       "maxStock": YYY
     },
     "message": "Association modifiée. Min/Max recalculés: XX/YYY"
   }
   ```

3. **Vérifier les logs du serveur**
   ```bash
   # Devrait afficher:
   Min/Max recalculés après modification pour la pièce [ID]: { minStock: XX, maxStock: YYY }
   ```

### Solutions

#### Solution 1: Redémarrer le Serveur

```bash
cd server
# Arrêter (Ctrl+C)
npm run dev
```

#### Solution 2: Vider le Cache du Navigateur

```bash
# Dans le navigateur
Ctrl+Shift+R (ou Cmd+Shift+R sur Mac)
```

#### Solution 3: Vérifier le Code

```bash
# Vérifier que le fichier contient bien le code de recalcul
cat server/routes/equipmentPartsRoutes.js | grep -A 10 "Recalculer automatiquement"
```

---

## ✅ Checklist de Validation

- [ ] Serveur redémarré avec les dernières modifications
- [ ] Modification du délai d'appro testée
- [ ] Toast affiche "Min/Max recalculés: XX/YYY"
- [ ] Min/Max visibles dans /inventory ont changé
- [ ] Logs du serveur affichent le recalcul
- [ ] Modification de quantité testée
- [ ] Modification de fréquence testée
- [ ] Pas d'erreurs dans la console

---

## 🎉 Résultat Attendu Final

```
✅ Modification d'association
   → Recalcul automatique du min/max
   → Toast informatif
   → Valeurs mises à jour dans /inventory
   → Logs dans la console du serveur
   → Aucune intervention manuelle nécessaire
```

---

**Serveur redémarré. Vous pouvez maintenant tester ! 🚀**

**Si le problème persiste après le test, partagez-moi :**
1. Le toast que vous voyez
2. Les logs du serveur (s'il y en a)
3. La réponse de l'API (onglet Network dans F12)
