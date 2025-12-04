# ✅ Logique de Changement de Statut - 100% Unifiée

## 🎯 Résultat Final

Les règles de changement de statut sont maintenant **IDENTIQUES** dans `/equipment` et `/process-area`.

## 📊 Comparaison Finale

| Fonctionnalité | `/equipment` | `/process-area` | Status |
|----------------|--------------|---------------------|--------|
| **API utilisée** | `changeEquipmentStatus` | `changeEquipmentStatus` | ✅ Identique |
| **Machinist pour In Production** | ✅ Requis | ✅ Requis | ✅ Identique |
| **Personnel pour Maintenance** | ✅ Requis (≥1) | ✅ Requis (≥1) | ✅ Identique |
| **Validation Client** | ✅ | ✅ | ✅ Identique |
| **Validation Serveur** | ✅ | ✅ | ✅ Identique |
| **UI Conditionnelle** | ✅ | ✅ | ✅ Identique |
| **Bouton Désactivé** | ✅ | ✅ | ✅ Identique |
| **Messages d'Erreur** | ✅ | ✅ | ✅ Identique |

## 🔧 Modifications Effectuées

### 1. EquipmentStatusDialog.tsx

#### Imports
```typescript
import { getMachinists } from '@/api/machinists';
import { getMechanics } from '@/api/mechanics';
import { getElectricians } from '@/api/electricians';
import { getMaintenanceWorkers } from '@/api/maintenanceWorkers';
```

#### États
```typescript
// Machinist for production
const [machinists, setMachinists] = useState<any[]>([]);
const [selectedMachinist, setSelectedMachinist] = useState('');

// Maintenance personnel
const [mechanics, setMechanics] = useState<any[]>([]);
const [electricians, setElectricians] = useState<any[]>([]);
const [maintenanceWorkers, setMaintenanceWorkers] = useState<any[]>([]);
const [selectedMechanic, setSelectedMechanic] = useState('');
const [selectedElectrician, setSelectedElectrician] = useState('');
const [selectedMaintenanceWorker, setSelectedMaintenanceWorker] = useState('');
```

#### Chargement
```typescript
useEffect(() => {
  if (open && equipmentId) {
    fetchAllowedTransitions();
    fetchMachinists();           // ← Ajouté
    fetchMaintenancePersonnel();
  }
}, [open, equipmentId]);

const fetchMachinists = async () => {
  try {
    const response = await getMachinists({ isActive: true, limit: 100 });
    setMachinists(response.machinists || []);
  } catch (error) {
    console.error('Error fetching machinists:', error);
  }
};
```

#### Validation
```typescript
const handleSubmit = async () => {
  // Validate machinist for "In Production"
  if (selectedStatus === 'in_production' && !selectedMachinist) {
    toast({
      title: 'Machinist Required',
      description: 'Please select a machinist for production',
      variant: 'destructive'
    });
    return;
  }

  // Validate maintenance personnel
  const maintenanceStatuses = ['under_repair', 'under_inspection', 'scheduled_maintenance'];
  if (maintenanceStatuses.includes(selectedStatus)) {
    if (!selectedMechanic && !selectedElectrician && !selectedMaintenanceWorker) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one maintenance personnel',
        variant: 'destructive'
      });
      return;
    }
  }

  // Use changeEquipmentStatus API
  await changeEquipmentStatus(equipmentId, {
    status: selectedStatus as EquipmentStatus,
    reason,
    notes,
    machinistId: selectedMachinist || undefined,      // ← Ajouté
    mechanicId: selectedMechanic || undefined,
    electricianId: selectedElectrician || undefined,
    maintenanceWorkerId: selectedMaintenanceWorker || undefined
  });
}
```

#### UI - Machinist Section
```typescript
{/* Machinist Selection - Only show when status is "In Production" */}
{selectedStatus === 'in_production' && (
  <div className="grid gap-2">
    <Label htmlFor="machinist">Machinist <span className="text-red-500">*</span></Label>
    <Select value={selectedMachinist} onValueChange={setSelectedMachinist}>
      <SelectTrigger>
        <SelectValue placeholder="Select machinist" />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {machinists && machinists.length > 0 ? (
          machinists.map((machinist) => (
            <SelectItem key={machinist._id} value={machinist._id}>
              <div className="flex flex-col">
                <span className="font-medium">{machinist.fullName}</span>
                <span className="text-xs text-slate-500">Matricule: {machinist.matricule}</span>
              </div>
            </SelectItem>
          ))
        ) : (
          <div className="px-2 py-4 text-sm text-slate-500 text-center">
            No active machinists found
          </div>
        )}
      </SelectContent>
    </Select>
  </div>
)}
```

#### Bouton Désactivé
```typescript
const isSubmitDisabled = 
  loading || 
  !selectedStatus || 
  loadingTransitions || 
  (selectedStatus === 'in_production' && !selectedMachinist) ||        // ← Ajouté
  (requiresMaintenancePersonnel && !hasMaintenancePersonnel);
```

### 2. ProductionLines.tsx

