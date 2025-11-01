# ✅ Extension: Personnel de Maintenance pour 3 Statuts

## 🎯 Fonctionnalité Étendue

La validation du personnel de maintenance s'applique maintenant à **3 statuts** au lieu d'un seul :

### Statuts Concernés

| Statut | Label | Personnel Requis |
|--------|-------|------------------|
| `under_repair` | Under Repair | ≥1 parmi: Mechanic, Electrician, Maintenance Worker |
| `under_inspection` | Under Inspection | ≥1 parmi: Mechanic, Electrician, Maintenance Worker |
| `scheduled_maintenance` | Scheduled Maintenance | ≥1 parmi: Mechanic, Electrician, Maintenance Worker |

### Possibilités de Sélection

Pour chacun de ces statuts, vous pouvez :
- ✅ Sélectionner **uniquement un mécanicien**
- ✅ Sélectionner **uniquement un électricien**
- ✅ Sélectionner **uniquement un ouvrier**
- ✅ Sélectionner **deux personnes** (ex: mécanicien + électricien)
- ✅ Sélectionner **les trois** en même temps

---

## 🔧 Modifications Techniques

### 1. Backend - Service

**Fichier**: `server/services/equipmentStatusService.js`

**Avant** (1 seul statut):
```javascript
if (newStatus === 'under_repair') {
  if (!mechanicId && !electricianId && !maintenanceWorkerId) {
    throw new Error('At least one maintenance personnel...');
  }
}
```

**Après** (3 statuts):
```javascript
// Maintenance statuses requiring personnel
const maintenanceStatuses = ['under_repair', 'under_inspection', 'scheduled_maintenance'];
if (maintenanceStatuses.includes(newStatus)) {
  if (!mechanicId && !electricianId && !maintenanceWorkerId) {
    const statusLabel = STATUS_METADATA[newStatus]?.label || newStatus;
    throw new Error(`At least one maintenance personnel (Mechanic, Electrician, or Maintenance Worker) is required when setting equipment to ${statusLabel}`);
  }
}
```

**Avantages**:
- Message d'erreur dynamique avec le nom du statut
- Facile d'ajouter d'autres statuts à l'avenir
- Code plus maintenable

### 2. Backend - Route

**Fichier**: `server/routes/equipmentRoutes.js`

**Avant**:
```javascript
if (status === 'under_repair' && !mechanicId && !electricianId && !maintenanceWorkerId) {
  return res.status(400).json({ message: '...' });
}
```

**Après**:
```javascript
const maintenanceStatuses = ['under_repair', 'under_inspection', 'scheduled_maintenance'];
if (maintenanceStatuses.includes(status) && !mechanicId && !electricianId && !maintenanceWorkerId) {
  const { STATUS_METADATA } = require('../models/EquipmentStatusHistory');
  const statusLabel = STATUS_METADATA[status]?.label || status;
  return res.status(400).json({ 
    message: `At least one maintenance personnel (Mechanic, Electrician, or Maintenance Worker) is required when setting equipment to ${statusLabel}` 
  });
}
```

### 3. Frontend - Validation

**Fichier**: `client/src/components/EquipmentStatusDialog.tsx`

**Validation dans handleSubmit**:
```typescript
// Validate maintenance personnel for maintenance statuses
const maintenanceStatuses = ['under_repair', 'under_inspection', 'scheduled_maintenance'];
if (maintenanceStatuses.includes(selectedStatus)) {
  if (!selectedMechanic && !selectedElectrician && !selectedMaintenanceWorker) {
    toast({
      title: 'Validation Error',
      description: 'Please select at least one maintenance personnel (Mechanic, Electrician, or Maintenance Worker)',
      variant: 'destructive'
    });
    return;
  }
}
```

**Désactivation du bouton**:
```typescript
const maintenanceStatuses = ['under_repair', 'under_inspection', 'scheduled_maintenance'];
const isMaintenancePersonnelRequired = maintenanceStatuses.includes(selectedStatus);
const hasMaintenancePersonnel = selectedMechanic || selectedElectrician || selectedMaintenanceWorker;
const isSubmitDisabled = loading || !selectedStatus || loadingTransitions || 
  (isMaintenancePersonnelRequired && !hasMaintenancePersonnel);
```

**Affichage conditionnel de la section**:
```typescript
{/* Maintenance Personnel Selection (for maintenance statuses) */}
{isMaintenancePersonnelRequired && (
  <div className={`space-y-4 p-4 border rounded-lg ${!hasMaintenancePersonnel ? 'bg-red-50 border-red-300' : 'bg-orange-50'}`}>
    {/* ... sélecteurs ... */}
  </div>
)}
```

---

## 🎨 Comportement UI

### Scénario 1: Under Repair

