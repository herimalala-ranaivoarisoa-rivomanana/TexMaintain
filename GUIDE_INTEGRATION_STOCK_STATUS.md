# 🚀 GUIDE D'INTÉGRATION - STATUT DE STOCK ET COMMANDES

**Date**: 1er Novembre 2025  
**Statut**: ✅ PRÊT À TESTER

---

## ✅ CE QUI A ÉTÉ IMPLÉMENTÉ

### Backend (100% Complet)
1. ✅ Modèle Part amélioré avec gestion des commandes
2. ✅ Méthodes de calcul du statut de stock
3. ✅ Méthode de calcul automatique Min/Max
4. ✅ 4 nouvelles routes API
5. ✅ Hook pre-save pour calculer pendingQuantity

### Frontend (100% Complet)
1. ✅ API client avec nouvelles fonctions
2. ✅ Composant CreateOrderDialog
3. ✅ Composant StockStatusCard
4. ✅ Intégration dans PartDetails

---

## 🎯 FONCTIONNALITÉS DISPONIBLES

### 1. Statut du Stock Automatique
- 🔴 **Critique**: Stock ≤ 50% du minimum
- 🟠 **Bas**: Stock ≤ minimum  
- 🟢 **Normal**: Stock entre min et 90% du max
- 🔵 **Élevé**: Stock ≥ 90% du maximum

### 2. Bouton "Commander"
- Apparaît automatiquement si stock bas/critique
- Suggère la quantité optimale à commander
- Formulaire complet avec tous les champs

### 3. Gestion des Commandes
- **5 statuts**: pending → ordered → in_transit → received → cancelled
- Affichage de toutes les commandes en cours
- Actions de changement de statut
- Ajout automatique au stock lors de la réception

### 4. Calcul Automatique Min/Max
- Bouton "Calculer Min/Max" si équipements associés
- Utilise le calcul global de stock
- Met à jour automatiquement les valeurs

---

## 🔄 POUR TESTER

### Étape 1 : Redémarrer le Serveur Backend

```bash
# Arrêter le serveur (Ctrl+C)
cd server
npm run dev
```

**IMPORTANT** : Les modifications du modèle Part nécessitent un redémarrage !

### Étape 2 : Vider le Cache du Navigateur

```bash
1. Ouvrir DevTools (F12)
2. Onglet "Application" ou "Storage"
3. Cliquer sur "Clear storage" ou "Vider le cache"
4. Rafraîchir la page (Ctrl+Shift+R)
```

### Étape 3 : Tester les Fonctionnalités

#### Test 1 : Voir le Statut du Stock
```bash
1. Aller sur /part-details/[un-id-de-piece]
2. Observer la carte "Statut du Stock"
3. Vérifier le badge coloré (🔴🟠🟢🔵)
4. Vérifier les informations affichées
```

#### Test 2 : Créer une Commande
```bash
1. Si stock bas, cliquer sur "Commander"
2. Remplir le formulaire:
   - Quantité: (suggérée automatiquement)
   - Date de livraison: dans 2 semaines
   - Fournisseur: Test Supplier
   - N° commande: CMD-001
   - Notes: Test commande
3. Valider
4. Vérifier que la commande apparaît dans "Commandes en cours"
```

#### Test 3 : Suivre une Commande
```bash
1. Commande avec statut "Commandé" (bleu)
2. Cliquer sur "En transit"
3. Vérifier changement de statut (violet)
4. Cliquer sur "Marquer comme reçu"
5. Vérifier:
   - Statut = "Reçu" (vert)
   - Stock actuel augmenté
   - Quantité en commande diminuée
```

#### Test 4 : Calculer Min/Max
```bash
1. Pièce avec équipements associés
2. Cliquer sur "Calculer Min/Max"
3. Vérifier le toast de confirmation
4. Vérifier que Min et Max sont mis à jour
5. Vérifier que le statut du stock est recalculé
```

---

## 📊 EXEMPLE COMPLET

### Scénario : Pièce Critique

```
SITUATION INITIALE:
- Pièce: Courroie B123
- Stock actuel: 3
- Min: 10
- Max: 50
- Équipements associés: 5

ÉTAPE 1 - DÉTECTION:
✅ Statut affiché: CRITIQUE 🔴
✅ Message: "Stock critique ! Seulement 3 en stock (min: 10)"
✅ Bouton "Commander" visible
✅ Quantité suggérée: 47 pièces (50 - 3 - 0)

ÉTAPE 2 - COMMANDE:
✅ Clic sur "Commander"
✅ Formulaire pré-rempli avec quantité: 47
✅ Ajout date livraison: 15/11/2025
✅ Ajout fournisseur: Industrial Belts Ltd.
✅ Ajout N° commande: CMD-2025-042
✅ Validation

ÉTAPE 3 - SUIVI:
✅ Commande visible dans "Commandes en cours"
✅ Statut: "Commandé" (badge bleu 🛒)
✅ Quantité en commande: 47
✅ Stock actuel toujours: 3
✅ Statut stock: toujours CRITIQUE (car pas encore reçu)

ÉTAPE 4 - EXPÉDITION:
✅ Clic sur "En transit"
✅ Statut change: "En transit" (badge violet 🚚)
✅ Date de livraison visible

ÉTAPE 5 - RÉCEPTION:
✅ Clic sur "Marquer comme reçu"
✅ Stock actuel: 3 + 47 = 50
✅ Quantité en commande: 0
✅ Statut stock: NORMAL 🟢
✅ Commande archivée avec statut "Reçu" (badge vert ✅)

ÉTAPE 6 - OPTIMISATION:
✅ Clic sur "Calculer Min/Max"
✅ Système calcule à partir des 5 équipements
✅ Nouveau Min: 8 (stock de sécurité global)
✅ Nouveau Max: 45 (stock initial recommandé)
✅ Statut recalculé: ÉLEVÉ 🔵 (50 ≥ 45 × 0.9)
```

