# 📦 GUIDE COMPLET - GESTION DU STOCK DE PIÈCES PAR ÉQUIPEMENT

**Date**: 1er Novembre 2025  
**Version**: 1.0.0  
**Module**: Equipment Parts Management

---

## 🎯 OBJECTIF

Implémenter un système de calcul de stock optimal pour les pièces détachées et consommables, en tenant compte que :
- **Une même pièce peut être utilisée sur plusieurs équipements**
- **Chaque équipement a des paramètres différents** (fréquence, criticité, importance)
- **Le stock global doit être calculé en agrégeant les besoins de chaque équipement**

---

## 📐 MÉTHODOLOGIE DE CALCUL

### Étape 1 : Décomposition par équipement

Pour chaque pièce, on crée une **association** avec chaque équipement qui l'utilise, incluant :

| Paramètre | Description | Exemple |
|-----------|-------------|---------|
| **Qté/machine** | Quantité utilisée lors d'un remplacement | 1, 2, 0.5 |
| **Fréquence/an** | Nombre de remplacements par an | 2 (tous les 6 mois), 0.5 (tous les 2 ans) |
| **Criticité** | Importance de la pièce pour cet équipement | low, medium, high, critical |
| **Importance machine** | Poids de l'équipement dans la production | 1-100 |
| **Délai appro (jours)** | Temps de réapprovisionnement | 15, 30, 60 |
| **Coeff. sécurité** | Marge de sécurité | 1.2 (+20%), 1.4 (+40%), 1.5 (+50%) |

### Étape 2 : Calcul de la consommation annuelle totale

```
CA_total = Σ (Qté/machine × Fréquence/an)
```

**Exemple** : Pièce B123 utilisée sur 3 machines
- Machine A : 1 × 2 = 2 pièces/an
- Machine B : 1 × 1 = 1 pièce/an
- Machine C : 2 × 0.5 = 1 pièce/an
- **Total : 4 pièces/an**

### Étape 3 : Pondération de la criticité globale

```
Criticité_moyenne = Σ (Criticité_numérique × Importance_machine) / Σ Importance_machine
```

**Scores de criticité** :
- low = 1
- medium = 2
- high = 3
- critical = 4

**Exemple** :
| Machine | Criticité | Score | Importance |
|---------|-----------|-------|------------|
| A | high | 3 | 50 |
| B | medium | 2 | 30 |
| C | low | 1 | 20 |

```
Criticité_moyenne = (3×50 + 2×30 + 1×20) / 100 = 2.3 → "medium+"
```

### Étape 4 : Calcul du stock de sécurité (SS)

```
SS = (Consommation journalière) × (Délai appro) × Coeff. sécurité
```

**Exemple** :
```
Consommation journalière = 4 / 365 = 0.011 pièces/jour
SS = 0.011 × 15 × 1.4 = 0.23 → arrondi à 1 pièce
```

### Étape 5 : Calcul du point de réapprovisionnement (SR)

```
SR = SS + (Consommation journalière × Délai appro)
```

**Exemple** :
```
SR = 1 + (0.011 × 15) = 1.16 → arrondi à 2 pièces
```

### Étape 6 : Stock initial recommandé

```
Stock initial = SR (Point de réapprovisionnement)
```

Puis ajuster selon la consommation réelle sur 3-6 mois.

---

## 🗄️ STRUCTURE DE DONNÉES

### Modèle `EquipmentPart` (Association)

```javascript
{
  // === RÉFÉRENCES ===
  equipment: ObjectId → Equipment (requis)
  part: ObjectId → Part (requis)
  
  // === PARAMÈTRES DE CONSOMMATION ===
  quantityPerMachine: Number (requis, min: 0.1, défaut: 1)
  replacementFrequencyPerYear: Number (requis, min: 0, défaut: 1)
  
  // === CRITICITÉ ET IMPORTANCE ===
  criticality: String (enum: low|medium|high|critical, défaut: medium)
  criticalityScore: Number (1-4, calculé auto)
  machineImportance: Number (1-100, défaut: 50)
  
  // === DÉLAIS ===
  leadTimeDays: Number (défaut: 15)
  safetyCoefficient: Number (1-3, défaut: 1.4)
  
  // === CALCULS AUTOMATIQUES ===
  annualConsumption: Number (calculé auto)
  dailyConsumption: Number (calculé auto)
  safetyStock: Number (calculé auto)
  reorderPoint: Number (calculé auto)
  
  // === HISTORIQUE ===
  lastReplacementDate: Date
  nextReplacementDate: Date
  replacementHistory: [{
    date: Date
    quantityUsed: Number
    performedBy: ObjectId → User
    notes: String
  }]
  
  // === MÉTADONNÉES ===
  isStandardPart: Boolean (défaut: true)
  notes: String
  changedBy: ObjectId → User (requis)
  createdAt: Date
  updatedAt: Date
}
```

