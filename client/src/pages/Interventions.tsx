import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Search, 
  Filter, 
  Plus, 
  Wrench, 
  AlertTriangle, 
  Clock,
  Calendar,
  CheckCircle,
  Package
} from "lucide-react"
import { Link } from "react-router-dom"
import { getInterventions, createIntervention, updateIntervention, deleteIntervention } from "@/api/interventions"
import { getProductionLines } from "@/api/productionLines"
import { getProductionSections } from "@/api/productionSections"
import { getEquipment, changeEquipmentStatus } from "@/api/equipment"
import { getMechanics } from "@/api/mechanics"
import { getElectricians } from "@/api/electricians"
import { getMaintenanceWorkers } from "@/api/maintenanceWorkers"
import { getMachinists } from "@/api/machinists"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/useToast"
import { saveAs } from "file-saver"

interface Intervention {
  _id: string
  title: string
  type: string
  priority: string
  status: string
  equipment: string
  equipmentId?: string
  assignedTo: string
  description?: string
  breakdownType?: string
  createdDate: string
  startedDate?: string
  completedDate?: string
  dueDate: string
  equipmentDetails?: {
    model?: string
    serialNumber?: string
    chipNumber?: string
    brand?: {
      name?: string
    }
  }
}

// Component to display duration that updates in real-time
function InterventionDuration({ startedDate, completedDate, status }: { startedDate?: string, completedDate?: string, status: string }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // Only update if intervention is in progress (not pending, completed or cancelled)
    if (status === 'In Progress') {
      const interval = setInterval(() => {
        setTick(t => t + 1); // Force re-render every second
      }, 1000); // Update every second

      return () => clearInterval(interval);
    }
  }, [status]);

  const duration = useMemo(() => {
    // If not started yet, show "-"
    if (!startedDate) {
      return '-';
    }
    
    const started = new Date(startedDate);
    const end = (status === 'Completed' || status === 'Cancelled') && completedDate
      ? new Date(completedDate)
      : new Date();
    const diffMs = end.getTime() - started.getTime();
    
    // If negative duration (completed before started was recorded), show "-"
    if (diffMs < 0) {
      return '-';
    }
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h`;
    } else if (diffHours > 0) {
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m`;
    }
  }, [startedDate, completedDate, status, tick]);

  return <span>{duration}</span>;
}