---

## 🎨 APERÇU VISUEL

### Carte Statut du Stock

```
┌─────────────────────────────────────────────────────┐
│ 📦 Statut du Stock          [Calculer Min/Max]     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ 🔴  CRITIQUE                    [Commander]   │ │
│  │     Stock critique ! Seulement 3 en stock     │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐          │
│  │  3   │  │  10  │  │  50  │  │  47  │          │
│  │Actuel│  │ Min  │  │ Max  │  │Cmd   │          │
│  └──────┘  └──────┘  └──────┘  └──────┘          │
│                                                     │
│  🛒 Commandes en cours (2)                         │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ 🔵 Commandé    47 pièce(s)                    │ │
│  │ N° CMD-2025-042                               │ │
│  │ Fournisseur: Industrial Belts Ltd.            │ │
│  │ Commandé le 01/11/2025                        │ │
│  │ Attendu le 15/11/2025                         │ │
│  │                                               │ │
│  │ [En transit]  [Annuler]                       │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  📊 Cette pièce est utilisée sur 5 équipement(s)   │
│     Le calcul automatique de Min/Max est disponible│
└─────────────────────────────────────────────────────┘
```

---

## 🐛 DÉPANNAGE

### Problème 1 : Composant ne s'affiche pas

**Symptômes** : Erreur dans la console

**Solutions** :
```bash
# Vérifier que tous les composants sont créés
ls client/src/components/CreateOrderDialog.tsx
ls client/src/components/StockStatusCard.tsx

# Vérifier les imports
# Dans PartDetails.tsx ligne 10
import { StockStatusCard } from '@/components/StockStatusCard'
```

### Problème 2 : API retourne 404

**Symptômes** : Erreur 404 sur `/api/inventory/:id/order`

**Solutions** :
```bash
# Vérifier que le serveur est redémarré
# Vérifier les routes dans server/routes/inventoryRoutes.js
# Lignes 178, 215, 250, 282
```

### Problème 3 : Statut ne se calcule pas

**Symptômes** : Statut toujours "Normal" même si stock bas

**Solutions** :
```bash
# Vérifier que minStock et maxStock sont définis
# Dans MongoDB:
db.parts.find({ minStock: { $exists: true } })

# Si non définis, les définir:
db.parts.updateMany(
  { minStock: { $exists: false } },
  { $set: { minStock: 10, maxStock: 50 } }
)
```

### Problème 4 : Calcul Min/Max ne fonctionne pas

**Symptômes** : Message "No asset associations found"

**Solutions** :
```bash
# Vérifier qu'il y a des associations
db.assetparts.find({ part: ObjectId("[PART_ID]") })

# Si aucune, créer des associations via l'interface:
/asset/[ID]/parts → Ajouter
```

---

## 📝 CHECKLIST DE VÉRIFICATION

Avant de considérer l'intégration comme complète :

- [ ] Serveur backend redémarré
- [ ] Cache navigateur vidé
- [ ] Composant StockStatusCard s'affiche
- [ ] Statut du stock calculé correctement
- [ ] Bouton "Commander" visible si stock bas
- [ ] Dialog de commande s'ouvre
- [ ] Commande créée avec succès
- [ ] Commande visible dans "Commandes en cours"
- [ ] Changement de statut fonctionne
- [ ] Réception ajoute au stock
- [ ] Bouton "Calculer Min/Max" visible si équipements
- [ ] Calcul Min/Max met à jour les valeurs
- [ ] Statut recalculé après changements

---

## 🎉 RÉSULTAT FINAL

Après intégration complète, vous aurez :

✅ **Visibilité complète** sur le statut de chaque pièce
✅ **Alertes automatiques** pour les stocks critiques
✅ **Gestion simplifiée** des commandes
✅ **Suivi en temps réel** des livraisons
✅ **Calcul automatique** des seuils optimaux
✅ **Réduction des ruptures** de stock
✅ **Optimisation des coûts** de stockage

---

## 📞 SUPPORT

Si vous rencontrez des problèmes :

1. **Vérifier les logs du serveur** (terminal backend)
2. **Vérifier la console du navigateur** (F12)
3. **Vérifier la base de données** (MongoDB)
4. **Consulter la documentation** (AMELIORATION_GESTION_STOCK_NOV_2025.md)

---

**Document créé le 1er Novembre 2025**  
**Système de gestion de stock avancé prêt à l'emploi ! 🚀**