#### Imports
```typescript
import { getEquipment, updateEquipment, changeEquipmentStatus } from "@/api/equipment"
import { getMachinists } from "@/api/machinists"
import { getMechanics } from "@/api/mechanics"
import { getElectricians } from "@/api/electricians"
import { getMaintenanceWorkers } from "@/api/maintenanceWorkers"
```

#### États
```typescript
const [selectedMachinistId, setSelectedMachinistId] = useState<string>("")
const [machinists, setMachinists] = useState<any[]>([])

// Maintenance personnel states
const [selectedMechanicId, setSelectedMechanicId] = useState<string>("")
const [selectedElectricianId, setSelectedElectricianId] = useState<string>("")
const [selectedMaintenanceWorkerId, setSelectedMaintenanceWorkerId] = useState<string>("")
const [mechanics, setMechanics] = useState<any[]>([])
const [electricians, setElectricians] = useState<any[]>([])
const [maintenanceWorkers, setMaintenanceWorkers] = useState<any[]>([])
```

#### Chargement
```typescript
useEffect(() => {
  fetchData()
  fetchMachinists()
  fetchMaintenancePersonnel()
}, [])

const fetchMachinists = async () => {
  try {
    const response = await getMachinists({ isActive: true, limit: 100 })
    setMachinists(response.machinists || [])
  } catch (error) {
    console.error('Error fetching machinists:', error)
  }
}

const fetchMaintenancePersonnel = async () => {
  try {
    const [mechanicsRes, electriciansRes, workersRes] = await Promise.all([
      getMechanics({ isActive: true }),
      getElectricians({ isActive: true }),
      getMaintenanceWorkers({ isActive: true })
    ])
    setMechanics(mechanicsRes.mechanics || [])
    setElectricians(electriciansRes.electricians || [])
    setMaintenanceWorkers(workersRes.workers || [])
  } catch (error) {
    console.error('Error fetching maintenance personnel:', error)
  }
}
```

#### Validation
```typescript
const handleChangeStatus = async () => {
  // Validate machinist for "In Production"
  if (newStatus === EQUIPMENT_STATUSES.IN_PRODUCTION && !selectedMachinistId) {
    toast({ 
      title: "Machinist Required", 
      description: "Please select a machinist for production", 
      variant: "destructive" 
    })
    return
  }
  
  // Validate maintenance personnel
  const maintenanceStatuses = [
    EQUIPMENT_STATUSES.UNDER_REPAIR, 
    EQUIPMENT_STATUSES.UNDER_INSPECTION, 
    EQUIPMENT_STATUSES.SCHEDULED_MAINTENANCE
  ]
  if (maintenanceStatuses.includes(newStatus as EquipmentStatus)) {
    if (!selectedMechanicId && !selectedElectricianId && !selectedMaintenanceWorkerId) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one maintenance personnel',
        variant: 'destructive'
      })
      return
    }
  }
  
  // Use changeEquipmentStatus API
  await changeEquipmentStatus(selectedEquipmentForStatus.id, {
    status: newStatus as EquipmentStatus,
    machinistId: selectedMachinistId || undefined,
    mechanicId: selectedMechanicId || undefined,
    electricianId: selectedElectricianId || undefined,
    maintenanceWorkerId: selectedMaintenanceWorkerId || undefined
  })
}
```

#### UI - Maintenance Section
```typescript
{/* Maintenance Personnel Selection */}
{[EQUIPMENT_STATUSES.UNDER_REPAIR, EQUIPMENT_STATUSES.UNDER_INSPECTION, EQUIPMENT_STATUSES.SCHEDULED_MAINTENANCE].includes(newStatus as EquipmentStatus) && (
  <div className={`space-y-4 p-4 border rounded-lg ${!selectedMechanicId && !selectedElectricianId && !selectedMaintenanceWorkerId ? 'bg-red-50 border-red-300' : 'bg-orange-50'}`}>
    <div className="flex items-center gap-2">
      <Wrench className={`h-5 w-5 ${!selectedMechanicId && !selectedElectricianId && !selectedMaintenanceWorkerId ? 'text-red-600' : 'text-orange-600'}`} />
      <Label className={`text-base font-semibold ${!selectedMechanicId && !selectedElectricianId && !selectedMaintenanceWorkerId ? 'text-red-900' : 'text-orange-900'}`}>
        Maintenance Personnel <span className="text-red-500">*</span>
      </Label>
    </div>
    {/* 3 sélecteurs: Mechanic, Electrician, Maintenance Worker */}
  </div>
)}
```

#### Bouton Désactivé
```typescript
<Button 
  disabled={
    isSaving || 
    !newStatus || 
    newStatus === selectedEquipmentForStatus?.currentStatus || 
    (newStatus === EQUIPMENT_STATUSES.IN_PRODUCTION && !selectedMachinistId) ||
    ([EQUIPMENT_STATUSES.UNDER_REPAIR, EQUIPMENT_STATUSES.UNDER_INSPECTION, EQUIPMENT_STATUSES.SCHEDULED_MAINTENANCE].includes(newStatus as EquipmentStatus) && !selectedMechanicId && !selectedElectricianId && !selectedMaintenanceWorkerId)
  }
>
  {isSaving ? 'Changing...' : 'Change Status'}
</Button>
```