export function Interventions() {
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchParams, setSearchParams] = useSearchParams()
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || "all")
  const [dueDateFilter, setDueDateFilter] = useState<string>("all")
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10) || 1)
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState<number>(() => parseInt(localStorage.getItem('int_limit') || '12', 10) || 12)
  const [sort, setSort] = useState<string>(searchParams.get('sort') || 'createdDate')
  const [order, setOrder] = useState<'asc'|'desc'>((searchParams.get('order') as any) || 'desc')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newIntervention, setNewIntervention] = useState({
    title: "",
    type: "",
    priority: "",
    equipment: "",
    equipmentId: "",
    breakdownType: "",
    description: "",
    dueDate: "",
    equipmentStatus: "" // Status to set on equipment
  })
  const [productionLines, setProductionLines] = useState<any[]>([])
  const [productionSections, setProductionSections] = useState<any[]>([])
  const [equipmentList, setEquipmentList] = useState<any[]>([])
  const [selectedLine, setSelectedLine] = useState<string>("")
  const [selectedSection, setSelectedSection] = useState<string>("")
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null)
  const { toast } = useToast()
  const { user } = useAuth()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{id: string, status: string} | null>(null)
  const [equipmentStatusForUpdate, setEquipmentStatusForUpdate] = useState('')
  const [mechanics, setMechanics] = useState<any[]>([])
  const [electricians, setElectricians] = useState<any[]>([])
  const [maintenanceWorkers, setMaintenanceWorkers] = useState<any[]>([])
  const [machinists, setMachinists] = useState<any[]>([])
  const [selectedMechanicId, setSelectedMechanicId] = useState('')
  const [selectedElectricianId, setSelectedElectricianId] = useState('')
  const [selectedMaintenanceWorkerId, setSelectedMaintenanceWorkerId] = useState('')
  const [selectedMachinistId, setSelectedMachinistId] = useState('')

  // Load production lines on dialog open and reset form on close
  useEffect(() => {
    if (isDialogOpen) {
      loadProductionLines()
    } else {
      // Reset form when dialog closes
      setNewIntervention({
        title: "",
        type: "",
        priority: "",
        equipment: "",
        equipmentId: "",
        breakdownType: "",
        description: "",
        dueDate: "",
        equipmentStatus: ""
      })
      setSelectedLine("")
      setSelectedSection("")
      setProductionLines([])
      setProductionSections([])
      setEquipmentList([])
      setSelectedEquipment(null)
    }
  }, [isDialogOpen])

  // Load sections when line is selected
  useEffect(() => {
    if (selectedLine) {
      loadProductionSections(selectedLine)
    } else {
      setProductionSections([])
      setSelectedSection("")
    }
  }, [selectedLine])

  // Load equipment when section is selected
  useEffect(() => {
    if (selectedSection) {
      loadEquipment(selectedSection)
    } else {
      setEquipmentList([])
      setNewIntervention(prev => ({ ...prev, equipment: "", equipmentId: "" }))
    }
  }, [selectedSection])

  // Calculate due date when type and priority change
  useEffect(() => {
    if (newIntervention.type && newIntervention.priority) {
      const dueDate = calculateDueDate(newIntervention.type, newIntervention.priority)
      setNewIntervention(prev => ({ ...prev, dueDate }))
    }
  }, [newIntervention.type, newIntervention.priority])

  const loadProductionLines = async () => {
    try {
      const response = await getProductionLines({ limit: 100 })
      setProductionLines(response.productionLines || [])
    } catch (error) {
      console.error('Error loading production lines:', error)
    }
  }

  const loadProductionSections = async (lineId: string) => {
    try {
      const response = await getProductionSections({ productionLine: lineId })
      setProductionSections(response.sections || [])
    } catch (error) {
      console.error('Error loading production sections:', error)
    }
  }

  const loadEquipment = async (sectionId: string) => {
    try {
      // Load all equipment and filter by section client-side
      const response = await getEquipment({ limit: 1000 })
      console.log('All equipment loaded:', response.equipment?.length)
      
      const filtered = (response.equipment || []).filter((eq: any) => {
        const hasSection = eq.productionSection?._id === sectionId || eq.productionSection === sectionId
        console.log(`Equipment ${eq.location}: has section ${eq.productionSection?._id || eq.productionSection}, matches: ${hasSection}`)
        return hasSection
      })
      
      console.log(`Filtered equipment for section ${sectionId}:`, filtered.length)
      
      // If no equipment found with section, show all equipment as fallback
      if (filtered.length === 0) {
        console.warn('No equipment found for this section, showing all equipment')
        setEquipmentList(response.equipment || [])
      } else {
        setEquipmentList(filtered)
      }
    } catch (error) {
      console.error('Error loading equipment:', error)
    }
  }

  const calculateDueDate = (type: string, priority: string): string => {
    const now = new Date()
    let daysToAdd = 7 // default

    if (type === 'Emergency') {
      daysToAdd = 1 // 24 hours
    } else if (type === 'Corrective') {
      if (priority === 'Critical') daysToAdd = 1
      else if (priority === 'High') daysToAdd = 2
      else if (priority === 'Medium') daysToAdd = 5
      else daysToAdd = 7
    } else if (type === 'Preventive') {
      if (priority === 'High' || priority === 'Medium') daysToAdd = 7
      else daysToAdd = 14
    }

    const dueDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
    return dueDate.toISOString().split('T')[0] // Format YYYY-MM-DD
  }

  useEffect(() => {
    const fetchData = async () => {
      console.log('Fetching interventions data...')
      try {
        const params: any = { page, limit, sort, order }
        if (statusFilter && statusFilter !== 'all') params.status = statusFilter
        if (searchTerm) params.q = searchTerm
        
        const response = await getInterventions(params)
        // Map equipmentId to equipmentDetails for easier access
        const interventionsWithDetails = (response.interventions || []).map((intervention: any) => ({
          ...intervention,
          equipmentDetails: intervention.equipmentId || null
        }))
        setInterventions(interventionsWithDetails)
        setTotal(response.total || 0)
        console.log('Interventions data loaded successfully')
      } catch (error) {
        console.error('Error fetching interventions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [page, limit, sort, order, statusFilter, searchTerm])

  // Sync state to URL
  useEffect(() => {
    const next = new URLSearchParams()
    if (page && page !== 1) next.set('page', String(page))
    if (statusFilter && statusFilter !== 'all') next.set('status', statusFilter)
    if (searchTerm) next.set('q', searchTerm)
    if (sort && sort !== 'createdDate') next.set('sort', sort)
    if (order && order !== 'desc') next.set('order', order)
    setSearchParams(next, { replace: true })
  }, [page, statusFilter, searchTerm, sort, order, setSearchParams])

  // Persist limit
  useEffect(() => {
    localStorage.setItem('int_limit', String(limit))
  }, [limit])

  const rangeLabel = useMemo(() => {
    const start = total === 0 ? 0 : (page - 1) * limit + 1
    const end = Math.min(page * limit, total)
    return `${start}-${end} of ${total}`
  }, [page, limit, total])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-500'
      case 'High': return 'bg-orange-500'
      case 'Medium': return 'bg-yellow-500'
      case 'Low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-500'
      case 'In Progress': return 'bg-blue-500'
      case 'Pending': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle className="h-4 w-4" />
      case 'In Progress': return <Wrench className="h-4 w-4" />
      case 'Pending': return <Clock className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  const exportCSV = () => {
    const headers = ['Title','Type','Priority','Status','Equipment','AssignedTo','Created','Due']
    const rows = interventions.map(i => [
      i.title,
      i.type,
      i.priority,
      i.status,
      i.equipment,
      i.assignedTo || '',
      i.createdDate ? new Date(i.createdDate).toISOString() : '',
      i.dueDate ? new Date(i.dueDate).toISOString() : ''
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, `interventions_export_page${page}.csv`)
  }

  const handleCreateIntervention = async () => {
    // Validation
    if (!newIntervention.equipmentId) {
      toast({
        title: "Validation Error",
        description: "Please select an equipment",
        variant: "destructive",
      })
      return
    }

    // Validation for breakdown (always required)
    if (!newIntervention.breakdownType || !newIntervention.description) {
      toast({
        title: "Informations Manquantes",
        description: "Veuillez renseigner le type et la description de la panne",
        variant: "destructive",
      })
      return
    }

    try {
      // Prepare clean intervention data (only fields expected by backend)
      const interventionData = {
        title: newIntervention.title,
        type: 'Emergency',
        priority: 'Critical',
        equipment: newIntervention.equipment,
        equipmentId: newIntervention.equipmentId,
        breakdownType: newIntervention.breakdownType,
        description: newIntervention.description,
        assignedTo: '',
        status: 'Pending'
      }
      
      console.log('Creating breakdown intervention...', interventionData)
      const tempId = `temp-${Date.now()}`
      const temp = { 
        _id: tempId, 
        createdDate: new Date().toISOString(), 
        dueDate: new Date().toISOString(),
        ...interventionData
      }
      setInterventions([temp as any, ...interventions])
      
      try {
        // Create intervention first
        console.log('Sending to API:', interventionData)
        const res = await createIntervention(interventionData)
        console.log('API Response:', res)
        const created = (res as any).intervention
        setInterventions(list => list.map(i => i._id === tempId ? created : i))
        
        // Always change equipment status to breakdown
        if (interventionData.equipmentId) {
          try {
            await changeEquipmentStatus(interventionData.equipmentId, {
              status: 'breakdown' as any,
              reason: `Intervention created: ${interventionData.title}`,
              notes: interventionData.description,
              interventionId: created._id,
              breakdownType: interventionData.breakdownType,
              breakdownDescription: interventionData.description
            })
            console.log(`✅ Equipment status changed to breakdown`)
          } catch (statusError) {
            console.error('Error changing equipment status:', statusError)
            // Don't fail the whole operation if status change fails
            toast({
              title: "Warning",
              description: "Intervention created but equipment status change failed",
              variant: "destructive",
            })
          }
        }
      } catch (err) {
        setInterventions(list => list.filter(i => i._id !== tempId))
        throw err
      }
      
      toast({
        title: "Success",
        description: "Intervention created and equipment status set to breakdown",
      })
      setIsDialogOpen(false)
    } catch (error: any) {
      console.error('Error creating intervention:', error)
      console.error('Error response:', error.response?.data)
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to create intervention",
        variant: "destructive",
      })
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    // Open dialog to ask for equipment status
    setPendingStatusUpdate({ id, status })
    
    // Get the intervention to check for breakdown type and equipment
    const intervention = interventions.find(i => i._id === id)
    const breakdownType = intervention?.breakdownType
    
    // Pre-select appropriate status based on action
    if (status === 'In Progress') {
      setEquipmentStatusForUpdate('under_repair')
    } else if (status === 'Completed') {
      setEquipmentStatusForUpdate('in_production')
    } else {
      setEquipmentStatusForUpdate('')
    }
    
    setSelectedMechanicId('')
    setSelectedElectricianId('')
    setSelectedMaintenanceWorkerId('')
    setSelectedMachinistId('')
    
    // Load all personnel
    try {
      console.log('Loading personnel...')
      const [mechanicsData, electriciansData, workersData, machinistsData] = await Promise.all([
        getMechanics({ limit: 1000 }),
        getElectricians({ limit: 1000 }),
        getMaintenanceWorkers({ limit: 1000 }),
        getMachinists({ limit: 1000 })
      ])
      
      console.log('Mechanics loaded:', mechanicsData.mechanics?.length || 0)
      console.log('Electricians loaded:', electriciansData.electricians?.length || 0)
      console.log('Workers loaded:', workersData.workers?.length || 0)
      console.log('Machinists loaded:', machinistsData.machinists?.length || 0)
      
      const loadedMechanics = mechanicsData.mechanics || []
      const loadedElectricians = electriciansData.electricians || []
      const loadedWorkers = workersData.workers || []
      const loadedMachinists = machinistsData.machinists || []
      
      setMechanics(loadedMechanics)
      setElectricians(loadedElectricians)
      setMaintenanceWorkers(loadedWorkers)
      setMachinists(loadedMachinists)
      
      // Auto-suggest personnel based on breakdown type
      console.log('=== AUTO-SUGGESTION DEBUG ===')
      console.log('Intervention:', intervention)
      console.log('Breakdown type:', breakdownType)
      console.log('Loaded mechanics:', loadedMechanics.length, loadedMechanics)
      console.log('Loaded electricians:', loadedElectricians.length, loadedElectricians)
      console.log('Loaded workers:', loadedWorkers.length, loadedWorkers)
      
      if (breakdownType === 'mechanical' && loadedMechanics.length > 0) {
        setSelectedMechanicId(loadedMechanics[0]._id)
        console.log('✓ Mechanic auto-selected:', loadedMechanics[0].fullName || loadedMechanics[0].firstName)
      } else if (breakdownType === 'electrical' && loadedElectricians.length > 0) {
        setSelectedElectricianId(loadedElectricians[0]._id)
        console.log('✓ Electrician auto-selected:', loadedElectricians[0].fullName || loadedElectricians[0].firstName)
      } else if (breakdownType && loadedWorkers.length > 0) {
        setSelectedMaintenanceWorkerId(loadedWorkers[0]._id)
        console.log('✓ Maintenance worker auto-selected:', loadedWorkers[0].fullName || loadedWorkers[0].firstName)
      } else {
        // Fallback: if no breakdownType, suggest mechanic by default for maintenance work
        if (loadedMechanics.length > 0) {
          setSelectedMechanicId(loadedMechanics[0]._id)
          console.log('✓ Mechanic auto-selected (default fallback):', loadedMechanics[0].fullName || loadedMechanics[0].firstName)
        } else {
          console.log('❌ No personnel auto-selected')
          console.log('Reason: breakdownType =', breakdownType, ', mechanics =', loadedMechanics.length, ', electricians =', loadedElectricians.length, ', workers =', loadedWorkers.length)
        }
      }
    } catch (error) {
      console.error('Error loading personnel:', error)
    }
    
    setStatusDialogOpen(true)
  }

  const confirmStatusUpdate = async () => {
    if (!pendingStatusUpdate) return
    
    const { id, status } = pendingStatusUpdate
    try {
      setUpdatingId(id)
      const prev = interventions
      setInterventions(prev.map(i => i._id === id ? { ...i, status } : i))
      try {
        const updateData: any = { status }
        if (equipmentStatusForUpdate) {
          updateData.equipmentStatus = equipmentStatusForUpdate
          updateData.equipmentStatusReason = `Intervention status changed to ${status}`
          
          // Add personnel if selected
          if (selectedMechanicId) updateData.mechanicId = selectedMechanicId
          if (selectedElectricianId) updateData.electricianId = selectedElectricianId
          if (selectedMaintenanceWorkerId) updateData.maintenanceWorkerId = selectedMaintenanceWorkerId
          if (selectedMachinistId) updateData.machinistId = selectedMachinistId
        }
        await updateIntervention(id, updateData)
      } catch (err) {
        setInterventions(prev)
        throw err
      }
      toast({ title: 'Updated', description: 'Intervention status updated' })
      setStatusDialogOpen(false)
      setPendingStatusUpdate(null)
    } catch (error: any) {
      console.error('Error updating intervention:', error)
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to update status', variant: 'destructive' })
    }
    finally {
      setUpdatingId(null)
    }
  }

  const handleDeleteIntervention = async (id: string) => {
    try {
      setDeletingId(id)
      const prev = interventions
      setInterventions(prev.filter(i => i._id !== id))
      try {
        await deleteIntervention(id)
        toast({ title: 'Deleted', description: 'Intervention deleted' })
      } catch (err) {
        setInterventions(prev)
        throw err
      }
    } catch (error) {
      console.error('Error deleting intervention:', error)
      toast({ title: 'Error', description: 'Failed to delete intervention', variant: 'destructive' })
    }
    finally {
      setDeletingId(null)
    }
  }

  const filteredInterventions = useMemo(() => {
    return interventions.filter(intervention => {
      // Filter by due date status
      if (dueDateFilter !== 'all') {
        const now = new Date();
        const dueDate = intervention.dueDate ? new Date(intervention.dueDate) : null;
        
        if (dueDateFilter === 'overdue') {
          if (!dueDate || dueDate >= now || intervention.status === 'Completed' || intervention.status === 'Cancelled') {
            return false;
          }
        } else if (dueDateFilter === 'due-soon') {
          if (!dueDate || intervention.status === 'Completed' || intervention.status === 'Cancelled') {
            return false;
          }
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilDue < 0 || daysUntilDue > 1) {
            return false;
          }
        } else if (dueDateFilter === 'no-due-date') {
          if (dueDate) {
            return false;
          }
        }
      }
      
      return true;
    });
  }, [interventions, dueDateFilter])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Interventions
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage maintenance interventions and work orders
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>Export CSV</Button>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              <Plus className="mr-2 h-4 w-4" />
              New Intervention
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] bg-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Intervention</DialogTitle>
              <DialogDescription>
                Create a new maintenance intervention for equipment.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Helper Message */}
              {!selectedEquipment && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    👉 Sélectionnez une ligne de production, puis une section, puis un équipement pour commencer
                  </p>
                </div>
              )}

              {/* Production Line */}
              <div className="grid gap-2">
                <Label htmlFor="productionLine">Production Line</Label>
                <Select value={selectedLine} onValueChange={setSelectedLine}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select production line" />
                  </SelectTrigger>
                  <SelectContent>
                    {productionLines.map((line) => (
                      <SelectItem key={line._id} value={line._id}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Production Section */}
              <div className="grid gap-2">
                <Label htmlFor="productionSection">Production Section</Label>
                <Select 
                  value={selectedSection} 
                  onValueChange={setSelectedSection}
                  disabled={!selectedLine}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedLine ? "Select section" : "Select line first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {productionSections.map((section) => (
                      <SelectItem key={section._id} value={section._id}>
                        {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Equipment Selection */}
              <div className="grid gap-2">
                <Label htmlFor="equipment">Equipment <span className="text-red-500">*</span></Label>
                <Select 
                  value={newIntervention.equipmentId} 
                  onValueChange={(value) => {
                    const equipment = equipmentList.find(e => e._id === value)
                    setSelectedEquipment(equipment)
                    setNewIntervention({
                      ...newIntervention, 
                      equipmentId: value,
                      equipment: equipment?.location || '',
                      title: equipment?.location ? `Intervention - ${equipment.location}` : ''
                    })
                  }}
                  disabled={!selectedSection}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedSection ? "Select equipment" : "Select section first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentList.map((equip) => (
                      <SelectItem key={equip._id} value={equip._id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{equip.category?.name || 'N/A'}</span>
                          <span className="text-xs text-slate-500">{equip.type?.name || 'N/A'}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Equipment Details - Show when equipment is selected */}
              {selectedEquipment && (
                <div className="grid gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-500">Model</Label>
                      <p className="text-sm font-medium">{selectedEquipment.model || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Serial Number</Label>
                      <p className="text-sm font-medium">{selectedEquipment.serialNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Chip Number</Label>
                      <p className="text-sm font-medium">{selectedEquipment.chipNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Brand</Label>
                      <p className="text-sm font-medium">{selectedEquipment.brand?.name || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Display - Always Breakdown */}
              {selectedEquipment && (
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-900">Breakdown</span>
                  </div>
                </div>
              )}

              {/* Breakdown Information - Always shown when equipment selected */}
              {selectedEquipment && (
                <div className={`space-y-4 p-4 border rounded-lg ${!newIntervention.breakdownType || !newIntervention.description ? 'bg-red-50 border-red-300' : 'bg-yellow-50 border-yellow-300'}`}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-5 w-5 ${!newIntervention.breakdownType || !newIntervention.description ? 'text-red-600' : 'text-yellow-600'}`} />
                    <Label className={`text-base font-semibold ${!newIntervention.breakdownType || !newIntervention.description ? 'text-red-900' : 'text-yellow-900'}`}>
                      Informations sur la Panne <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  <p className={`text-sm ${!newIntervention.breakdownType || !newIntervention.description ? 'text-red-700 font-medium' : 'text-yellow-700'}`}>
                    {!newIntervention.breakdownType || !newIntervention.description ? '⚠️ Veuillez renseigner le type et la description de la panne' : 'Ces informations aideront à suggérer le bon personnel de maintenance'}
                  </p>
                  
                  {/* Breakdown Type */}
                  <div className="grid gap-2">
                    <Label htmlFor="breakdownType">Type de Panne <span className="text-red-500">*</span></Label>
                    <Select value={newIntervention.breakdownType} onValueChange={(value) => setNewIntervention({...newIntervention, breakdownType: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le type de panne" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mechanical">Mécanique</SelectItem>
                        <SelectItem value="electrical">Électrique</SelectItem>
                        <SelectItem value="hydraulic">Hydraulique</SelectItem>
                        <SelectItem value="pneumatic">Pneumatique</SelectItem>
                        <SelectItem value="electronic">Électronique</SelectItem>
                        <SelectItem value="software">Logiciel</SelectItem>
                        <SelectItem value="structural">Structurel</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Breakdown Description */}
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description de la Panne <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="description"
                      value={newIntervention.description}
                      onChange={(e) => setNewIntervention({...newIntervention, description: e.target.value})}
                      placeholder="Décrivez la panne en détail..."
                      rows={3}
                    />
                    <p className="text-xs text-slate-500">
                      Cette information sera utilisée pour suggérer le personnel approprié lors du passage en "Under Repair"
                    </p>
                  </div>

                  {/* Media Upload - Photos/Videos */}
                  <div className="grid gap-2">
                    <Label htmlFor="breakdownMedia">Photos / Vidéos (optionnel)</Label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
                      <Package className="h-12 w-12 mx-auto text-slate-400 mb-2" />
                      <p className="text-sm text-slate-600 mb-1">
                        Glissez-déposez vos fichiers ici ou cliquez pour sélectionner
                      </p>
                      <p className="text-xs text-slate-500">
                        Images et vidéos acceptées (max 10MB par fichier)
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        0 fichier(s) sélectionné(s)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateIntervention} className="bg-gradient-to-r from-blue-600 to-indigo-600">
                Create Intervention
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Status Update Dialog */}
        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogContent className="sm:max-w-[500px] bg-white">
            <DialogHeader>
              <DialogTitle>Update Intervention Status</DialogTitle>
              <DialogDescription>
                Do you also want to change the equipment status?
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="equipment-status">New Equipment Status (optional)</Label>
                <Select value={equipmentStatusForUpdate} onValueChange={setEquipmentStatusForUpdate}>
                  <SelectTrigger id="equipment-status">
                    <SelectValue placeholder="No change" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    <div className="px-2 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 border-b border-orange-200">
                      🟠 MAINTENANCE STATUS
                    </div>
                    <SelectItem value="in_production" className="pl-6 bg-green-50/30 hover:bg-green-100">
                      In Production
                    </SelectItem>
                    <SelectItem value="scheduled_maintenance" className="pl-6 bg-orange-50/30 hover:bg-orange-100">
                      Scheduled Maintenance
                    </SelectItem>
                    <SelectItem value="under_repair" className="pl-6 bg-orange-50/30 hover:bg-orange-100">
                      Under Repair
                    </SelectItem>
                    <SelectItem value="in_workshop" className="pl-6 bg-orange-50/30 hover:bg-orange-100">
                      In Workshop
                    </SelectItem>
                    <SelectItem value="waiting_spare_parts" className="pl-6 bg-orange-50/30 hover:bg-orange-100">
                      Waiting Spare Parts
                    </SelectItem>
                    <SelectItem value="testing_after_repair" className="pl-6 bg-orange-50/30 hover:bg-orange-100">
                      Testing After Repair
                    </SelectItem>
                    <SelectItem value="under_inspection" className="pl-6 bg-orange-50/30 hover:bg-orange-100">
                      Under Inspection
                    </SelectItem>
                    <SelectItem value="pending_validation" className="pl-6 bg-orange-50/30 hover:bg-orange-100">
                      Pending Validation
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Maintenance Personnel Selection - Show when maintenance status selected */}
              {equipmentStatusForUpdate && ['scheduled_maintenance', 'under_repair', 'in_workshop', 'waiting_spare_parts', 'under_inspection'].includes(equipmentStatusForUpdate) && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="mechanic">
                      Mechanic
                      {selectedMechanicId && mechanics.length > 0 && mechanics[0]._id === selectedMechanicId && (
                        <span className="ml-2 text-xs text-green-600">✓ Suggéré</span>
                      )}
                    </Label>
                    <Select value={selectedMechanicId} onValueChange={setSelectedMechanicId}>
                      <SelectTrigger id="mechanic">
                        <SelectValue placeholder="Select mechanic (optional)" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {mechanics.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-slate-500">No mechanics available</div>
                        ) : (
                          mechanics.map((mechanic) => (
                            <SelectItem key={mechanic._id} value={mechanic._id}>
                              {mechanic.fullName || `${mechanic.firstName} ${mechanic.lastName}`}
                              {mechanic.matricule && <span className="text-xs text-slate-500 ml-2">Matricule: {mechanic.matricule}</span>}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="electrician">
                      Electrician
                      {selectedElectricianId && electricians.length > 0 && electricians[0]._id === selectedElectricianId && (
                        <span className="ml-2 text-xs text-green-600">✓ Suggéré</span>
                      )}
                    </Label>
                    <Select value={selectedElectricianId} onValueChange={setSelectedElectricianId}>
                      <SelectTrigger id="electrician">
                        <SelectValue placeholder="Select electrician (optional)" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {electricians.map((electrician) => (
                          <SelectItem key={electrician._id} value={electrician._id}>
                            {electrician.fullName || `${electrician.firstName} ${electrician.lastName}`}
                            {electrician.matricule && <span className="text-xs text-slate-500 ml-2">Matricule: {electrician.matricule}</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="worker">
                      Maintenance Worker
                      {selectedMaintenanceWorkerId && maintenanceWorkers.length > 0 && maintenanceWorkers[0]._id === selectedMaintenanceWorkerId && (
                        <span className="ml-2 text-xs text-green-600">✓ Suggéré</span>
                      )}
                    </Label>
                    <Select value={selectedMaintenanceWorkerId} onValueChange={setSelectedMaintenanceWorkerId}>
                      <SelectTrigger id="worker">
                        <SelectValue placeholder="Select worker (optional)" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {maintenanceWorkers.map((worker) => (
                          <SelectItem key={worker._id} value={worker._id}>
                            {worker.fullName || `${worker.firstName} ${worker.lastName}`}
                            {worker.matricule && <span className="text-xs text-slate-500 ml-2">Matricule: {worker.matricule}</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {!selectedMechanicId && !selectedElectricianId && !selectedMaintenanceWorkerId && (
                    <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-200">
                      ⚠️ At least one maintenance personnel is required for this status
                    </div>
                  )}
                </>
              )}
              
              {/* Machinist Selection - Only show when status is "In Production" */}
              {equipmentStatusForUpdate === 'in_production' && (
                <div className="space-y-2">
                  <Label htmlFor="machinist">Machinist <span className="text-red-500">*</span></Label>
                  <Select value={selectedMachinistId} onValueChange={setSelectedMachinistId}>
                    <SelectTrigger id="machinist">
                      <SelectValue placeholder="Select machinist" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {machinists.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-slate-500">No machinists available</div>
                      ) : (
                        machinists.map((machinist) => (
                          <SelectItem key={machinist._id} value={machinist._id}>
                            {machinist.fullName || `${machinist.firstName} ${machinist.lastName}`}
                            {machinist.matricule && <span className="text-xs text-slate-500 ml-2">Matricule: {machinist.matricule}</span>}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {!selectedMachinistId && (
                    <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-200">
                      ⚠️ A machinist is required for production status
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={confirmStatusUpdate} disabled={updatingId !== null}>
                {updatingId ? 'Updating...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search interventions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dueDateFilter} onValueChange={setDueDateFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by due date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="overdue">⚠️ Overdue</SelectItem>
                <SelectItem value="due-soon">⏰ Due Soon (≤24h)</SelectItem>
                <SelectItem value="no-due-date">📅 No Due Date</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => { setPage(1); setSort(v) }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdDate">Created</SelectItem>
                <SelectItem value="dueDate">Due date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
            <Select value={order} onValueChange={(v: any) => { setPage(1); setOrder(v) }}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Desc</SelectItem>
                <SelectItem value="asc">Asc</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(limit)} onValueChange={(v) => { setPage(1); setLimit(parseInt(v, 10)) }}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 / page</SelectItem>
                <SelectItem value="12">12 / page</SelectItem>
                <SelectItem value="24">24 / page</SelectItem>
                <SelectItem value="48">48 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Interventions List */}
      <div className="space-y-4">
        {filteredInterventions.map((intervention) => (
          <Card key={intervention._id} className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-lg">
                    <Link className="hover:underline" to={`/interventions/${intervention._id}`}>
                      {intervention.description || intervention.title}
                    </Link>
                  </CardTitle>
                </div>
                <div className="flex gap-2">
                  <Badge className={`${getPriorityColor(intervention.priority)} text-white`}>
                    {intervention.priority}
                  </Badge>
                  <Badge className={`${getStatusColor(intervention.status)} text-white flex items-center gap-1`}>
                    {getStatusIcon(intervention.status)}
                    {intervention.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Equipment Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500">Model</p>
                  <p className="text-sm font-medium text-slate-900">{intervention.equipmentDetails?.model || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Serial Number</p>
                  <p className="text-sm font-medium text-slate-900">{intervention.equipmentDetails?.serialNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Chip Number</p>
                  <p className="text-sm font-medium text-slate-900">{intervention.equipmentDetails?.chipNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Brand</p>
                  <p className="text-sm font-medium text-slate-900">{intervention.equipmentDetails?.brand?.name || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-slate-500">Created</p>
                  <p className="font-medium text-slate-900 flex items-center">
                    <Calendar className="mr-1 h-3 w-3" />
                    {new Date(intervention.createdDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Duration</p>
                  <p className="font-medium text-slate-900">
                    <InterventionDuration 
                      startedDate={intervention.startedDate}
                      completedDate={intervention.completedDate}
                      status={intervention.status}
                    />
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Due Date</p>
                  {(() => {
                    if (!intervention.dueDate) {
                      return (
                        <p className="font-medium text-slate-400 flex items-center">
                          <Calendar className="mr-1 h-3 w-3" />
                          Not set
                        </p>
                      );
                    }
                    
                    const dueDate = new Date(intervention.dueDate);
                    const now = new Date();
                    const isOverdue = dueDate < now && intervention.status !== 'Completed' && intervention.status !== 'Cancelled';
                    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    const isDueSoon = daysUntilDue <= 1 && daysUntilDue >= 0 && intervention.status !== 'Completed' && intervention.status !== 'Cancelled';
                    
                    return (
                      <p className={`font-medium flex items-center gap-1 ${
                        isOverdue ? 'text-red-600' : 
                        isDueSoon ? 'text-orange-600' : 
                        'text-slate-900'
                      }`}>
                        <Calendar className="mr-1 h-3 w-3" />
                        {dueDate.toLocaleDateString()}
                        {isOverdue && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                            ⚠️ OVERDUE
                          </span>
                        )}
                        {isDueSoon && !isOverdue && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                            ⏰ DUE SOON
                          </span>
                        )}
                      </p>
                    );
                  })()}
                </div>
              </div>
              <div className="flex gap-2 items-center">
                {/* Show Start button only if status is Pending */}
                {intervention.status === 'Pending' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleUpdateStatus(intervention._id, 'In Progress')} 
                    disabled={updatingId === intervention._id}
                  >
                    {updatingId === intervention._id ? 'Updating...' : 'Start'}
                  </Button>
                )}
                
                {/* Show Complete button only if status is Pending or In Progress */}
                {(intervention.status === 'Pending' || intervention.status === 'In Progress') && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleUpdateStatus(intervention._id, 'Completed')} 
                    disabled={updatingId === intervention._id}
                  >
                    {updatingId === intervention._id ? 'Updating...' : 'Complete'}
                  </Button>
                )}
                
                {/* Show Reopen button if status is Completed or Cancelled */}
                {(intervention.status === 'Completed' || intervention.status === 'Cancelled') && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleUpdateStatus(intervention._id, 'Pending')} 
                    disabled={updatingId === intervention._id}
                  >
                    {updatingId === intervention._id ? 'Updating...' : 'Reopen'}
                  </Button>
                )}
                
                {/* Show Cancel button if not already cancelled or completed */}
                {intervention.status !== 'Cancelled' && intervention.status !== 'Completed' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleUpdateStatus(intervention._id, 'Cancelled')} 
                    disabled={updatingId === intervention._id}
                  >
                    {updatingId === intervention._id ? 'Updating...' : 'Cancel'}
                  </Button>
                )}
                
                {/* Delete button for admins only - with confirmation warning */}
                {(user?.role === 'admin' || user?.role === 'maintenance_manager') && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      if (window.confirm(
                        '⚠️ ATTENTION: Supprimer définitivement cette intervention?\n\n' +
                        '❌ Cette action est IRRÉVERSIBLE\n' +
                        '❌ Toutes les données seront PERDUES\n' +
                        '❌ L\'historique sera EFFACÉ\n\n' +
                        '💡 Recommandation: Utilisez "Cancel" pour conserver l\'historique.\n\n' +
                        'Êtes-vous sûr de vouloir SUPPRIMER (et non annuler)?'
                      )) {
                        handleDeleteIntervention(intervention._id);
                      }
                    }}
                    disabled={deletingId === intervention._id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="⚠️ Suppression définitive - Utiliser uniquement pour les erreurs de saisie"
                  >
                    {deletingId === intervention._id ? 'Deleting...' : '🗑️'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-4">
        <span className="text-sm text-muted-foreground">{rangeLabel}</span>
        <Button variant="outline" disabled={loading || page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>{loading ? 'Loading…' : 'Previous'}</Button>
        <span className="text-sm">Page {page}</span>
        <Button variant="outline" disabled={loading || page * limit >= total} onClick={() => setPage(p => p + 1)}>{loading ? 'Loading…' : 'Next'}</Button>
      </div>

      {filteredInterventions.length === 0 && (
        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
          <CardContent className="p-12 text-center">
            <Wrench className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No interventions found</h3>
            <p className="text-slate-600">Try adjusting your search or filter criteria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}