### Index

```javascript
// Index unique pour éviter les doublons
{ equipment: 1, part: 1 } (unique)

// Index pour les requêtes fréquentes
{ equipment: 1 }
{ part: 1 }
```

---

## 🔧 API ENDPOINTS

### 1. Lister toutes les associations

```http
GET /api/equipment-parts
Query params:
  - equipment: ObjectId (optionnel)
  - part: ObjectId (optionnel)
  - criticality: low|medium|high|critical (optionnel)
  - page: Number (défaut: 1)
  - limit: Number (défaut: 50)

Response:
{
  "success": true,
  "associations": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

### 2. Pièces d'un équipement

```http
GET /api/equipment-parts/equipment/:equipmentId

Response:
{
  "success": true,
  "associations": [
    {
      "_id": "...",
      "part": {
        "name": "Courroie trapézoïdale",
        "partNumber": "B123",
        "currentStock": 5
      },
      "quantityPerMachine": 1,
      "replacementFrequencyPerYear": 2,
      "criticality": "high",
      "annualConsumption": 2,
      "safetyStock": 1,
      "reorderPoint": 2
    }
  ],
  "count": 12
}
```

### 3. Équipements utilisant une pièce

```http
GET /api/equipment-parts/part/:partId

Response:
{
  "success": true,
  "associations": [
    {
      "_id": "...",
      "equipment": {
        "model": "DDL-8700",
        "serialNumber": "DDL-001",
        "location": "Ligne 1"
      },
      "quantityPerMachine": 1,
      "replacementFrequencyPerYear": 2,
      "criticality": "high",
      "machineImportance": 80
    }
  ],
  "count": 5
}
```

### 4. Calcul du stock global pour une pièce ⭐

```http
GET /api/equipment-parts/part/:partId/global-stock

Response:
{
  "success": true,
  "part": {
    "_id": "...",
    "name": "Courroie trapézoïdale",
    "partNumber": "B123",
    "currentStock": 3
  },
  "globalStock": {
    "totalAnnualConsumption": 8.5,
    "totalDailyConsumption": 0.023,
    "weightedCriticality": 2.6,
    "weightedCriticalityLabel": "high",
    "globalSafetyStock": 2,
    "globalReorderPoint": 3,
    "recommendedInitialStock": 3,
    "equipmentCount": 5,
    "details": [
      {
        "equipment": { "model": "DDL-8700", ... },
        "quantityPerMachine": 1,
        "replacementFrequencyPerYear": 2,
        "annualConsumption": 2,
        "criticality": "high",
        "machineImportance": 80
      },
      ...
    ]
  },
  "status": "warning" // ok | warning | critical
}
```

### 5. Alertes de réapprovisionnement ⚠️

```http
GET /api/equipment-parts/reorder-alerts

Response:
{
  "success": true,
  "alerts": [
    {
      "part": {
        "name": "Courroie trapézoïdale",
        "partNumber": "B123",
        "currentStock": 1
      },
      "currentStock": 1,
      "reorderPoint": 3,
      "safetyStock": 2,
      "deficit": 2,
      "urgency": "critical", // critical | warning
      "equipmentCount": 5
    }
  ],
  "count": 8,
  "critical": 3,
  "warning": 5
}
```

### 6. Créer une association

```http
POST /api/equipment-parts
Authorization: Bearer <token>
Roles: admin, maintenance_manager

Body:
{
  "equipment": "6905d34141b95fdd650e50b7",
  "part": "6905d231c5e8f0db48d9b3c5",
  "quantityPerMachine": 1,
  "replacementFrequencyPerYear": 2,
  "criticality": "high",
  "machineImportance": 80,
  "leadTimeDays": 15,
  "safetyCoefficient": 1.4,
  "isStandardPart": true,
  "notes": "Courroie principale"
}

Response:
{
  "success": true,
  "association": { ... }
}
```

### 7. Modifier une association

```http
PATCH /api/equipment-parts/:id
Authorization: Bearer <token>
Roles: admin, maintenance_manager

