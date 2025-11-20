# 🧪 GUIDE DE TEST FINAL - Gestion de Stock Avancée

**Date**: 1er Novembre 2025  
**Statut**: ✅ PRÊT À TESTER

---

## 🚀 Serveurs Lancés

### Backend
```
✅ Serveur : http://localhost:3000
✅ Status : RUNNING
```

### Frontend
```
✅ Application : http://localhost:5174
✅ Status : RUNNING
```

---

## 📋 CHECKLIST COMPLÈTE DES FONCTIONNALITÉS

### ✅ Fonctionnalités Implémentées

1. **Statut du Stock Automatique**
   - 🔴 Critique (≤ 50% min)
   - 🟠 Bas (≤ min)
   - 🟢 Normal (entre min et 90% max)
   - 🔵 Élevé (≥ 90% max)

2. **Bouton "Commander"**
   - Apparaît si stock bas/critique
   - Redirige vers détails de la pièce

3. **Gestion des Commandes**
   - Création de commandes
   - 5 statuts : pending → ordered → in_transit → received → cancelled
   - Mise à jour du stock automatique lors de la réception

4. **Calcul Automatique Min/Max**
   - Basé sur les associations équipements
   - Bouton "Calculer Min/Max"

5. **Affichage du Statut Partout**
   - Dans `/inventory/:id`
   - Dans `/equipment/:id/parts`
   - Dans `/equipment/:id/consumable`

6. **Terminologie Adaptée**
   - Parts : "Enregistrer un remplacement"
   - Consumables : "Enregistrer une utilisation"

---

## 🧪 TESTS À EFFECTUER

### Test 1 : Connexion et Navigation

```bash
1. Ouvrir http://localhost:5174
2. Se connecter avec :
   - Email : admin@texmaintain.com
   - Mot de passe : [votre mot de passe]
3. Vérifier que le dashboard s'affiche
```

**Résultat attendu :**
- ✅ Connexion réussie
- ✅ Dashboard affiché
- ✅ Menu de navigation visible

---

### Test 2 : Statut du Stock dans Inventory

```bash
1. Aller sur /inventory
2. Observer les cartes de pièces
3. Vérifier les badges de statut (🔴🟠🟢🔵)
```

**Résultat attendu :**
- ✅ Chaque pièce a un badge coloré
- ✅ Badge correspond au niveau de stock
- ✅ Stock actuel affiché

**Exemple :**
```
Pièce avec stock = 3, min = 10, max = 50
→ Badge : 🔴 Critique
```

---

### Test 3 : Détails d'une Pièce avec Statut Critique

```bash
1. Cliquer sur une pièce avec stock critique
2. Vérifier la page /inventory/:id
3. Observer le composant StockStatusCard
```

**Résultat attendu :**
- ✅ Badge 🔴 "Critique" affiché
- ✅ Message : "Stock critique ! Seulement X en stock"
- ✅ Bouton "Commander" visible et mis en évidence
- ✅ Section "Stock actuel / Min / Max" affichée
- ✅ Section "Commandes en cours" visible (vide si aucune)

---

### Test 4 : Créer une Commande

```bash
1. Sur /inventory/:id avec stock critique
2. Cliquer sur "Commander"
3. Remplir le formulaire :
   - Quantité : (suggérée automatiquement)
   - Date de livraison : dans 2 semaines
   - Fournisseur : Test Supplier
   - N° commande : CMD-TEST-001
   - Notes : Test de commande
4. Valider
```

**Résultat attendu :**
- ✅ Dialog s'ouvre avec formulaire
- ✅ Quantité suggérée = max - stock - pending
- ✅ Validation réussie
- ✅ Toast : "Commande créée avec succès"
- ✅ Commande apparaît dans "Commandes en cours"
- ✅ Badge statut : "Commandé" (bleu 🛒)
- ✅ Quantité en commande mise à jour

---

### Test 5 : Suivre une Commande

