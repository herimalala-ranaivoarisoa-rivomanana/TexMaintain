import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Search,
  Filter,
  Plus,
  Wrench,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  CheckCircle,
  LayoutGrid,
  List,
  TrendingUp,
  Activity,
  Target,
  FileText,
  Download,
  Eye,
  X
} from "lucide-react"
import { Link } from "react-router-dom"
import { getInterventions, createIntervention, updateIntervention, deleteIntervention } from "@/api/interventions"
import { getEquipment, changeEquipmentStatus } from "@/api/equipment"
import { EQUIPMENT_STATUSES, STATUS_METADATA, getStatusLabel, EQUIPMENT_STATUS_CATEGORIES } from "@/types/equipment"
import { getMechanics } from "@/api/mechanics"
import { getElectricians } from "@/api/electricians"
import { getMaintenanceWorkers } from "@/api/maintenanceWorkers"
import { getMachinists } from "@/api/machinists"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/useToast"
import { useDebounce } from "@/hooks/useDebounce"
import { saveAs } from "file-saver"

interface Intervention {
  _id: string
  title: string
  type: string
  priority: string
  status: string
  equipment: string
  assignedTo: string
  createdDate: string
  dueDate: string
  equipmentId?: {
    _id: string
    status: string
    location: string
    category: { name: string }
    type: { name: string }
  }
}