Body: (tous les champs optionnels)
{
  "replacementFrequencyPerYear": 3,
  "criticality": "critical",
  "machineImportance": 90
}
```

### 8. Supprimer une association

```http
DELETE /api/equipment-parts/:id
Authorization: Bearer <token>
Roles: admin, maintenance_manager
```

### 9. Enregistrer un remplacement 🔧

```http
POST /api/equipment-parts/:id/record-replacement
Authorization: Bearer <token>

Body:
{
  "quantityUsed": 1,
  "notes": "Remplacement préventif"
}

Response:
{
  "success": true,
  "association": {
    ...
    "lastReplacementDate": "2025-11-01T14:30:00Z",
    "nextReplacementDate": "2026-05-01T14:30:00Z",
    "replacementHistory": [...]
  },
  "message": "Replacement recorded successfully"
}

Note: Le stock de la pièce est automatiquement décrémenté
```

---

## 💡 MÉTHODES UTILITAIRES

### Méthodes d'instance

```javascript
// Enregistrer un remplacement
await association.recordReplacement(quantityUsed, userId, notes);

// Vérifier si le remplacement est dû
const isDue = association.isReplacementDue(); // true/false

// Obtenir les statistiques de consommation
const stats = association.getConsumptionStats();
// {
//   annual: 2,
//   monthly: 0.17,
//   weekly: 0.04,
//   daily: 0.005,
//   safetyStock: 1,
//   reorderPoint: 2
// }
```

### Méthodes statiques

```javascript
// Calculer le stock global pour une pièce
const globalStock = await EquipmentPart.calculateGlobalStock(partId);

// Trouver les pièces nécessitant un réapprovisionnement
const alerts = await EquipmentPart.findPartsNeedingReorder();
```

---

## 📊 EXEMPLE COMPLET

### Scénario : Courroie trapézoïdale B123

#### Données d'entrée

| Machine | Qté/machine | Fréq/an | Criticité | Importance | Délai (j) |
|---------|-------------|---------|-----------|------------|-----------|
| Machine A (DDL-8700) | 1 | 2 | high | 80 | 15 |
| Machine B (DDL-8000) | 1 | 1 | medium | 50 | 15 |
| Machine C (CP-2000) | 2 | 0.5 | low | 30 | 15 |

#### Calculs automatiques

**1. Consommation annuelle par machine**
- Machine A : 1 × 2 = 2 pièces/an
- Machine B : 1 × 1 = 1 pièce/an
- Machine C : 2 × 0.5 = 1 pièce/an
- **Total : 4 pièces/an**

**2. Consommation journalière**
```
4 / 365 = 0.011 pièces/jour
```

**3. Criticité moyenne pondérée**
```
(3×80 + 2×50 + 1×30) / 160 = 2.44 → "medium-high"
```

**4. Stock de sécurité global**
```
Délai max = 15 jours
Coeff max = 1.4
SS = 0.011 × 15 × 1.4 = 0.23 → 1 pièce
```

**5. Point de réapprovisionnement global**
```
SR = 1 + (0.011 × 15) = 1.16 → 2 pièces
```

**6. Stock initial recommandé**
```
Stock initial = 2 pièces
```

#### Alertes

| Stock actuel | Statut | Action |
|--------------|--------|--------|
| 0-1 | 🔴 CRITICAL | Commander immédiatement |
| 2 | 🟠 WARNING | Commander bientôt |
| 3+ | 🟢 OK | Aucune action |

---

## 🎨 INTERFACE UTILISATEUR (À IMPLÉMENTER)

### Page : Détails d'un équipement

**Section : Pièces associées**

```
┌─────────────────────────────────────────────────────────────┐
│ 📦 Pièces et Consommables                        [+ Ajouter] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ 🔧 Courroie trapézoïdale B123                    [Modifier]  │
│    Qté: 1 | Fréq: 2/an | Criticité: 🔴 High                 │
│    Consommation: 2/an (0.005/jour)                           │
│    Stock de sécurité: 1 | Point de réappro: 2               │
│    Dernier remplacement: 15/05/2025                          │
│    Prochain: 15/11/2025 (dans 14 jours)                     │
│    [📝 Enregistrer remplacement]                             │
│                                                               │
│ ⚙️ Roulement à billes SKF-456                   [Modifier]  │
│    Qté: 2 | Fréq: 0.5/an | Criticité: 🟡 Medium            │
│    ...                                                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Page : Détails d'une pièce

**Section : Équipements utilisant cette pièce**