```bash
1. Commande avec statut "Commandé"
2. Cliquer sur "En transit"
3. Vérifier le changement de statut
4. Cliquer sur "Marquer comme reçu"
```

**Résultat attendu :**
- ✅ Statut change : "Commandé" → "En transit" (violet 🚚)
- ✅ Badge mis à jour
- ✅ Clic "Marquer comme reçu"
- ✅ Statut change : "En transit" → "Reçu" (vert ✅)
- ✅ Stock actuel augmenté de la quantité
- ✅ Quantité en commande diminuée
- ✅ Badge de statut recalculé (peut passer de 🔴 à 🟢)

---

### Test 6 : Calcul Automatique Min/Max

```bash
1. Pièce avec équipements associés
2. Sur /inventory/:id
3. Cliquer sur "Calculer Min/Max"
```

**Résultat attendu :**
- ✅ Toast : "Min/Max calculés avec succès"
- ✅ Valeurs minStock et maxStock mises à jour
- ✅ Affichage des nouvelles valeurs
- ✅ Statut du stock recalculé
- ✅ Badge mis à jour si nécessaire

**Exemple :**
```
Avant : min = 5, max = 20
Après calcul : min = 8, max = 45
(basé sur les associations équipements)
```

---

### Test 7 : Statut dans Equipment Parts

```bash
1. Aller sur /equipment
2. Cliquer sur un équipement
3. Aller sur l'onglet "Parts" ou "Consumables"
4. Observer les cartes de pièces
```

**Résultat attendu :**
- ✅ Chaque pièce affiche :
  - Badge de statut coloré (🔴🟠🟢🔵)
  - "Stock: X"
  - Bouton "Commander" si stock bas
  - Icône 🔗 pour accéder aux détails
- ✅ Section "Informations de stock" avec :
  - Stock actuel (gras)
  - Stock min (orange)
  - Stock max (vert)
  - Prix unitaire

---

### Test 8 : Terminologie Parts vs Consumables

```bash
1. Sur /equipment/:id/parts
2. Observer le bouton en bas de chaque carte
3. Sur /equipment/:id/consumable
4. Observer le bouton en bas de chaque carte
```

**Résultat attendu :**

**Parts :**
- ✅ Bouton : "📝 Enregistrer un remplacement"
- ✅ Clic → Dialog "Enregistrer un remplacement"
- ✅ Label : "Quantité remplacée"

**Consumables :**
- ✅ Bouton : "📝 Enregistrer une utilisation"
- ✅ Clic → Dialog "Enregistrer une utilisation"
- ✅ Label : "Quantité utilisée"

---

### Test 9 : Enregistrer un Remplacement (Part)

```bash
1. Sur /equipment/:id/parts
2. Trouver une pièce
3. Cliquer "📝 Enregistrer un remplacement"
4. Remplir :
   - Quantité remplacée : 1
   - Notes : Test remplacement
5. Valider
```

**Résultat attendu :**
- ✅ Dialog s'ouvre
- ✅ Titre : "Enregistrer un remplacement"
- ✅ Stock actuel affiché
- ✅ Nouveau stock calculé automatiquement
- ✅ Validation réussie
- ✅ Toast : "Replacement recorded successfully"
- ✅ Stock de la pièce décrémenté
- ✅ Date de remplacement enregistrée
- ✅ Prochain remplacement calculé

---

### Test 10 : Enregistrer une Utilisation (Consumable)

```bash
1. Sur /equipment/:id/consumable
2. Trouver un consommable
3. Cliquer "📝 Enregistrer une utilisation"
4. Remplir :
   - Quantité utilisée : 0.5
   - Notes : Test utilisation
5. Valider
```

**Résultat attendu :**
- ✅ Dialog s'ouvre
- ✅ Titre : "Enregistrer une utilisation"
- ✅ Stock actuel affiché
- ✅ Nouveau stock calculé automatiquement
- ✅ Validation réussie
- ✅ Toast : "Usage recorded successfully"
- ✅ Stock du consommable décrémenté
- ✅ Date d'utilisation enregistrée