export function Interventions() {
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 500)
  const [searchParams, setSearchParams] = useSearchParams()
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || "all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [equipmentFilter, setEquipmentFilter] = useState("all")
  const [personnelFilter, setPersonnelFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState<'all' | 'overdue' | 'today' | 'week' | 'month'>('all')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [quickViewOpen, setQuickViewOpen] = useState(false)
  const [quickViewIntervention, setQuickViewIntervention] = useState<Intervention | null>(null)
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10) || 1)
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState<number>(() => parseInt(localStorage.getItem('int_limit') || '12', 10) || 12)
  const [sort, setSort] = useState<string>(searchParams.get('sort') || 'createdDate')
  const [order, setOrder] = useState<'asc' | 'desc'>((searchParams.get('order') as any) || 'desc')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newIntervention, setNewIntervention] = useState({
    title: "",
    type: "",
    priority: "",
    equipmentId: "",
    equipment: "",
    assignedTo: "",
    description: "",
    dueDate: ""
  })
  const [equipmentList, setEquipmentList] = useState<any[]>([])
  const [personnelList, setPersonnelList] = useState<any[]>([])
  const { toast } = useToast()
  const { user } = useAuth()
  const [creating, setCreating] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Start Intervention Dialog State
  const [startDialogOpen, setStartDialogOpen] = useState(false)
  const [selectedIntervention, setSelectedIntervention] = useState<any>(null)
  const [selectedMechanicId, setSelectedMechanicId] = useState<string>("")
  const [selectedElectricianId, setSelectedElectricianId] = useState<string>("")
  const [selectedMaintenanceWorkerId, setSelectedMaintenanceWorkerId] = useState<string>("")
  const [isStarting, setIsStarting] = useState(false)

  // Update Status Dialog State
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [selectedUpdateStatus, setSelectedUpdateStatus] = useState<string>("")
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [updateMechanicId, setUpdateMechanicId] = useState<string>("")
  const [updateElectricianId, setUpdateElectricianId] = useState<string>("")
  const [updateMaintenanceWorkerId, setUpdateMaintenanceWorkerId] = useState<string>("")
  const [updateMachinistId, setUpdateMachinistId] = useState<string>("")

  // Statuses that require personnel selection
  const PERSONNEL_REQUIRED_STATUSES = ['under_repair', 'under_inspection', 'scheduled_maintenance', 'in_workshop']

  useEffect(() => {
    const fetchInterventions = async () => {
      try {
        console.log('Fetching interventions data...')
        const params: any = { page, limit, sort, order }
        if (statusFilter !== 'all') params.status = statusFilter
        if (debouncedSearchTerm) params.q = debouncedSearchTerm
        const response = await getInterventions(params)
        setInterventions((response as any).interventions)
        setTotal((response as any).total || 0)
        console.log('Interventions data loaded successfully')
      } catch (error) {
        console.error('Error fetching interventions:', error)
        toast({
          title: "Error",
          description: "Failed to load interventions data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    const fetchResources = async () => {
      try {
        const [eqRes, mechRes, elecRes, workRes, machRes] = await Promise.all([
          getEquipment({ limit: 1000 }), // Get all equipment for selection
          getMechanics({ isActive: true }),
          getElectricians({ isActive: true }),
          getMaintenanceWorkers({ isActive: true }),
          getMachinists({ isActive: true })
        ])
        setEquipmentList((eqRes as any).equipment || [])

        const mechanics = (mechRes as any).mechanics || []
        const electricians = (elecRes as any).electricians || []
        const workers = (workRes as any).workers || []
        const machinists = (machRes as any).machinists || []

        // Combine all maintenance personnel
        const allPersonnel = [
          ...mechanics.map((p: any) => ({ ...p, role: 'Mechanic' })),
          ...electricians.map((p: any) => ({ ...p, role: 'Electrician' })),
          ...workers.map((p: any) => ({ ...p, role: 'Maintenance Worker' })),
          ...machinists.map((p: any) => ({ ...p, role: 'Machinist' }))
        ]
        setPersonnelList(allPersonnel)
      } catch (error) {
        console.error('Error fetching resources:', error)
      }
    }

    fetchInterventions()
    fetchResources()
  }, [toast, page, statusFilter, limit, sort, order, debouncedSearchTerm])

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
    const headers = ['Title', 'Type', 'Priority', 'Status', 'Equipment', 'AssignedTo', 'Created', 'Due']
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
    try {
      console.log('Creating new intervention...')
      setCreating(true)
      const tempId = `temp-${Date.now()}`
      const temp = {
        _id: tempId,
        status: 'Pending',
        createdDate: new Date().toISOString(),
        ...newIntervention,
        // Ensure defaults if empty in newIntervention
        assignedTo: newIntervention.assignedTo || '',
        dueDate: newIntervention.dueDate || new Date().toISOString()
      }
      setInterventions([temp as any, ...interventions])
      try {
        // Find equipment name if not set but ID is
        let equipmentName = newIntervention.equipment
        if (!equipmentName && newIntervention.equipmentId) {
          const eq = equipmentList.find(e => e._id === newIntervention.equipmentId)
          if (eq) equipmentName = eq.location || `Equipment ${eq._id}`
        }

        const payload = {
          ...newIntervention,
          equipment: equipmentName
        }

        const res = await createIntervention(payload)
        const created = (res as any).intervention
        setInterventions(list => list.map(i => i._id === tempId ? created : i))
      } catch (err) {
        setInterventions(list => list.filter(i => i._id !== tempId))
        throw err
      }
      toast({
        title: "Success",
        description: "Intervention created successfully",
      })
      setIsDialogOpen(false)
      setNewIntervention({ title: "", type: "", priority: "", equipment: "", equipmentId: "", assignedTo: "", description: "", dueDate: "" })
    } catch (error) {
      console.error('Error creating intervention:', error)
      toast({
        title: "Error",
        description: "Failed to create intervention",
        variant: "destructive",
      })
    }
    finally {
      setCreating(false)
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      setUpdatingId(id)
      const prev = interventions
      setInterventions(prev.map(i => i._id === id ? { ...i, status } : i))
      try {
        await updateIntervention(id, { status })
      } catch (err) {
        setInterventions(prev)
        throw err
      }
      toast({ title: 'Updated', description: 'Intervention status updated' })
    } catch (error) {
      console.error('Error updating intervention:', error)
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' })
    }
    finally {
      setUpdatingId(null)
    }
  }

  const handleStartIntervention = (intervention: any) => {
    // Check if equipment is in BREAKDOWN status
    if (intervention.equipmentId && intervention.equipmentId.status === EQUIPMENT_STATUSES.BREAKDOWN) {
      setSelectedIntervention(intervention)
      // Pre-select assigned personnel if possible (simple match by name)
      // Note: Ideally we should have IDs, but here we might only have name strings in assignedTo
      // So we leave it empty for user to select explicitly
      setSelectedMechanicId("")
      setSelectedElectricianId("")
      setSelectedMaintenanceWorkerId("")
      setStartDialogOpen(true)
    } else {
      // Just start normally
      handleUpdateStatus(intervention._id, 'In Progress')
    }
  }

  const confirmStartIntervention = async () => {
    if (!selectedIntervention) return

    // Validate at least one personnel selected
    if (!selectedMechanicId && !selectedElectricianId && !selectedMaintenanceWorkerId) {
      toast({
        title: 'Personnel Required',
        description: 'Please select at least one maintenance personnel',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsStarting(true)

      // 1. Change Equipment Status to UNDER_REPAIR
      await changeEquipmentStatus(selectedIntervention.equipmentId._id, {
        status: EQUIPMENT_STATUSES.UNDER_REPAIR,
        mechanicId: selectedMechanicId || undefined,
        electricianId: selectedElectricianId || undefined,
        maintenanceWorkerId: selectedMaintenanceWorkerId || undefined,
        interventionId: selectedIntervention._id
      })

      // 2. Update Intervention Status to In Progress
      await updateIntervention(selectedIntervention._id, {
        status: 'In Progress',
        // Update assignedTo with selected names
        assignedTo: [
          personnelList.find(p => p._id === selectedMechanicId)?.firstName,
          personnelList.find(p => p._id === selectedElectricianId)?.firstName,
          personnelList.find(p => p._id === selectedMaintenanceWorkerId)?.firstName
        ].filter(Boolean).join(', ')
      })

      // Update local state
      setInterventions(prev => prev.map(i => i._id === selectedIntervention._id ? {
        ...i,
        status: 'In Progress',
        assignedTo: [
          personnelList.find(p => p._id === selectedMechanicId)?.firstName,
          personnelList.find(p => p._id === selectedElectricianId)?.firstName,
          personnelList.find(p => p._id === selectedMaintenanceWorkerId)?.firstName
        ].filter(Boolean).join(', ')
      } : i))

      toast({ title: 'Started', description: 'Intervention started and equipment set to Under Repair' })
      setStartDialogOpen(false)
    } catch (error) {
      console.error('Error starting intervention:', error)
      toast({ title: 'Error', description: 'Failed to start intervention', variant: 'destructive' })
    } finally {
      setIsStarting(false)
    }
  }

  const openUpdateDialog = (intervention: any) => {
    setSelectedIntervention(intervention)
    setSelectedUpdateStatus("")
    setUpdateMechanicId("")
    setUpdateElectricianId("")
    setUpdateMaintenanceWorkerId("")
    setUpdateMachinistId("")
    setUpdateDialogOpen(true)
  }

  const confirmUpdateStatus = async () => {
    if (!selectedIntervention || !selectedUpdateStatus) return

    try {
      setIsUpdatingStatus(true)

      if (selectedUpdateStatus === 'completed') {
        // Complete Intervention Logic

        // Validate Machinist if going to IN_PRODUCTION
        if (!updateMachinistId) {
          toast({
            title: 'Machinist Required',
            description: 'Please select a machinist to hand over the equipment',
            variant: 'destructive'
          })
          setIsUpdatingStatus(false)
          return
        }

        // 1. Update Equipment Status to IN_PRODUCTION (or previous status if not breakdown)
        // For now, let's assume back to IN_PRODUCTION is the standard "Fix"
        await changeEquipmentStatus(selectedIntervention.equipmentId._id, {
          status: EQUIPMENT_STATUSES.IN_PRODUCTION,
          machinistId: updateMachinistId
        })

        // 2. Update Intervention Status to Completed
        await updateIntervention(selectedIntervention._id, { status: 'Completed' })

        // Update local state
        setInterventions(prev => prev.map(i => i._id === selectedIntervention._id ? { ...i, status: 'Completed' } : i))
        toast({ title: 'Completed', description: 'Intervention completed and equipment back in production' })

      } else {
        // Check if the new status is a non-maintenance status (Production or Out of Service)
        // If so, we should auto-complete the intervention
        const newStatusMetadata = STATUS_METADATA[selectedUpdateStatus]
        const isMaintenanceStatus = newStatusMetadata?.category === EQUIPMENT_STATUS_CATEGORIES.MAINTENANCE

        if (!isMaintenanceStatus) {
          // Auto-complete logic

          // If going to IN_PRODUCTION, validate Machinist
          if (selectedUpdateStatus === EQUIPMENT_STATUSES.IN_PRODUCTION && !updateMachinistId) {
            toast({
              title: 'Machinist Required',
              description: 'Please select a machinist to hand over the equipment',
              variant: 'destructive'
            })
            setIsUpdatingStatus(false)
            return
          }

          // 1. Change Equipment Status
          await changeEquipmentStatus(selectedIntervention.equipmentId._id, {
            status: selectedUpdateStatus as any,
            machinistId: updateMachinistId || undefined
          })

          // 2. Update Intervention Status to Completed
          await updateIntervention(selectedIntervention._id, { status: 'Completed' })

          // Update local state
          setInterventions(prev => prev.map(i => i._id === selectedIntervention._id ? { ...i, status: 'Completed' } : i))
          toast({ title: 'Completed', description: `Intervention completed (Status: ${getStatusLabel(selectedUpdateStatus as any)})` })

        } else {
          // Standard Maintenance Status Change (Intervention remains In Progress)

          // Validate personnel if required
          if (PERSONNEL_REQUIRED_STATUSES.includes(selectedUpdateStatus)) {
            if (!updateMechanicId && !updateElectricianId && !updateMaintenanceWorkerId) {
              toast({
                title: 'Personnel Required',
                description: 'Please select at least one maintenance personnel for this status',
                variant: 'destructive'
              })
              setIsUpdatingStatus(false)
              return
            }
          }

          // Change Equipment Status Logic
          await changeEquipmentStatus(selectedIntervention.equipmentId._id, {
            status: selectedUpdateStatus as any,
            mechanicId: updateMechanicId || undefined,
            electricianId: updateElectricianId || undefined,
            maintenanceWorkerId: updateMaintenanceWorkerId || undefined
          })

          // Intervention remains In Progress
          toast({ title: 'Updated', description: 'Equipment status updated' })
        }


      }

      setUpdateDialogOpen(false)
    } catch (error) {
      console.error('Error updating status:', error)
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' })
    } finally {
      setIsUpdatingStatus(false)
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

  const filteredInterventions = interventions

  // Calculate Statistics
  const statistics = useMemo(() => {
    const totalCount = total
    const pendingCount = interventions.filter(i => i.status === 'Pending').length
    const inProgressCount = interventions.filter(i => i.status === 'In Progress').length
    const completedCount = interventions.filter(i => i.status === 'Completed').length
    const criticalCount = interventions.filter(i => i.priority === 'Critical' || i.priority === 'High').length
    const overdueCount = interventions.filter(i => {
      const dueDate = new Date(i.dueDate)
      const today = new Date()
      return dueDate < today && i.status !== 'Completed'
    }).length
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    return {
      totalCount,
      pendingCount,
      inProgressCount,
      completedCount,
      criticalCount,
      overdueCount,
      completionRate
    }
  }, [interventions, total])

  // Apply advanced filters
  const advancedFilteredInterventions = useMemo(() => {
    return filteredInterventions.filter(intervention => {
      // Type filter
      if (typeFilter !== 'all' && intervention.type !== typeFilter) return false
      
      // Priority filter
      if (priorityFilter !== 'all' && intervention.priority !== priorityFilter) return false
      
      // Equipment filter
      if (equipmentFilter !== 'all' && intervention.equipmentId?._id !== equipmentFilter) return false
      
      // Personnel filter
      if (personnelFilter !== 'all' && !intervention.assignedTo?.includes(personnelFilter)) return false
      
      // Date filter
      if (dateFilter !== 'all') {
        const dueDate = new Date(intervention.dueDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        switch (dateFilter) {
          case 'overdue':
            if (dueDate >= today || intervention.status === 'Completed') return false
            break
          case 'today':
            const dueDateDay = new Date(dueDate)
            dueDateDay.setHours(0, 0, 0, 0)
            if (dueDateDay.getTime() !== today.getTime()) return false
            break
          case 'week':
            const weekFromNow = new Date()
            weekFromNow.setDate(weekFromNow.getDate() + 7)
            if (dueDate > weekFromNow) return false
            break
          case 'month':
            const monthFromNow = new Date()
            monthFromNow.setMonth(monthFromNow.getMonth() + 1)
            if (dueDate > monthFromNow) return false
            break
        }
      }
      
      return true
    })
  }, [filteredInterventions, typeFilter, priorityFilter, equipmentFilter, personnelFilter, dateFilter])

  // Check if intervention is overdue
  const isOverdue = (intervention: Intervention) => {
    const dueDate = new Date(intervention.dueDate)
    const today = new Date()
    return dueDate < today && intervention.status !== 'Completed'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
          <Button variant="outline" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                <Plus className="mr-2 h-4 w-4" />
                New Intervention
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white">
              <DialogHeader>
                <DialogTitle>Create New Intervention</DialogTitle>
                <DialogDescription>
                  Create a new maintenance intervention for equipment.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newIntervention.title}
                    onChange={(e) => setNewIntervention({ ...newIntervention, title: e.target.value })}
                    placeholder="Enter intervention title"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={newIntervention.type} onValueChange={(value) => setNewIntervention({ ...newIntervention, type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Preventive">Preventive</SelectItem>
                      <SelectItem value="Corrective">Corrective</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={newIntervention.priority} onValueChange={(value) => setNewIntervention({ ...newIntervention, priority: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="equipment">Equipment</Label>
                  <Select
                    value={newIntervention.equipmentId}
                    onValueChange={(value) => {
                      const eq = equipmentList.find(e => e._id === value)
                      setNewIntervention({
                        ...newIntervention,
                        equipmentId: value,
                        equipment: eq ? (eq.location || eq.name) : "" // Fallback name
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select equipment" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {equipmentList.map(eq => (
                        <SelectItem key={eq._id} value={eq._id}>
                          {eq.category?.name} - {eq.type?.name} ({eq.location})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="assignedTo">Assigned To</Label>
                  <Select
                    value={newIntervention.assignedTo}
                    onValueChange={(value) => setNewIntervention({ ...newIntervention, assignedTo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select personnel" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {personnelList.map(p => (
                        <SelectItem key={p._id} value={`${p.firstName} ${p.lastName}`}>
                          {p.firstName} {p.lastName} ({p.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={newIntervention.dueDate ? new Date(newIntervention.dueDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setNewIntervention({ ...newIntervention, dueDate: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newIntervention.description}
                    onChange={(e) => setNewIntervention({ ...newIntervention, description: e.target.value })}
                    placeholder="Enter intervention description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateIntervention} disabled={creating} className="bg-gradient-to-r from-blue-600 to-indigo-600">
                  {creating ? 'Creating...' : 'Create Intervention'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-3">
            <CardDescription className="text-blue-700 font-medium">Total Interventions</CardDescription>
            <CardTitle className="text-3xl text-blue-900">{statistics.totalCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-blue-700">
              <Activity className="mr-2 h-4 w-4" />
              All time
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader className="pb-3">
            <CardDescription className="text-yellow-700 font-medium">In Progress</CardDescription>
            <CardTitle className="text-3xl text-yellow-900">{statistics.inProgressCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-yellow-700">
              <Wrench className="mr-2 h-4 w-4" />
              Active now
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-3">
            <CardDescription className="text-green-700 font-medium">Completion Rate</CardDescription>
            <CardTitle className="text-3xl text-green-900">{statistics.completionRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-green-700">
              <Target className="mr-2 h-4 w-4" />
              {statistics.completedCount} completed
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-3">
            <CardDescription className="text-red-700 font-medium">Critical & Overdue</CardDescription>
            <CardTitle className="text-3xl text-red-900">{statistics.overdueCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-red-700">
              <AlertTriangle className="mr-2 h-4 w-4" />
              {statistics.criticalCount} high priority
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Start Intervention Dialog */}
      <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle>Start Intervention</DialogTitle>
            <DialogDescription>
              This equipment is currently in <strong>BREAKDOWN</strong>. Starting this intervention will change the status to <strong>UNDER REPAIR</strong>.
              Please select the personnel performing the repair.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Mechanic</Label>
              <Select value={selectedMechanicId} onValueChange={setSelectedMechanicId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mechanic" />
                </SelectTrigger>
                <SelectContent>
                  {personnelList.filter(p => p.role === 'Mechanic').map(p => (
                    <SelectItem key={p._id} value={p._id}>{p.firstName} {p.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Electrician</Label>
              <Select value={selectedElectricianId} onValueChange={setSelectedElectricianId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select electrician" />
                </SelectTrigger>
                <SelectContent>
                  {personnelList.filter(p => p.role === 'Electrician').map(p => (
                    <SelectItem key={p._id} value={p._id}>{p.firstName} {p.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Maintenance Worker</Label>
              <Select value={selectedMaintenanceWorkerId} onValueChange={setSelectedMaintenanceWorkerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select worker" />
                </SelectTrigger>
                <SelectContent>
                  {personnelList.filter(p => p.role === 'Maintenance Worker').map(p => (
                    <SelectItem key={p._id} value={p._id}>{p.firstName} {p.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmStartIntervention} disabled={isStarting} className="bg-gradient-to-r from-blue-600 to-indigo-600">
              {isStarting ? 'Starting...' : 'Confirm Start'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle>Update Intervention Status</DialogTitle>
            <DialogDescription>
              Update the status of the intervention and the equipment.
              <br />
              <span className="text-xs text-muted-foreground">
                Current Status: {selectedIntervention?.equipmentId?.status || 'Unknown'}
                {!STATUS_METADATA[selectedIntervention?.equipmentId?.status || ''] && ' (Metadata Missing)'}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Action</Label>
              <Select value={selectedUpdateStatus} onValueChange={setSelectedUpdateStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  {/* Only show Complete if transition to IN_PRODUCTION is allowed */}
                  {selectedIntervention?.equipmentId?.status &&
                    STATUS_METADATA[selectedIntervention.equipmentId.status]?.allowedTransitions?.includes(EQUIPMENT_STATUSES.IN_PRODUCTION) && (
                      <SelectItem value="completed">Complete Intervention (Back to Production)</SelectItem>
                    )}

                  {/* Standard Allowed Transitions */}
                  {selectedIntervention?.equipmentId?.status && STATUS_METADATA[selectedIntervention.equipmentId.status]?.allowedTransitions?.map((status) => (
                    <SelectItem key={status} value={status}>
                      {getStatusLabel(status)}
                    </SelectItem>
                  ))}

                  {/* Fallback: If no allowed transitions found (e.g. invalid status), show all maintenance statuses */}
                  {(!selectedIntervention?.equipmentId?.status ||
                    !STATUS_METADATA[selectedIntervention.equipmentId.status] ||
                    !STATUS_METADATA[selectedIntervention.equipmentId.status]?.allowedTransitions?.length) && (
                      <>
                        <SelectItem value="completed">Complete Intervention (Back to Production)</SelectItem>
                        {Object.values(EQUIPMENT_STATUSES)
                          .filter(s => STATUS_METADATA[s]?.category === EQUIPMENT_STATUS_CATEGORIES.MAINTENANCE ||
                            s === EQUIPMENT_STATUSES.STORED ||
                            s === EQUIPMENT_STATUSES.SCRAPPED)
                          .map(status => (
                            <SelectItem key={status} value={status}>
                              {getStatusLabel(status)} (Fallback)
                            </SelectItem>
                          ))
                        }
                      </>
                    )}
                </SelectContent>
              </Select>
            </div>

            {/* Machinist Selection for Completion or In Production transition */}
            {(selectedUpdateStatus === 'completed' || selectedUpdateStatus === EQUIPMENT_STATUSES.IN_PRODUCTION) && (
              <div className="grid gap-2">
                <Label>Hand over to Machinist</Label>
                <Select value={updateMachinistId} onValueChange={setUpdateMachinistId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select machinist" />
                  </SelectTrigger>
                  <SelectContent>
                    {personnelList.filter(p => p.role === 'Machinist').map(p => (
                      <SelectItem key={p._id} value={p._id}>{p.firstName} {p.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}


            {/* Conditional Personnel Selection */}
            {PERSONNEL_REQUIRED_STATUSES.includes(selectedUpdateStatus) && (
              <>
                <div className="grid gap-2">
                  <Label>Mechanic</Label>
                  <Select value={updateMechanicId} onValueChange={setUpdateMechanicId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select mechanic" />
                    </SelectTrigger>
                    <SelectContent>
                      {personnelList.filter(p => p.role === 'Mechanic').map(p => (
                        <SelectItem key={p._id} value={p._id}>{p.firstName} {p.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Electrician</Label>
                  <Select value={updateElectricianId} onValueChange={setUpdateElectricianId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select electrician" />
                    </SelectTrigger>
                    <SelectContent>
                      {personnelList.filter(p => p.role === 'Electrician').map(p => (
                        <SelectItem key={p._id} value={p._id}>{p.firstName} {p.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Maintenance Worker</Label>
                  <Select value={updateMaintenanceWorkerId} onValueChange={setUpdateMaintenanceWorkerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select worker" />
                    </SelectTrigger>
                    <SelectContent>
                      {personnelList.filter(p => p.role === 'Maintenance Worker').map(p => (
                        <SelectItem key={p._id} value={p._id}>{p.firstName} {p.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmUpdateStatus} disabled={isUpdatingStatus || !selectedUpdateStatus} className="bg-gradient-to-r from-blue-600 to-indigo-600">
              {isUpdatingStatus ? 'Updating...' : 'Confirm Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Filters */}
      <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Search and View Toggle */}
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
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Advanced Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Preventive">Preventive</SelectItem>
                  <SelectItem value="Corrective">Corrective</SelectItem>
                  <SelectItem value="Emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={(v: any) => setDateFilter(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Due Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="today">Due Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sort} onValueChange={(v) => { setPage(1); setSort(v) }}>
                <SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Desc</SelectItem>
                  <SelectItem value="asc">Asc</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters Info */}
            {(typeFilter !== 'all' || priorityFilter !== 'all' || dateFilter !== 'all') && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Filter className="h-4 w-4" />
                <span>Active filters:</span>
                {typeFilter !== 'all' && <Badge variant="secondary">{typeFilter}</Badge>}
                {priorityFilter !== 'all' && <Badge variant="secondary">{priorityFilter}</Badge>}
                {dateFilter !== 'all' && <Badge variant="secondary">{dateFilter}</Badge>}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTypeFilter('all')
                    setPriorityFilter('all')
                    setDateFilter('all')
                  }}
                  className="h-6 px-2"
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Interventions List - Cards View */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          {advancedFilteredInterventions.map((intervention) => (
            <Card key={intervention._id} className={`bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200 ${
              isOverdue(intervention) ? 'border-l-4 border-l-red-500' : ''
            }`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        <Link className="hover:underline" to={`/interventions/${intervention._id}`}>
                          {intervention.title}
                        </Link>
                      </CardTitle>
                      {isOverdue(intervention) && (
                        <Badge variant="destructive" className="animate-pulse">
                          <Clock className="h-3 w-3 mr-1" />
                          OVERDUE
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center">
                        <Wrench className="mr-1 h-3 w-3" />
                        {intervention.type}
                      </span>
                      <span className="flex items-center">
                        <User className="mr-1 h-3 w-3" />
                        {intervention.assignedTo}
                      </span>
                      {intervention.equipmentId && (
                        <span className="flex items-center text-xs">
                          <Badge variant="outline" className={`${STATUS_METADATA[intervention.equipmentId.status]?.color || 'bg-gray-500'} text-white`}>
                            {getStatusLabel(intervention.equipmentId.status as any)}
                          </Badge>
                        </span>
                      )}
                    </CardDescription>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-slate-500">Equipment</p>
                    <p className="font-medium text-slate-900">{intervention.equipment}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Created</p>
                    <p className="font-medium text-slate-900 flex items-center">
                      <Calendar className="mr-1 h-3 w-3" />
                      {new Date(intervention.createdDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Due Date</p>
                    <p className={`font-medium flex items-center ${
                      isOverdue(intervention) ? 'text-red-600 font-bold' : 'text-slate-900'
                    }`}>
                      <Calendar className="mr-1 h-3 w-3" />
                      {new Date(intervention.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setQuickViewIntervention(intervention)
                      setQuickViewOpen(true)
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Quick View
                  </Button>
                  {intervention.status !== 'In Progress' && intervention.status !== 'Completed' && (
                    <Button variant="outline" size="sm" onClick={() => handleStartIntervention(intervention)} disabled={updatingId === intervention._id}>
                      {updatingId === intervention._id ? 'Updating...' : 'Start'}
                    </Button>
                  )}
                  {intervention.status === 'In Progress' && (
                    <Button variant="outline" size="sm" onClick={() => openUpdateDialog(intervention)} disabled={updatingId === intervention._id}>
                      Update Status
                    </Button>
                  )}
                  {intervention.status !== 'In Progress' && intervention.status !== 'Completed' && (user?.role === 'admin' || user?.role === 'maintenance_manager') && (
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteIntervention(intervention._id)} disabled={deletingId === intervention._id}>
                      {deletingId === intervention._id ? 'Deleting...' : 'Delete'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Interventions List - Table View */}
      {viewMode === 'table' && (
        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advancedFilteredInterventions.map((intervention) => (
                  <TableRow key={intervention._id} className={isOverdue(intervention) ? 'bg-red-50' : ''}>
                    <TableCell>
                      <Link className="hover:underline font-medium" to={`/interventions/${intervention._id}`}>
                        {intervention.title}
                      </Link>
                      {isOverdue(intervention) && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          OVERDUE
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{intervention.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getPriorityColor(intervention.priority)} text-white`}>
                        {intervention.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(intervention.status)} text-white flex items-center gap-1 w-fit`}>
                        {getStatusIcon(intervention.status)}
                        {intervention.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{intervention.equipment}</TableCell>
                    <TableCell>{intervention.assignedTo}</TableCell>
                    <TableCell className={isOverdue(intervention) ? 'text-red-600 font-bold' : ''}>
                      {new Date(intervention.dueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setQuickViewIntervention(intervention)
                            setQuickViewOpen(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {intervention.status === 'Pending' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleStartIntervention(intervention)}
                            disabled={updatingId === intervention._id}
                          >
                            <Wrench className="h-4 w-4" />
                          </Button>
                        )}
                        {intervention.status === 'In Progress' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => openUpdateDialog(intervention)}
                          >
                            <TrendingUp className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Quick View Dialog */}
      <Dialog open={quickViewOpen} onOpenChange={setQuickViewOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl">{quickViewIntervention?.title}</DialogTitle>
                <DialogDescription className="mt-2">
                  {quickViewIntervention?.type} • Created {quickViewIntervention && new Date(quickViewIntervention.createdDate).toLocaleDateString()}
                </DialogDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setQuickViewOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          {quickViewIntervention && (
            <div className="space-y-4">
              {/* Status Badges */}
              <div className="flex gap-2">
                <Badge className={`${getPriorityColor(quickViewIntervention.priority)} text-white`}>
                  {quickViewIntervention.priority} Priority
                </Badge>
                <Badge className={`${getStatusColor(quickViewIntervention.status)} text-white`}>
                  {quickViewIntervention.status}
                </Badge>
                {isOverdue(quickViewIntervention) && (
                  <Badge variant="destructive">
                    <Clock className="h-3 w-3 mr-1" />
                    OVERDUE
                  </Badge>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Equipment</p>
                  <p className="font-medium">{quickViewIntervention.equipment}</p>
                  {quickViewIntervention.equipmentId && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      Status: {getStatusLabel(quickViewIntervention.equipmentId.status as any)}
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Assigned To</p>
                  <p className="font-medium">{quickViewIntervention.assignedTo || 'Unassigned'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Due Date</p>
                  <p className={`font-medium ${
                    isOverdue(quickViewIntervention) ? 'text-red-600' : ''
                  }`}>
                    {new Date(quickViewIntervention.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Created Date</p>
                  <p className="font-medium">{new Date(quickViewIntervention.createdDate).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Equipment Location */}
              {quickViewIntervention.equipmentId && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700 font-medium mb-2">Equipment Details</p>
                  <div className="space-y-1 text-sm">
                    <p><strong>Location:</strong> {quickViewIntervention.equipmentId.location}</p>
                    <p><strong>Category:</strong> {quickViewIntervention.equipmentId.category?.name}</p>
                    <p><strong>Type:</strong> {quickViewIntervention.equipmentId.type?.name}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  variant="default" 
                  className="flex-1"
                  onClick={() => {
                    setQuickViewOpen(false)
                    window.location.href = `/interventions/${quickViewIntervention._id}`
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Full Details
                </Button>
                {quickViewIntervention.status === 'Pending' && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setQuickViewOpen(false)
                      handleStartIntervention(quickViewIntervention)
                    }}
                  >
                    Start Now
                  </Button>
                )}
                {quickViewIntervention.status === 'In Progress' && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setQuickViewOpen(false)
                      openUpdateDialog(quickViewIntervention)
                    }}
                  >
                    Update Status
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-4">
        <span className="text-sm text-muted-foreground">{rangeLabel}</span>
        <Button variant="outline" disabled={loading || page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>{loading ? 'Loading…' : 'Previous'}</Button>
        <span className="text-sm">Page {page}</span>
        <Button variant="outline" disabled={loading || page * limit >= total} onClick={() => setPage(p => p + 1)}>{loading ? 'Loading…' : 'Next'}</Button>
      </div>

      {advancedFilteredInterventions.length === 0 && (
        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
          <CardContent className="p-12 text-center">
            <Wrench className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No interventions found</h3>
            <p className="text-slate-600 mb-4">Try adjusting your search or filter criteria.</p>
            {(typeFilter !== 'all' || priorityFilter !== 'all' || dateFilter !== 'all' || statusFilter !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setTypeFilter('all')
                  setPriorityFilter('all')
                  setDateFilter('all')
                  setStatusFilter('all')
                }}
              >
                Clear All Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div >
  )
}