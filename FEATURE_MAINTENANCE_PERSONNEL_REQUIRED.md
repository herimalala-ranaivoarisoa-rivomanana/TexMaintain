# ✅ Fonctionnalité: Personnel de Maintenance Requis pour "Under Repair"

## 📋 Description

Comme pour le changement de statut vers **"In Production"** qui nécessite la sélection d'un **machiniste**, le changement de statut vers **"Under Repair"** nécessite maintenant la sélection d'**au moins un personnel de maintenance** parmi :

- **Mechanic** (Mécanicien)
- **Electrician** (Électricien)  
- **Maintenance Worker** (Ouvrier de maintenance générale)

## 🎯 Règles de Validation

### Statut "In Production"
✅ **Requis:** 1 Machiniste
- Le système refuse le changement si aucun machiniste n'est sélectionné
- Message d'erreur: `"Machinist is required when setting asset to In Production"`

### Statut "Under Repair"
✅ **Requis:** Au moins 1 personnel de maintenance (Mechanic OU Electrician OU Maintenance Worker)
- Le système refuse le changement si aucun personnel n'est sélectionné
- Message d'erreur: `"At least one maintenance personnel (Mechanic, Electrician, or Maintenance Worker) is required when setting asset to Under Repair"`
- **Possibilités:**
  - ✅ Sélectionner uniquement un mécanicien
  - ✅ Sélectionner uniquement un électricien
  - ✅ Sélectionner uniquement un ouvrier
  - ✅ Sélectionner plusieurs personnes (ex: mécanicien + électricien)

## 🔧 Modifications Techniques

### 1. Modèle AssetStatusHistory

**Fichier:** `server/models/AssetStatusHistory.js`

**Nouveaux champs ajoutés:**

```javascript
mechanic: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Mechanic',
  required: false
},
electrician: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Electrician',
  required: false
},
maintenanceWorker: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'MaintenanceWorker',
  required: false
}
```

Ces champs permettent de tracer **qui** a effectué la réparation.

### 2. Service AssetStatusService

**Fichier:** `server/services/assetStatusService.js`

**Validation ajoutée:**

```javascript
// Validate required personnel for specific statuses
if (newStatus === 'in_production' && !machinistId) {
  throw new Error('Machinist is required when setting asset to In Production');
}

if (newStatus === 'under_repair') {
  if (!mechanicId && !electricianId && !maintenanceWorkerId) {
    throw new Error('At least one maintenance personnel (Mechanic, Electrician, or Maintenance Worker) is required when setting asset to Under Repair');
  }
}
```

**Création de l'historique mise à jour:**

```javascript
const historyEntry = await AssetStatusHistory.create({
  asset: assetId,
  previousStatus: previousStatus || null,
  newStatus,
  changedBy: userId,
  reason: reason || '',
  notes: notes || '',
  intervention: interventionId || null,
  machinist: machinistId || null,
  mechanic: mechanicId || null,           // ✅ Nouveau
  electrician: electricianId || null,     // ✅ Nouveau
  maintenanceWorker: maintenanceWorkerId || null, // ✅ Nouveau
  metadata,
  timestamp: new Date()
});
```

**Population des références:**

```javascript
if (mechanicId) {
  await historyEntry.populate('mechanic', 'matricule firstName lastName fullName');
}
if (electricianId) {
  await historyEntry.populate('electrician', 'matricule firstName lastName fullName');
}
if (maintenanceWorkerId) {
  await historyEntry.populate('maintenanceWorker', 'matricule firstName lastName fullName');
}
```

### 3. Route API

**Fichier:** `server/routes/assetRoutes.js`

**Endpoint:** `POST /api/asset/:id/change-status`

**Paramètres acceptés (req.body):**

```javascript
{
  status: string,              // Requis
  reason: string,              // Optionnel
  notes: string,               // Optionnel
  interventionId: string,      // Optionnel
  machinistId: string,         // Requis si status = 'in_production'
  mechanicId: string,          // Optionnel (requis avec electricianId ou maintenanceWorkerId si status = 'under_repair')
  electricianId: string,       // Optionnel (requis avec mechanicId ou maintenanceWorkerId si status = 'under_repair')
  maintenanceWorkerId: string  // Optionnel (requis avec mechanicId ou electricianId si status = 'under_repair')
}
```

**Validation dans la route:**

```javascript
// If status is "under_repair", at least one maintenance personnel is required
if (status === 'under_repair' && !mechanicId && !electricianId && !maintenanceWorkerId) {
  return res.status(400).json({ 
    message: 'At least one maintenance personnel (Mechanic, Electrician, or Maintenance Worker) is required when setting asset to Under Repair' 
  });
}
```

## 📊 Cas d'Utilisation

### Exemple 1: Changement vers "Under Repair" avec un mécanicien

**Requête:**
```javascript
POST /api/asset/6904ecd887e093f36b7cbd4b/change-status

{
  "status": "under_repair",
  "reason": "Problème de moteur",
  "notes": "Le moteur fait un bruit anormal",
  "mechanicId": "6904ecd887e093f36b7cbd50"
}
```

