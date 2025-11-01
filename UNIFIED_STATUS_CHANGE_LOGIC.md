# ✅ Logique Unifiée: Changement de Statut

## 🎯 Objectif

Les règles de changement de statut sont maintenant **identiques** dans `/equipment` et `/production-lines`.

## 🔄 API Unifiée

### Avant (Problème)

**Dans `/production-lines`:**
```typescript
// ❌ Utilisait updateEquipment (ne supporte pas le personnel)
await updateEquipment(equipmentId, { 
  status: newStatus,
  machinistId: selectedMachinistId 
})
```

**Dans `/equipment`:**
```typescript
// ✅ Utilisait changeEquipmentStatus (supporte tout le personnel)
await changeEquipmentStatus(equipmentId, {
  status: newStatus,
  machinistId,
  mechanicId,
  electricianId,
  maintenanceWorkerId
})
```

### Après (Solution)

**Les deux pages utilisent maintenant `changeEquipmentStatus`:**

```typescript
// ✅ Même API partout
await changeEquipmentStatus(equipmentId, {
  status: newStatus as EquipmentStatus,
  machinistId: selectedMachinistId || undefined,
  mechanicId: selectedMechanicId || undefined,
  electricianId: selectedElectricianId || undefined,
  maintenanceWorkerId: selectedMaintenanceWorkerId || undefined
})
```

## 📋 Règles Identiques

### Règle 1: In Production → Machinist Requis

**Validation:**
```typescript
if (newStatus === EQUIPMENT_STATUSES.IN_PRODUCTION && !selectedMachinistId) {
  toast({ 
    title: "Machinist Required", 
    description: "Please select a machinist for production", 
    variant: "destructive" 
  })
  return
}
```

**UI:**
- Section conditionnelle qui s'affiche
- Sélecteur de machinist avec liste
- Bouton désactivé sans machinist

### Règle 2: Maintenance Statuses → Personnel Requis

**Statuts concernés:**
- `UNDER_REPAIR`
- `UNDER_INSPECTION`
- `SCHEDULED_MAINTENANCE`

**Validation:**
```typescript
const maintenanceStatuses = [
  EQUIPMENT_STATUSES.UNDER_REPAIR, 
  EQUIPMENT_STATUSES.UNDER_INSPECTION, 
  EQUIPMENT_STATUSES.SCHEDULED_MAINTENANCE
]

if (maintenanceStatuses.includes(newStatus as EquipmentStatus)) {
  if (!selectedMechanicId && !selectedElectricianId && !selectedMaintenanceWorkerId) {
    toast({
      title: 'Validation Error',
      description: 'Please select at least one maintenance personnel (Mechanic, Electrician, or Maintenance Worker)',
      variant: 'destructive'
    })
    return
  }
}
```

**UI:**
- Section orange (ou rouge si vide) qui s'affiche
- 3 sélecteurs : Mechanic, Electrician, Maintenance Worker
- Possibilité de sélectionner 1, 2 ou 3 personnes
- Bouton désactivé sans personnel

## 🎨 Interface Utilisateur Identique

### Dans `/equipment` (EquipmentStatusDialog.tsx)

```typescript
{/* Maintenance Personnel Selection */}
{requiresMaintenancePersonnel && (
  <div className={`space-y-4 p-4 border rounded-lg ${!hasMaintenancePersonnel ? 'bg-red-50 border-red-300' : 'bg-orange-50'}`}>
    <div className="flex items-center gap-2">
      <Wrench className={`h-5 w-5 ${!hasMaintenancePersonnel ? 'text-red-600' : 'text-orange-600'}`} />
      <Label className={`text-base font-semibold ${!hasMaintenancePersonnel ? 'text-red-900' : 'text-orange-900'}`}>
        Maintenance Personnel *
      </Label>
    </div>
    {/* 3 sélecteurs */}
  </div>
)}
```

### Dans `/production-lines` (ProductionLines.tsx)

```typescript
{/* Maintenance Personnel Selection - Same logic */}
{[EQUIPMENT_STATUSES.UNDER_REPAIR, EQUIPMENT_STATUSES.UNDER_INSPECTION, EQUIPMENT_STATUSES.SCHEDULED_MAINTENANCE].includes(newStatus as EquipmentStatus) && (
  <div className={`space-y-4 p-4 border rounded-lg ${!selectedMechanicId && !selectedElectricianId && !selectedMaintenanceWorkerId ? 'bg-red-50 border-red-300' : 'bg-orange-50'}`}>
    <div className="flex items-center gap-2">
      <Wrench className={`h-5 w-5 ${!selectedMechanicId && !selectedElectricianId && !selectedMaintenanceWorkerId ? 'text-red-600' : 'text-orange-600'}`} />
      <Label className={`text-base font-semibold ${!selectedMechanicId && !selectedElectricianId && !selectedMaintenanceWorkerId ? 'text-red-900' : 'text-orange-900'}`}>
        Maintenance Personnel <span className="text-red-500">*</span>
      </Label>
    </div>
    {/* 3 sélecteurs */}
  </div>
)}
```

## 🔧 Modifications Effectuées

### 1. ProductionLines.tsx - Imports