1. Utilisateur sélectionne **"Under Repair"**
2. Section orange apparaît : "Maintenance Personnel *"
3. Message : "Select at least one maintenance personnel who will perform the maintenance work"
4. 3 sélecteurs : Mechanic, Electrician, Maintenance Worker
5. Bouton **désactivé** tant qu'aucun personnel n'est sélectionné
6. Dès qu'un personnel est sélectionné → Section devient **orange** et bouton **actif**

### Scénario 2: Under Inspection

1. Utilisateur sélectionne **"Under Inspection"**
2. **Même comportement** que Under Repair
3. Section orange avec 3 sélecteurs
4. Validation identique

### Scénario 3: Scheduled Maintenance

1. Utilisateur sélectionne **"Scheduled Maintenance"**
2. **Même comportement** que les deux autres
3. Section orange avec 3 sélecteurs
4. Validation identique

### Scénario 4: Autre Statut (ex: In Workshop)

1. Utilisateur sélectionne **"In Workshop"**
2. **Aucune section de personnel** n'apparaît
3. Bouton actif immédiatement
4. Pas de validation de personnel

---

## 🔄 Flux Complet

```
Frontend: EquipmentStatusDialog.tsx
  ↓
  1. Sélection d'un statut de maintenance
     (under_repair, under_inspection, ou scheduled_maintenance)
  ↓
  2. Détection: isMaintenancePersonnelRequired = true
  ↓
  3. Affichage section orange (bg-red-50 si vide)
  ↓
  4. Bouton "Change Status" désactivé
  ↓
  5. Utilisateur sélectionne ≥1 personnel
  ↓
  6. hasMaintenancePersonnel = true
  ↓
  7. Section devient orange (bg-orange-50)
  ↓
  8. Bouton "Change Status" activé
  ↓
  9. Clic sur bouton → Validation client
  ↓
  10. POST /api/equipment/:id/change-status
      {
        status: "under_inspection",
        reason: "Inspection périodique",
        notes: "Vérification complète",
        mechanicId: "...",
        electricianId: "..."
      }
  ↓
Backend: equipmentRoutes.js
  ↓
  11. Validation route: statut dans maintenanceStatuses ?
  ↓
  12. Vérification: au moins 1 personnel ?
  ↓
  13. Appel EquipmentStatusService.changeStatus()
  ↓
Service: equipmentStatusService.js
  ↓
  14. Validation métier: statut dans maintenanceStatuses ?
  ↓
  15. Vérification: au moins 1 personnel ?
  ↓
  16. Création EquipmentStatusHistory
      {
        equipment: ObjectId,
        previousStatus: "...",
        newStatus: "under_inspection",
        changedBy: userId,
        mechanic: mechanicId,
        electrician: electricianId,
        reason: "...",
        notes: "...",
        timestamp: Date
      }
  ↓
  17. Mise à jour Equipment.status
  ↓
  18. Population des références
  ↓
Response: { success, equipment, historyEntry }
  ↓
Frontend
  ↓
  19. Toast de succès
  ↓
  20. Fermeture dialog
  ↓
  21. Rafraîchissement liste
```

---

## 📊 Exemples de Requêtes

### Exemple 1: Under Repair avec Mécanicien

```javascript
POST /api/equipment/6904ecd887e093f36b7cbd4b/change-status

{
  "status": "under_repair",
  "reason": "Panne moteur",
  "notes": "Remplacement du moteur nécessaire",
  "mechanicId": "6904ecd887e093f36b7cbd50"
}
```

**Réponse**: ✅ 200 OK

### Exemple 2: Under Inspection avec Mécanicien + Électricien

```javascript
POST /api/equipment/6904ecd887e093f36b7cbd4b/change-status

{
  "status": "under_inspection",
  "reason": "Inspection trimestrielle",
  "notes": "Vérification complète mécanique et électrique",
  "mechanicId": "6904ecd887e093f36b7cbd50",
  "electricianId": "6904ecd887e093f36b7cbd51"
}
```

**Réponse**: ✅ 200 OK

### Exemple 3: Scheduled Maintenance avec les 3 Personnes

```javascript
POST /api/equipment/6904ecd887e093f36b7cbd4b/change-status

{
  "status": "scheduled_maintenance",
  "reason": "Maintenance préventive mensuelle",
  "notes": "Maintenance complète de tous les systèmes",
  "mechanicId": "6904ecd887e093f36b7cbd50",
  "electricianId": "6904ecd887e093f36b7cbd51",
  "maintenanceWorkerId": "6904ecd887e093f36b7cbd52"
}
```

**Réponse**: ✅ 200 OK

### Exemple 4: Under Repair SANS Personnel

```javascript
POST /api/equipment/6904ecd887e093f36b7cbd4b/change-status

{
  "status": "under_repair",
  "reason": "Réparation nécessaire",
  "notes": "À réparer"
}
```

**Réponse**: ❌ 400 Bad Request
```json
{
  "message": "At least one maintenance personnel (Mechanic, Electrician, or Maintenance Worker) is required when setting equipment to Under Repair"
}
```