**Réponse:** ✅ Succès

### Exemple 2: Changement vers "Under Repair" avec électricien + mécanicien

**Requête:**
```javascript
POST /api/asset/6904ecd887e093f36b7cbd4b/change-status

{
  "status": "under_repair",
  "reason": "Problème électrique et mécanique",
  "notes": "Court-circuit détecté + courroie cassée",
  "electricianId": "6904ecd887e093f36b7cbd51",
  "mechanicId": "6904ecd887e093f36b7cbd50"
}
```

**Réponse:** ✅ Succès

### Exemple 3: Changement vers "Under Repair" SANS personnel

**Requête:**
```javascript
POST /api/asset/6904ecd887e093f36b7cbd4b/change-status

{
  "status": "under_repair",
  "reason": "Réparation nécessaire",
  "notes": "À réparer"
}
```

**Réponse:** ❌ Erreur 400
```json
{
  "message": "At least one maintenance personnel (Mechanic, Electrician, or Maintenance Worker) is required when setting asset to Under Repair"
}
```

## 🎨 Interface Frontend (À Implémenter)

### Composant de Changement de Statut

Lorsque l'utilisateur sélectionne le statut **"Under Repair"**, le formulaire doit afficher :

1. **Champ "Reason"** (Raison)
2. **Champ "Notes"** (Notes)
3. **Section "Maintenance Personnel"** avec :
   - ☐ **Mechanic** (liste déroulante des mécaniciens)
   - ☐ **Electrician** (liste déroulante des électriciens)
   - ☐ **Maintenance Worker** (liste déroulante des ouvriers)
   
**Validation côté client:**
- Au moins une des trois listes doit avoir une sélection
- Afficher un message d'erreur si aucun personnel n'est sélectionné

### Exemple de Code Frontend (React)

```typescript
const [selectedMechanic, setSelectedMechanic] = useState("");
const [selectedElectrician, setSelectedElectrician] = useState("");
const [selectedMaintenanceWorker, setSelectedMaintenanceWorker] = useState("");

const handleStatusChange = async () => {
  if (newStatus === 'under_repair') {
    if (!selectedMechanic && !selectedElectrician && !selectedMaintenanceWorker) {
      toast({
        title: "Error",
        description: "Please select at least one maintenance personnel",
        variant: "destructive"
      });
      return;
    }
  }

  await changeAssetStatus(assetId, {
    status: newStatus,
    reason,
    notes,
    mechanicId: selectedMechanic || undefined,
    electricianId: selectedElectrician || undefined,
    maintenanceWorkerId: selectedMaintenanceWorker || undefined
  });
};
```

## 📈 Avantages

1. **Traçabilité complète** - On sait toujours qui a effectué quelle réparation
2. **Responsabilisation** - Le personnel de maintenance est identifié pour chaque intervention
3. **Statistiques** - Possibilité d'analyser la charge de travail par personne
4. **Historique** - Consultation de l'historique des réparations par équipement et par personnel
5. **Conformité** - Respect des procédures de maintenance

## 🔍 Requêtes Utiles

### Voir l'historique des statuts avec le personnel

```javascript
GET /api/asset/:id/status-history
```

**Réponse:**
```json
{
  "history": [
    {
      "_id": "...",
      "asset": "...",
      "previousStatus": "breakdown",
      "newStatus": "under_repair",
      "changedBy": { "email": "admin@texmaintain.com", "role": "admin" },
      "reason": "Problème de moteur",
      "notes": "Le moteur fait un bruit anormal",
      "mechanic": {
        "matricule": "MEC001",
        "firstName": "Jean",
        "lastName": "Dupont",
        "fullName": "Jean Dupont"
      },
      "timestamp": "2025-10-31T20:00:00.000Z"
    }
  ]
}
```

## 🚀 Déploiement

### Étapes

1. ✅ **Backend modifié** - Modèle, service et routes mis à jour
2. ⏳ **Frontend à mettre à jour** - Ajouter les sélecteurs de personnel dans le formulaire de changement de statut
3. ⏳ **Tests** - Tester tous les scénarios de changement de statut

### Redémarrage du Serveur

Si nodemon est actif, le serveur a déjà redémarré automatiquement.

Sinon:
```bash
cd server
npm run dev
```

## 📝 Notes Importantes

- Les champs `mechanic`, `electrician` et `maintenanceWorker` sont **optionnels** dans le modèle, mais la **validation métier** les rend obligatoires pour le statut "under_repair"
- Un équipement peut être réparé par **plusieurs personnes** en même temps (ex: mécanicien + électricien)
- L'historique conserve **toutes** les informations pour une traçabilité complète
- Les données existantes ne sont **pas affectées** (les anciens enregistrements n'ont pas ces champs, ce qui est normal)

## ✅ Status

**Backend:** ✅ Implémenté et prêt
**Frontend:** ⏳ À implémenter
**Tests:** ⏳ À effectuer

---

**Prochaine étape:** Mettre à jour le frontend pour afficher les sélecteurs de personnel de maintenance lors du changement de statut vers "Under Repair".