```typescript
import { getEquipment, updateEquipment, changeEquipmentStatus } from "@/api/equipment"
import { getMachinists } from "@/api/machinists"
import { getMechanics } from "@/api/mechanics"
import { getElectricians } from "@/api/electricians"
import { getMaintenanceWorkers } from "@/api/maintenanceWorkers"
```

### 2. ProductionLines.tsx - États

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

### 3. ProductionLines.tsx - Chargement du Personnel

```typescript
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

useEffect(() => {
  fetchData()
  fetchMachinists()
  fetchMaintenancePersonnel()  // ← Ajouté
}, [])
```

### 4. ProductionLines.tsx - Validation

```typescript
const handleChangeStatus = async () => {
  if (!selectedEquipmentForStatus || !newStatus) return
  
  // Validate machinist for "In Production"
  if (newStatus === EQUIPMENT_STATUSES.IN_PRODUCTION && !selectedMachinistId) {
    toast({ 
      title: "Machinist Required", 
      description: "Please select a machinist for production", 
      variant: "destructive" 
    })
    return
  }
  
  // Validate maintenance personnel for maintenance statuses
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

### 5. ProductionLines.tsx - Bouton Désactivé

```typescript
<Button 
  onClick={handleChangeStatus} 
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

## 📊 Tableau Récapitulatif

| Statut | Personnel Requis | Validation | UI | API |
|--------|------------------|------------|-----|-----|
| **In Production** | Machinist (1) | ✅ Client + Serveur | Section conditionnelle | `changeEquipmentStatus` |
| **Under Repair** | Maintenance (≥1) | ✅ Client + Serveur | Section conditionnelle | `changeEquipmentStatus` |
| **Under Inspection** | Maintenance (≥1) | ✅ Client + Serveur | Section conditionnelle | `changeEquipmentStatus` |
| **Scheduled Maintenance** | Maintenance (≥1) | ✅ Client + Serveur | Section conditionnelle | `changeEquipmentStatus` |
| **Autres statuts** | Aucun | ❌ Pas de validation | Pas de section | `changeEquipmentStatus` |

## ✅ Cohérence Garantie

### Backend

**Route unique:** `POST /api/equipment/:id/change-status`

**Validation:**
```javascript
// In Production
if (status === 'in_production' && !machinistId) {
  return res.status(400).json({ message: 'Machinist required' })
}

// Maintenance statuses
const maintenanceStatuses = ['under_repair', 'under_inspection', 'scheduled_maintenance']
if (maintenanceStatuses.includes(status) && !mechanicId && !electricianId && !maintenanceWorkerId) {
  return res.status(400).json({ message: 'At least one maintenance personnel required' })
}
```

### Frontend

**Deux pages, même logique:**
- `/equipment` → `EquipmentStatusDialog.tsx`
- `/production-lines` → `ProductionLines.tsx`

**Même API:**
```typescript
import { changeEquipmentStatus } from "@/api/equipment"
```

**Même validation:**
```typescript
// In Production
if (newStatus === EQUIPMENT_STATUSES.IN_PRODUCTION && !selectedMachinistId) { ... }

// Maintenance
const maintenanceStatuses = [...]
if (maintenanceStatuses.includes(newStatus) && !mechanic && !electrician && !worker) { ... }
```

**Même UI:**
- Section conditionnelle
- Couleurs (rouge → orange)
- Messages d'erreur
- Bouton désactivé

## 🧪 Tests

### Test 1: In Production depuis /equipment
1. Aller sur `/equipment`
2. Cliquer "Change Status"
3. Sélectionner "In Production"
4. ✅ Section machinist apparaît
5. ✅ Bouton désactivé
6. Sélectionner un machinist
7. ✅ Bouton actif
8. Valider
9. ✅ Statut changé

### Test 2: In Production depuis /production-lines
1. Aller sur `/production-lines`
2. Cliquer sur un équipement
3. Cliquer "Change Status"
4. Sélectionner "In Production"
5. ✅ Section machinist apparaît
6. ✅ Bouton désactivé
7. Sélectionner un machinist
8. ✅ Bouton actif
9. Valider
10. ✅ Statut changé

### Test 3: Under Repair depuis /equipment
1. Aller sur `/equipment`
2. Cliquer "Change Status"
3. Sélectionner "Under Repair"
4. ✅ Section maintenance apparaît (rouge)
5. ✅ Bouton désactivé
6. Sélectionner un mécanicien
7. ✅ Section devient orange
8. ✅ Bouton actif
9. Valider
10. ✅ Statut changé

### Test 4: Under Repair depuis /production-lines
1. Aller sur `/production-lines`
2. Cliquer sur un équipement
3. Cliquer "Change Status"
4. Sélectionner "Under Repair"
5. ✅ Section maintenance apparaît (rouge)
6. ✅ Bouton désactivé
7. Sélectionner un mécanicien
8. ✅ Section devient orange
9. ✅ Bouton actif
10. Valider
11. ✅ Statut changé

## 🎯 Résultat

Les règles de changement de statut sont maintenant **100% identiques** dans `/equipment` et `/production-lines` :

- ✅ Même API backend
- ✅ Même validation client
- ✅ Même validation serveur
- ✅ Même interface utilisateur
- ✅ Même comportement
- ✅ Même traçabilité

**Aucune différence de comportement entre les deux pages !** 🎉