---

## 🎯 Cas d'Usage

### Use Case 1: Réparation Simple

**Situation**: Un équipement tombe en panne (breakdown)

**Action**:
1. Changement de statut vers **"Under Repair"**
2. Sélection d'un **mécanicien**
3. Raison : "Panne moteur"
4. Le mécanicien effectue la réparation

**Traçabilité**: L'historique montre qui a fait la réparation

### Use Case 2: Inspection Complète

**Situation**: Inspection trimestrielle programmée

**Action**:
1. Changement de statut vers **"Under Inspection"**
2. Sélection d'un **mécanicien** ET d'un **électricien**
3. Raison : "Inspection Q1 2025"
4. Les deux techniciens inspectent l'équipement

**Traçabilité**: L'historique montre les deux personnes impliquées

### Use Case 3: Maintenance Préventive

**Situation**: Maintenance mensuelle planifiée

**Action**:
1. Changement de statut vers **"Scheduled Maintenance"**
2. Sélection de **tous les types** de personnel
3. Raison : "Maintenance préventive mensuelle"
4. Équipe complète effectue la maintenance

**Traçabilité**: L'historique montre toute l'équipe

---

## ✅ Avantages de l'Extension

### 1. Traçabilité Complète
- ✅ On sait **qui** effectue chaque type de maintenance
- ✅ Historique complet pour audits
- ✅ Responsabilisation du personnel

### 2. Flexibilité
- ✅ Possibilité de sélectionner **1, 2 ou 3 personnes**
- ✅ S'adapte à la complexité de l'intervention
- ✅ Équipes multidisciplinaires possibles

### 3. Cohérence
- ✅ Même logique pour les 3 statuts de maintenance
- ✅ Interface utilisateur uniforme
- ✅ Messages d'erreur clairs et dynamiques

### 4. Maintenabilité
- ✅ Code centralisé (tableau `maintenanceStatuses`)
- ✅ Facile d'ajouter d'autres statuts
- ✅ Validation double (client + serveur)

### 5. Statistiques
- ✅ Analyse de la charge de travail par personne
- ✅ Identification des compétences utilisées
- ✅ Planification des ressources

---

## 📈 Statistiques Possibles

Avec cette traçabilité, on peut calculer :

### Par Personnel
- Nombre d'interventions par personne
- Types d'interventions (réparation, inspection, maintenance)
- Temps moyen par intervention
- Charge de travail

### Par Équipement
- Qui intervient le plus sur cet équipement
- Types de compétences nécessaires
- Fréquence des interventions

### Globales
- Répartition des interventions par type de personnel
- Équipements nécessitant le plus d'interventions
- Tendances temporelles

---

## 🚀 Pour Tester

### Test 1: Under Repair
1. Aller sur `/equipment`
2. Sélectionner un équipement
3. Cliquer "Change Status"
4. Sélectionner **"Under Repair"**
5. ✅ Section orange apparaît
6. Sélectionner un mécanicien
7. ✅ Bouton actif
8. Valider
9. ✅ Statut changé avec succès

### Test 2: Under Inspection
1. Même procédure
2. Sélectionner **"Under Inspection"**
3. ✅ Section orange apparaît
4. Sélectionner mécanicien + électricien
5. ✅ Bouton actif
6. Valider
7. ✅ Statut changé avec les 2 personnes enregistrées

### Test 3: Scheduled Maintenance
1. Même procédure
2. Sélectionner **"Scheduled Maintenance"**
3. ✅ Section orange apparaît
4. Sélectionner les 3 types de personnel
5. ✅ Bouton actif
6. Valider
7. ✅ Statut changé avec les 3 personnes enregistrées

### Test 4: Validation
1. Sélectionner un statut de maintenance
2. **Ne sélectionner aucun personnel**
3. ✅ Section rouge
4. ✅ Bouton désactivé
5. Essayer de cliquer
6. ✅ Rien ne se passe (bouton désactivé)

---

## 📝 Résumé

### Statuts avec Personnel Requis (4 au total)

| Statut | Personnel Requis | Type |
|--------|------------------|------|
| `in_production` | Machinist (1 requis) | Production |
| `under_repair` | Mechanic/Electrician/Worker (≥1 requis) | Maintenance |
| `under_inspection` | Mechanic/Electrician/Worker (≥1 requis) | Maintenance |
| `scheduled_maintenance` | Mechanic/Electrician/Worker (≥1 requis) | Maintenance |

### Autres Statuts (10 sans personnel requis)

Tous les autres statuts ne nécessitent **pas** de sélection de personnel :
- setup_adjustment, paused_by_operator, changeover, breakdown, offline
- in_workshop, waiting_spare_parts, testing_after_repair, pending_validation
- stored, scrapped

---

**Status**: ✅ Implémenté et prêt à tester !
