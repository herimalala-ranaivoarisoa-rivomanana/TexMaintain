# 🐛 Débogage: Dialog de Changement de Statut

## 🔍 Problème Rapporté

1. **Bouton "Save Status" actif** sans avoir sélectionné de personnel de maintenance
2. **Listes de choix non affichées** pour mechanic, electrician, maintenance worker

## 🧪 Tests à Effectuer

### Test 1: Vérifier les Logs Console

1. Ouvrir la console du navigateur (F12)
2. Aller sur `/asset`
3. Cliquer sur un équipement
4. Cliquer sur "Change Status"
5. Sélectionner "Under Repair", "Under Inspection" ou "Scheduled Maintenance"

**Logs attendus dans la console:**
```
Selected Status: under_repair
Is Maintenance Personnel Required: true
Mechanics: X  (nombre de mécaniciens chargés)
Electricians: Y  (nombre d'électriciens chargés)
Maintenance Workers: Z  (nombre d'ouvriers chargés)
```

### Test 2: Vérifier l'Affichage de la Section

Quand vous sélectionnez un statut de maintenance, vous devriez voir :

✅ **Section orange** (ou rouge si aucun personnel sélectionné) avec :
- Titre : "Maintenance Personnel *"
- Message : "Select at least one maintenance personnel..."
- 3 sélecteurs : Mechanic, Electrician, Maintenance Worker

❌ **Si la section n'apparaît pas**, vérifier :
- La valeur de `selectedStatus` dans les logs
- La valeur de `isMaintenancePersonnelRequired` dans les logs

### Test 3: Vérifier le Chargement du Personnel

Dans la console, chercher les logs :
```
Error fetching maintenance personnel: ...
```

Si cette erreur apparaît, cela signifie que les API ne répondent pas correctement.

## 🔧 Points de Vérification

### 1. Backend Actif

Vérifier que le serveur backend tourne :
```bash
cd server
npm run dev
```

Le serveur doit être sur `http://localhost:3000`

### 2. Routes API Disponibles

Tester manuellement les routes :

```bash
# Mechanics
curl http://localhost:3000/api/mechanics?isActive=true

# Electricians
curl http://localhost:3000/api/electricians?isActive=true

# Maintenance Workers
curl http://localhost:3000/api/maintenance-workers?isActive=true
```

**Réponse attendue** (pour chaque route):
```json
{
  "mechanics": [...],  // ou "electricians" ou "workers"
  "page": 1,
  "total": X,
  "totalPages": 1
}
```

### 3. Données en Base

Vérifier qu'il y a du personnel en base de données :

```bash
# Via Mongo Express
http://localhost:8081

# Ou via MongoDB shell
mongo mongodb://root:example@localhost:27017/texmaintain?authSource=admin

db.mechanics.find()
db.electricians.find()
db.maintenanceworkers.find()
```

## 🐛 Problèmes Possibles

### Problème 1: Personnel Non Chargé

**Symptôme**: Les listes sont vides

**Causes possibles**:
1. Backend ne répond pas
2. Pas de données en base
3. Erreur dans la requête API

**Solution**:
1. Vérifier les logs backend
2. Seed la base de données
3. Vérifier la console frontend pour les erreurs

### Problème 2: Section Non Affichée

**Symptôme**: La section orange n'apparaît pas

**Causes possibles**:
1. `selectedStatus` n'a pas la bonne valeur
2. `isMaintenancePersonnelRequired` est false
3. Problème de rendu conditionnel

**Solution**:
1. Vérifier les logs console
2. Vérifier que `selectedStatus` contient bien 'under_repair', 'under_inspection' ou 'scheduled_maintenance'

### Problème 3: Bouton Actif Sans Personnel

**Symptôme**: Le bouton "Change Status" est actif même sans personnel

**Causes possibles**:
1. `isSubmitDisabled` mal calculé
2. `hasMaintenancePersonnel` retourne true alors qu'il devrait être false
3. `isMaintenancePersonnelRequired` est false

**Solution**:
1. Ajouter des logs pour `isSubmitDisabled`
2. Vérifier les valeurs de `selectedMechanic`, `selectedElectrician`, `selectedMaintenanceWorker`

## 🔍 Code de Débogage Ajouté

```typescript
// Debug: Log when selectedStatus changes
useEffect(() => {
  const maintenanceStatuses = ['under_repair', 'under_inspection', 'scheduled_maintenance'];
  const isRequired = maintenanceStatuses.includes(selectedStatus);
  console.log('Selected Status:', selectedStatus);
  console.log('Is Maintenance Personnel Required:', isRequired);
  console.log('Mechanics:', mechanics.length);
  console.log('Electricians:', electricians.length);
  console.log('Maintenance Workers:', maintenanceWorkers.length);
}, [selectedStatus, mechanics, electricians, maintenanceWorkers]);
```

## 📊 Checklist de Débogage

- [ ] Backend tourne sur port 3000
- [ ] Frontend tourne sur port 5173
- [ ] MongoDB tourne (Docker)
- [ ] Console ouverte (F12)
- [ ] Logs visibles dans la console
- [ ] Routes API répondent (test curl)
- [ ] Données en base (mechanics, electricians, workers)
- [ ] Section orange apparaît quand statut sélectionné
- [ ] Listes de personnel affichées
- [ ] Bouton désactivé sans personnel
- [ ] Bouton activé avec personnel

## 🚀 Prochaines Étapes

1. **Ouvrir la console** (F12)
2. **Tester le changement de statut**
3. **Copier les logs** de la console
4. **Partager les logs** pour diagnostic

Les logs nous diront exactement où est le problème !