```
┌─────────────────────────────────────────────────────────────┐
│ 🏭 Équipements utilisant cette pièce                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ 📊 STOCK GLOBAL                                              │
│    Stock actuel: 3 pièces                        🟠 WARNING  │
│    Point de réappro: 5 pièces                                │
│    Stock de sécurité: 3 pièces                               │
│    Déficit: 2 pièces                                         │
│    [🛒 Commander maintenant]                                 │
│                                                               │
│ 📈 CONSOMMATION                                              │
│    Annuelle: 8.5 pièces                                      │
│    Mensuelle: 0.7 pièces                                     │
│    Journalière: 0.023 pièces                                 │
│                                                               │
│ 🏭 ÉQUIPEMENTS (5)                                           │
│    ┌─────────────────────────────────────────────┐          │
│    │ DDL-8700 (Ligne 1)              Importance: 80 │       │
│    │ Qté: 1 | Fréq: 2/an | Criticité: 🔴 High      │       │
│    │ Consommation: 2/an                              │       │
│    └─────────────────────────────────────────────┘          │
│    ┌─────────────────────────────────────────────┐          │
│    │ DDL-8000 (Ligne 2)              Importance: 50 │       │
│    │ Qté: 1 | Fréq: 1/an | Criticité: 🟡 Medium    │       │
│    │ Consommation: 1/an                              │       │
│    └─────────────────────────────────────────────┘          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Page : Alertes de réapprovisionnement

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Alertes de Réapprovisionnement                           │
│    🔴 3 critiques | 🟠 5 warnings                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ 🔴 CRITIQUE                                                  │
│    Courroie B123                                             │
│    Stock: 1 | Requis: 3 | Déficit: 2                       │
│    Utilisé sur 5 équipements                                 │
│    [🛒 Commander]                                            │
│                                                               │
│ 🔴 CRITIQUE                                                  │
│    Roulement SKF-456                                         │
│    Stock: 0 | Requis: 2 | Déficit: 2                       │
│    Utilisé sur 3 équipements                                 │
│    [🛒 Commander]                                            │
│                                                               │
│ 🟠 WARNING                                                   │
│    Filtre à huile F789                                       │
│    Stock: 5 | Requis: 8 | Déficit: 3                       │
│    Utilisé sur 10 équipements                                │
│    [🛒 Commander]                                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ CHECKLIST D'IMPLÉMENTATION

### Backend ✅
- [x] Modèle `EquipmentPart` avec tous les champs
- [x] Hook `pre-save` pour calculs automatiques
- [x] Méthodes d'instance (recordReplacement, isReplacementDue, etc.)
- [x] Méthodes statiques (calculateGlobalStock, findPartsNeedingReorder)
- [x] Routes API complètes (CRUD + calculs)
- [x] Validation avec Zod
- [x] Authentification et autorisation

### Frontend ⏳ (À faire)
- [ ] Client API TypeScript (`equipmentParts.ts`)
- [ ] Composant `EquipmentPartsList` (liste des pièces d'un équipement)
- [ ] Composant `EquipmentPartForm` (créer/modifier association)
- [ ] Composant `PartEquipmentsList` (équipements utilisant une pièce)
- [ ] Composant `GlobalStockCalculator` (affichage du stock global)
- [ ] Composant `ReorderAlerts` (alertes de réapprovisionnement)
- [ ] Composant `RecordReplacementDialog` (enregistrer un remplacement)
- [ ] Page `PartDetails` avec calcul global
- [ ] Intégration dans `EquipmentDetails`
- [ ] Dashboard avec alertes

### Tests ⏳ (À faire)
- [ ] Tests unitaires du modèle
- [ ] Tests des calculs (consommation, stock, criticité)
- [ ] Tests des routes API
- [ ] Tests d'intégration frontend

---

## 🚀 PROCHAINES ÉTAPES

1. **Tester les routes API** avec Postman ou curl
2. **Créer le client API TypeScript** côté frontend
3. **Implémenter les composants UI** React
4. **Ajouter au dashboard** les alertes de réapprovisionnement
5. **Créer des rapports** Excel/PDF de consommation
6. **Ajouter des graphiques** de consommation historique

---

## 📚 RESSOURCES

- **Modèle**: `server/models/EquipmentPart.js`
- **Routes**: `server/routes/equipmentPartsRoutes.js`
- **Documentation API**: Ce fichier

---

**Fin du guide**  
*Document créé par Cascade AI - 1er Novembre 2025*