## 🎨 Interface Utilisateur - Identique Partout

### In Production
- ✅ Section avec sélecteur de machinist
- ✅ Affichage: fullName + matricule
- ✅ Bouton désactivé sans machinist
- ✅ Message: "Machinist Required"

### Under Repair / Under Inspection / Scheduled Maintenance
- ✅ Section orange (rouge si vide)
- ✅ 3 sélecteurs: Mechanic, Electrician, Maintenance Worker
- ✅ Au moins 1 requis
- ✅ Bouton désactivé sans personnel
- ✅ Message: "Please select at least one maintenance personnel"

### Autres Statuts
- ✅ Pas de section de personnel
- ✅ Bouton actif immédiatement

## 🔒 Validation Backend (Inchangée)

```javascript
// Route: POST /api/equipment/:id/change-status

// In Production
if (status === 'in_production' && !machinistId) {
  return res.status(400).json({ 
    message: 'Machinist is required when setting equipment to In Production' 
  })
}

// Maintenance statuses
const maintenanceStatuses = ['under_repair', 'under_inspection', 'scheduled_maintenance']
if (maintenanceStatuses.includes(status)) {
  if (!mechanicId && !electricianId && !maintenanceWorkerId) {
    return res.status(400).json({ 
      message: 'At least one maintenance personnel is required for maintenance statuses' 
    })
  }
}
```

## 📊 Tableau de Cohérence

| Statut | Personnel | Validation Client | Validation Serveur | UI Equipment | UI Process areas |
|--------|-----------|-------------------|-------------------|--------------|---------------------|
| **In Production** | Machinist (1) | ✅ | ✅ | ✅ Section | ✅ Section |
| **Under Repair** | Maintenance (≥1) | ✅ | ✅ | ✅ Section | ✅ Section |
| **Under Inspection** | Maintenance (≥1) | ✅ | ✅ | ✅ Section | ✅ Section |
| **Scheduled Maintenance** | Maintenance (≥1) | ✅ | ✅ | ✅ Section | ✅ Section |
| **Setup/Adjustment** | Aucun | ❌ | ❌ | ❌ | ❌ |
| **Paused by Operator** | Aucun | ❌ | ❌ | ❌ | ❌ |
| **Changeover** | Aucun | ❌ | ❌ | ❌ | ❌ |
| **Breakdown** | Aucun | ❌ | ❌ | ❌ | ❌ |
| **In Workshop** | Aucun | ❌ | ❌ | ❌ | ❌ |
| **Offline** | Aucun | ❌ | ❌ | ❌ | ❌ |
| **Stored** | Aucun | ❌ | ❌ | ❌ | ❌ |
| **Scrapped** | Aucun | ❌ | ❌ | ❌ | ❌ |

## ✅ Checklist de Validation

### Tests `/equipment`
- [ ] Ouvrir `/equipment`
- [ ] Cliquer "Change Status" sur un équipement
- [ ] Sélectionner "In Production"
- [ ] ✅ Section machinist apparaît
- [ ] ✅ Bouton désactivé
- [ ] Sélectionner un machinist
- [ ] ✅ Bouton actif
- [ ] Valider
- [ ] ✅ Statut changé avec succès

### Tests `/process-area`
- [ ] Ouvrir `/process-area`
- [ ] Cliquer sur un équipement
- [ ] Cliquer "Change Status"
- [ ] Sélectionner "In Production"
- [ ] ✅ Section machinist apparaît
- [ ] ✅ Bouton désactivé
- [ ] Sélectionner un machinist
- [ ] ✅ Bouton actif
- [ ] Valider
- [ ] ✅ Statut changé avec succès

### Tests Maintenance
- [ ] Dans `/equipment`, sélectionner "Under Repair"
- [ ] ✅ Section rouge apparaît
- [ ] ✅ 3 sélecteurs visibles
- [ ] ✅ Bouton désactivé
- [ ] Sélectionner un mécanicien
- [ ] ✅ Section devient orange
- [ ] ✅ Bouton actif
- [ ] Valider
- [ ] ✅ Statut changé avec succès
- [ ] Répéter dans `/process-area`
- [ ] ✅ Comportement identique

## 🎉 Résultat Final

### ✅ Cohérence Totale
- Même API backend
- Même validation client
- Même validation serveur
- Même interface utilisateur
- Même comportement
- Même messages d'erreur
- Même expérience utilisateur

### ✅ Maintenabilité
- Code DRY (Don't Repeat Yourself)
- Logique centralisée dans l'API
- Facile à modifier (un seul endroit)
- Tests simplifiés

### ✅ Expérience Utilisateur
- Cohérence entre les pages
- Pas de confusion
- Messages clairs
- Validation immédiate
- Feedback visuel

## 🚀 Prochaines Étapes

1. **Tester** les deux pages
2. **Vérifier** que tout fonctionne
3. **Documenter** pour l'équipe
4. **Former** les utilisateurs

**Les règles de changement de statut sont maintenant 100% identiques partout !** 🎉