---

### Test 11 : Lien vers Détails depuis Equipment

```bash
1. Sur /equipment/:id/parts
2. Cliquer sur l'icône 🔗 d'une pièce
```

**Résultat attendu :**
- ✅ Redirection vers /inventory/:id
- ✅ Page de détails complète s'affiche
- ✅ StockStatusCard visible
- ✅ GlobalStockCard visible
- ✅ PartEquipmentsList visible

---

### Test 12 : Alertes de Réapprovisionnement

```bash
1. Aller sur /reorder-alerts
2. Observer les alertes
3. Cliquer sur "Voir détails" d'une alerte
```

**Résultat attendu :**
- ✅ Liste des pièces critiques/basses
- ✅ Badge 🔴 ou 🟠 selon criticité
- ✅ Quantité manquante affichée
- ✅ Clic "Voir détails" → /inventory/:id
- ✅ Bouton "Commander" visible

---

## 🐛 PROBLÈMES POTENTIELS ET SOLUTIONS

### Problème 1 : Composant ne s'affiche pas

**Symptômes :**
- Erreur dans la console
- Page blanche

**Solutions :**
```bash
1. Vérifier la console (F12)
2. Vérifier les imports :
   - StockStatusCard
   - RecordUsageDialog
3. Vider le cache : Ctrl+Shift+R
4. Redémarrer le frontend
```

### Problème 2 : minStock/maxStock = 0

**Symptômes :**
- Toujours "Stock: X / Min: 0 / Max: 0"

**Solutions :**
```bash
1. Vérifier que l'API retourne minStock/maxStock
2. Vérifier le populate dans equipmentPartsRoutes.js
3. Redémarrer le backend
4. Vérifier dans MongoDB :
   db.parts.findOne({ _id: ObjectId("...") })
```

### Problème 3 : API 404

**Symptômes :**
- Erreur 404 sur /api/inventory/:id/order

**Solutions :**
```bash
1. Vérifier que le backend est redémarré
2. Vérifier les routes dans inventoryRoutes.js
3. Vérifier les logs du serveur
```

### Problème 4 : Badge de Statut Incorrect

**Symptômes :**
- Stock = 3, min = 10 mais badge 🟢 Normal

**Solutions :**
```bash
1. Vérifier que minStock et maxStock sont définis
2. Vérifier la fonction getStockStatus()
3. Vérifier les valeurs dans la console
4. Rafraîchir la page
```

---

## 📊 RÉSULTATS ATTENDUS GLOBAUX

### Avant les Améliorations
```
❌ Pas de statut de stock visible
❌ Pas de gestion des commandes
❌ Min/Max manuels uniquement
❌ Pas de visibilité dans equipment parts
❌ Terminologie incorrecte pour consumables
```

### Après les Améliorations
```
✅ Statut du stock partout (🔴🟠🟢🔵)
✅ Gestion complète des commandes
✅ Calcul automatique Min/Max
✅ Visibilité dans equipment parts/consumables
✅ Terminologie adaptée (remplacement/utilisation)
✅ Bouton "Commander" si stock bas
✅ Alertes automatiques
✅ Traçabilité complète
```

---

## 🎯 SCÉNARIO COMPLET DE TEST

### Scénario : Gestion d'une Pièce Critique

```
ÉTAPE 1 : DÉTECTION
1. Aller sur /inventory
2. Trouver une pièce avec stock = 3, min = 10
3. Vérifier badge 🔴 "Critique"

ÉTAPE 2 : CONSULTATION DÉTAILS
4. Cliquer sur la pièce
5. Vérifier /inventory/:id
6. Observer StockStatusCard :
   - Badge 🔴 "Critique"
   - Message d'alerte
   - Bouton "Commander" visible
   - Stock: 3 / Min: 10 / Max: 50

ÉTAPE 3 : COMMANDE
7. Cliquer "Commander"
8. Formulaire s'ouvre
9. Quantité suggérée : 47 (50 - 3 - 0)
10. Remplir :
    - Date : dans 2 semaines
    - Fournisseur : Test Supplier
    - N° : CMD-001
11. Valider

ÉTAPE 4 : VÉRIFICATION COMMANDE
12. Commande apparaît dans "Commandes en cours"
13. Badge : "Commandé" (bleu 🛒)
14. Quantité en commande : 47
15. Stock toujours : 3
16. Statut toujours : 🔴 Critique

ÉTAPE 5 : SUIVI
17. Cliquer "En transit"
18. Badge change : violet 🚚
19. Cliquer "Marquer comme reçu"
20. Badge change : vert ✅

ÉTAPE 6 : VÉRIFICATION FINALE
21. Stock mis à jour : 3 + 47 = 50
22. Quantité en commande : 0
23. Statut recalculé : 🔵 Élevé (50 ≥ 45)
24. Badge de statut : 🔵 "Élevé"

ÉTAPE 7 : CALCUL MIN/MAX
25. Cliquer "Calculer Min/Max"
26. Valeurs recalculées depuis équipements
27. Nouveau min : 8, max : 45
28. Statut recalculé : 🔵 Élevé (50 ≥ 40.5)

ÉTAPE 8 : VÉRIFICATION EQUIPMENT
29. Aller sur /equipment/[id]/parts
30. Trouver la pièce
31. Vérifier :
    - Badge 🔵 "Élevé"
    - Stock: 50
    - Min: 8, Max: 45
    - Pas de bouton "Commander"
    - Icône 🔗 présente

ÉTAPE 9 : ENREGISTRER REMPLACEMENT
32. Cliquer "📝 Enregistrer un remplacement"
33. Dialog s'ouvre
34. Quantité : 1
35. Valider
36. Stock : 50 → 49
37. Statut : toujours 🔵 Élevé

✅ SCÉNARIO COMPLET RÉUSSI !
```

---

## 📝 CHECKLIST FINALE

### Avant de Valider

- [ ] Tous les serveurs démarrés
- [ ] Cache navigateur vidé
- [ ] Connexion réussie
- [ ] Test 1 : Statut dans inventory ✓
- [ ] Test 2 : Détails d'une pièce ✓
- [ ] Test 3 : Créer une commande ✓
- [ ] Test 4 : Suivre une commande ✓
- [ ] Test 5 : Calculer Min/Max ✓
- [ ] Test 6 : Statut dans equipment parts ✓
- [ ] Test 7 : Terminologie parts/consumables ✓
- [ ] Test 8 : Enregistrer remplacement ✓
- [ ] Test 9 : Enregistrer utilisation ✓
- [ ] Test 10 : Lien vers détails ✓
- [ ] Test 11 : Alertes de réappro ✓
- [ ] Test 12 : Scénario complet ✓

---

## 🎉 VALIDATION FINALE

Si tous les tests passent :

```
✅ Statut du stock fonctionnel
✅ Gestion des commandes opérationnelle
✅ Calcul automatique Min/Max OK
✅ Affichage dans equipment parts OK
✅ Terminologie adaptée OK
✅ Navigation cohérente OK
✅ Traçabilité complète OK

🎉 SYSTÈME DE GESTION DE STOCK AVANCÉ VALIDÉ !
```

---

## 📞 EN CAS DE PROBLÈME

### Logs à Vérifier

**Backend :**
```bash
cd server
npm run dev
# Observer les logs dans le terminal
```

**Frontend :**
```bash
# Console du navigateur (F12)
# Observer les erreurs et warnings
```

**Base de Données :**
```bash
# MongoDB Compass ou CLI
db.parts.find().pretty()
db.equipmentparts.find().pretty()
```

---

**Document créé le 1er Novembre 2025**  
**Guide de test complet pour validation finale**
