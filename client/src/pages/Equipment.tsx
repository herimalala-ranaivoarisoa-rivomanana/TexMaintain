import { useEffect, useMemo, useState } from "react"
import { useSearchParams, Link, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Search, 
  Filter, 
  Plus, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  MapPin,
  Calendar,
  Pencil,
  Trash,
  History,
  Package,
  Droplet,
  Wrench
} from "lucide-react"
import { getEquipment, createEquipment, updateEquipment, deleteEquipment, changeEquipmentStatus } from "@/api/equipment"
import { getBrands } from "@/api/brands"
import { getMachinists } from "@/api/machinists"
import { getMechanics } from "@/api/mechanics"
import { getElectricians } from "@/api/electricians"
import { getMaintenanceWorkers } from "@/api/maintenanceWorkers"
import { uploadBreakdownMedia } from "@/api/breakdownMedia"
import api from "@/api/api"
import { useToast } from "@/hooks/useToast"
import { useAuth } from "@/contexts/AuthContext"
import { EQUIPMENT_STATUSES, getStatusColor, getStatusLabel } from "@/types/equipment"
import type { EquipmentStatus } from "@/types/equipment"

interface Equipment {
  _id: string
  category: Category
  type: EquipmentType
  status: string
  location: string
  model?: string
  serialNumber?: string
  chipNumber?: string
  brand?: string | { _id: string; name: string }
  acquisitionDate?: string
  lastMaintenance: string
  nextMaintenance: string
  mtbf: number
  mttr: number
  timeSinceAcquisition: number
  operatingTime: number
  downtime: number
  availability: number
  lastBreakdownType?: string
  lastBreakdownDescription?: string
}

interface Category {
  _id: string
  name: string
  description?: string
}

interface EquipmentType {
  _id: string
  name: string
  description?: string
  category: Category
}

export function Equipment() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [lines, setLines] = useState<any[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [types, setTypes] = useState<EquipmentType[]>([])
  const [brands, setBrands] = useState<{ _id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchParams, setSearchParams] = useSearchParams()
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || "all")
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10) || 1)
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState<number>(() => parseInt(localStorage.getItem('eq_limit') || '12', 10) || 12)
  const [sort, setSort] = useState<string>(searchParams.get('sort') || 'createdAt')
  const [order, setOrder] = useState<'asc'|'desc'>((searchParams.get('order') as any) || 'desc')
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Equipment | null>(null)
  const [form, setForm] = useState<{
    category: string;
    type: string;
    status: string;
    location: string;
    model: string;
    serialNumber: string;
    chipNumber: string;
    brand: string;
    acquisitionDate: string;
  }>({
    category: "",
    type: "",
    status: EQUIPMENT_STATUSES.STORED,
    location: "",
    model: "",
    serialNumber: "",
    chipNumber: "",
    brand: "",
    acquisitionDate: ""
  })
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Personnel states (same as ProductionLines)
  const [machinists, setMachinists] = useState<any[]>([])
  const [selectedMachinistId, setSelectedMachinistId] = useState('')
  const [mechanics, setMechanics] = useState<any[]>([])
  const [selectedMechanicId, setSelectedMechanicId] = useState('')
  const [electricians, setElectricians] = useState<any[]>([])
  const [selectedElectricianId, setSelectedElectricianId] = useState('')
  const [maintenanceWorkers, setMaintenanceWorkers] = useState<any[]>([])
  const [selectedMaintenanceWorkerId, setSelectedMaintenanceWorkerId] = useState('')
  
  // Breakdown information
  const [breakdownType, setBreakdownType] = useState('')
  const [breakdownDescription, setBreakdownDescription] = useState('')
  const [breakdownMedia, setBreakdownMedia] = useState<File[]>([])
  const [breakdownMediaPreviews, setBreakdownMediaPreviews] = useState<string[]>([])
  
  // Breakdown types (extensible list)
  const breakdownTypes = [
    { value: 'mechanical', label: 'Panne Mécanique', suggestedPersonnel: 'mechanic' },
    { value: 'electrical', label: 'Panne Électrique', suggestedPersonnel: 'electrician' },
    { value: 'hydraulic', label: 'Panne Hydraulique', suggestedPersonnel: 'mechanic' },
    { value: 'pneumatic', label: 'Panne Pneumatique', suggestedPersonnel: 'mechanic' },
    { value: 'electronic', label: 'Panne Électronique', suggestedPersonnel: 'electrician' },
    { value: 'software', label: 'Panne Logicielle', suggestedPersonnel: 'electrician' },
    { value: 'structural', label: 'Panne Structurelle', suggestedPersonnel: 'worker' },
    { value: 'other', label: 'Autre', suggestedPersonnel: null }
  ]
  
  const { user } = useAuth()
  const navigate = useNavigate()

  // Fetch personnel
  const fetchPersonnel = async () => {
    try {
      const [machinistsRes, mechanicsRes, electriciansRes, workersRes] = await Promise.all([
        getMachinists({ isActive: true, limit: 100 }),
        getMechanics({ isActive: true }),
        getElectricians({ isActive: true }),
        getMaintenanceWorkers({ isActive: true })
      ])
      setMachinists(machinistsRes.machinists || [])
      setMechanics(mechanicsRes.mechanics || [])
      setElectricians(electriciansRes.electricians || [])
      setMaintenanceWorkers(workersRes.workers || [])
    } catch (error) {
      console.error('Error fetching personnel:', error)
    }
  }

  // Fetch categories, types, brands, and sections on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesResponse, typesResponse, brandsResponse, sectionsResponse, linesResponse] = await Promise.all([
          api.get('/api/equipment-categories'),
          api.get('/api/equipment-types'),
          getBrands(),
          api.get('/api/production-sections'),
          api.get('/api/production-lines')
        ])
        setCategories((categoriesResponse.data as any).categories || [])
        setTypes((typesResponse.data as any).types || [])
        setBrands(brandsResponse.brands || [])
        setSections((sectionsResponse.data as any).sections || [])
        setLines((linesResponse.data as any).productionLines || [])
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: "Error",
          description: "Failed to load equipment data",
          variant: "destructive",
        })
      }
    }

    fetchData()
    fetchPersonnel()
  }, [toast])

  const fetchEquipment = async () => {
    try {
      console.log('Fetching equipment data...')
      const params: any = { page, limit, sort, order }
      if (statusFilter !== 'all') params.status = statusFilter
      if (searchTerm) params.q = searchTerm
      const response = await getEquipment(params)
      setEquipment((response as any).equipment)
      setTotal((response as any).total || 0)
      console.log('Equipment data loaded successfully')
    } catch (error) {
      console.error('Error fetching equipment:', error)
      toast({
        title: "Error",
        description: "Failed to load equipment data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEquipment()
  }, [toast, page, statusFilter, limit, sort, order])

  useEffect(() => {
    // Refresh data every 30 seconds for dynamic metrics
    const interval = setInterval(fetchEquipment, 30000)
    return () => clearInterval(interval)
  }, [])

  // Sync state to URL
  useEffect(() => {
    const next = new URLSearchParams()
    if (page && page !== 1) next.set('page', String(page))
    if (statusFilter && statusFilter !== 'all') next.set('status', statusFilter)
    if (searchTerm) next.set('q', searchTerm)
    if (sort && sort !== 'createdAt') next.set('sort', sort)
    if (order && order !== 'desc') next.set('order', order)
    setSearchParams(next, { replace: true })
  }, [page, statusFilter, searchTerm, sort, order, setSearchParams])

  // Persist limit
  useEffect(() => {
    localStorage.setItem('eq_limit', String(limit))
  }, [limit])

  const rangeLabel = useMemo(() => {
    const start = total === 0 ? 0 : (page - 1) * limit + 1
    const end = Math.min(page * limit, total)
    return `${start}-${end} of ${total}`
  }, [page, limit, total])


  // Handle media file upload
  const handleMediaUpload = (files: FileList | null) => {
    if (!files) return
    
    const newFiles = Array.from(files).filter(file => {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      const isUnder10MB = file.size <= 10 * 1024 * 1024 // 10MB limit
      
      if (!isImage && !isVideo) {
        toast({
          title: 'Type de fichier non supporté',
          description: `${file.name} n'est pas une image ou vidéo`,
          variant: 'destructive'
        })
        return false
      }
      
      if (!isUnder10MB) {
        toast({
          title: 'Fichier trop volumineux',
          description: `${file.name} dépasse 10MB`,
          variant: 'destructive'
        })
        return false
      }
      
      return true
    })
    
    if (newFiles.length === 0) return
    
    // Create previews
    const newPreviews = newFiles.map(file => URL.createObjectURL(file))
    
    setBreakdownMedia(prev => [...prev, ...newFiles])
    setBreakdownMediaPreviews(prev => [...prev, ...newPreviews])
  }
  
  // Remove media file
  const removeMedia = (index: number) => {
    URL.revokeObjectURL(breakdownMediaPreviews[index])
    setBreakdownMedia(prev => prev.filter((_, i) => i !== index))
    setBreakdownMediaPreviews(prev => prev.filter((_, i) => i !== index))
  }
  
  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    handleMediaUpload(e.dataTransfer.files)
  }

  const openAddDialog = () => {
    setEditingItem(null)
    setForm({ category: "cutting", type: "", status: EQUIPMENT_STATUSES.STORED, location: "", model: "", serialNumber: "", chipNumber: "", brand: "", acquisitionDate: "" })
    // Reset personnel selections
    setSelectedMachinistId('')
    setSelectedMechanicId('')
    setSelectedElectricianId('')
    setSelectedMaintenanceWorkerId('')
    // Reset breakdown info
    setBreakdownType('')
    setBreakdownDescription('')
    setBreakdownMedia([])
    setBreakdownMediaPreviews([])
    setIsDialogOpen(true)
  }

  const openEditDialog = async (item: Equipment) => {
    setEditingItem(item)
    const brandId = typeof item.brand === 'object' && item.brand ? item.brand._id : (item.brand || "")
    setForm({ category: item.category._id, type: item.type._id, status: item.status, location: item.location, model: item.model || "", serialNumber: item.serialNumber || "", chipNumber: item.chipNumber || "", brand: brandId, acquisitionDate: item.acquisitionDate ? new Date(item.acquisitionDate).toISOString().split('T')[0] : "" })
    // Reset personnel selections
    setSelectedMachinistId('')
    setSelectedMechanicId('')
    setSelectedElectricianId('')
    setSelectedMaintenanceWorkerId('')
    // Reset breakdown info
    setBreakdownType('')
    setBreakdownDescription('')
    setBreakdownMedia([])
    setBreakdownMediaPreviews([])
    
    // Load breakdown info if equipment is in breakdown status
    if (item.status === EQUIPMENT_STATUSES.BREAKDOWN) {
      console.log('🔍 Loading breakdown info for equipment:', item._id)
      if (item.lastBreakdownType) {
        console.log('✅ Found breakdown info in equipment:', item.lastBreakdownType)
        setBreakdownType(item.lastBreakdownType)
        setBreakdownDescription(item.lastBreakdownDescription || '')
      } else {
        console.log('⚠️ No breakdown info found in equipment')
      }
    }
    
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    // Validate machinist for "In Production" status
    if (form.status === EQUIPMENT_STATUSES.IN_PRODUCTION && !selectedMachinistId) {
      toast({
        title: 'Machinist Required',
        description: 'Please select a machinist for production status',
        variant: 'destructive'
      })
      return
    }

    // Validate breakdown type and description for "Breakdown" status
    if (form.status === EQUIPMENT_STATUSES.BREAKDOWN) {
      if (!breakdownType) {
        toast({
          title: 'Type de Panne Requis',
          description: 'Veuillez sélectionner le type de panne',
          variant: 'destructive'
        })
        return
      }
      if (!breakdownDescription.trim()) {
        toast({
          title: 'Description Requise',
          description: 'Veuillez décrire la panne',
          variant: 'destructive'
        })
        return
      }
      // Note: Media files are collected but not sent to API yet
      // TODO: Create separate API endpoint for file uploads
    }

    // Validate maintenance personnel for maintenance statuses
    const maintenanceStatuses: EquipmentStatus[] = [EQUIPMENT_STATUSES.UNDER_REPAIR, EQUIPMENT_STATUSES.UNDER_INSPECTION, EQUIPMENT_STATUSES.SCHEDULED_MAINTENANCE, EQUIPMENT_STATUSES.IN_WORKSHOP]
    if (maintenanceStatuses.includes(form.status as EquipmentStatus)) {
      if (!selectedMechanicId && !selectedElectricianId && !selectedMaintenanceWorkerId) {
        toast({
          title: 'Maintenance Personnel Required',
          description: 'Please select at least one maintenance personnel (Mechanic, Electrician, or Maintenance Worker)',
          variant: 'destructive'
        })
        return
      }
    }

    try {
      setIsSaving(true)
      if (editingItem) {
        const prev = equipment
        const optimistic = equipment.map((e) => e._id === editingItem._id ? {
          ...e,
          status: form.status,
          location: form.location,
          model: form.model,
          serialNumber: form.serialNumber,
          chipNumber: form.chipNumber,
          brand: form.brand,
          acquisitionDate: form.acquisitionDate,
          category: categories.find(c => c._id === form.category) || e.category,
          type: types.find(t => t._id === form.type) || e.type
        } as Equipment : e)
        setEquipment(optimistic)
        try {
          // Check if status changed and requires personnel
          const statusChanged = editingItem.status !== form.status
          const requiresPersonnel = 
            form.status === EQUIPMENT_STATUSES.IN_PRODUCTION ||
            ([EQUIPMENT_STATUSES.UNDER_REPAIR, EQUIPMENT_STATUSES.UNDER_INSPECTION, EQUIPMENT_STATUSES.SCHEDULED_MAINTENANCE, EQUIPMENT_STATUSES.IN_WORKSHOP] as EquipmentStatus[]).includes(form.status as EquipmentStatus)
          
          if (statusChanged && requiresPersonnel) {
            // Step 1: Change status with personnel using changeEquipmentStatus
            await changeEquipmentStatus(editingItem._id, {
              status: form.status as EquipmentStatus,
              machinistId: selectedMachinistId || undefined,
              mechanicId: selectedMechanicId || undefined,
              electricianId: selectedElectricianId || undefined,
              maintenanceWorkerId: selectedMaintenanceWorkerId || undefined,
              breakdownType: breakdownType || undefined,
              breakdownDescription: breakdownDescription || undefined
            })
          }
          
          // Step 2: Update other fields (excluding status to avoid conflicts)
          const { status, ...otherFields } = form
          await updateEquipment(editingItem._id, otherFields)
          
          // Step 3: Upload breakdown media if status is Breakdown and there are files
          if (form.status === EQUIPMENT_STATUSES.BREAKDOWN && breakdownMedia.length > 0) {
            try {
              await uploadBreakdownMedia(
                editingItem._id,
                breakdownType,
                breakdownDescription,
                breakdownMedia
              )
              toast({ 
                title: "Updated", 
                description: `Equipment updated with ${breakdownMedia.length} media file(s)` 
              })
            } catch (mediaErr) {
              console.error('Error uploading media:', mediaErr)
              toast({ 
                title: "Partially Updated", 
                description: "Equipment updated but media upload failed",
                variant: "destructive"
              })
            }
          } else {
            toast({ title: "Updated", description: "Equipment updated successfully" })
          }
        } catch (err) {
          setEquipment(prev)
          throw err
        }
      } else {
        const tempId = `temp-${Date.now()}`
        const tempCategory = categories.find(c => c._id === form.category) || { _id: form.category, name: 'Loading...' }
        const tempType = types.find(t => t._id === form.type) || { _id: form.type, name: 'Loading...', category: tempCategory }
        const tempItem: Equipment = {
          _id: tempId,
          category: tempCategory,
          type: tempType,
          status: form.status,
          location: form.location,
          model: form.model,
          serialNumber: form.serialNumber,
          chipNumber: form.chipNumber,
          brand: form.brand,
          acquisitionDate: form.acquisitionDate,
          mtbf: 0,
          mttr: 0,
          timeSinceAcquisition: 0,
          operatingTime: 0,
          downtime: 0,
          availability: 0,
          lastMaintenance: new Date().toISOString(),
          nextMaintenance: new Date().toISOString()
        }
        setEquipment([tempItem, ...equipment])
        try {
          const res = await createEquipment(form)
          const created = (res as any).equipment
          setEquipment((list) => list.map((e) => e._id === tempId ? { ...created } : e))
          toast({ title: "Created", description: "Equipment created successfully" })
        } catch (err) {
          setEquipment((list) => list.filter((e) => e._id !== tempId))
          throw err
        }
      }
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Save equipment error:', error)
      toast({ title: "Error", description: "Failed to save equipment", variant: "destructive" })
    }
    finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id)
      const prev = equipment
      setEquipment(prev.filter((e) => e._id !== id))
      try {
        await deleteEquipment(id)
        toast({ title: "Deleted", description: "Equipment deleted" })
      } catch (err) {
        setEquipment(prev)
        throw err
      }
    } catch (error) {
      console.error('Delete equipment error:', error)
      toast({ title: "Error", description: "Failed to delete equipment", variant: "destructive" })
    }
    finally {
      setDeletingId(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_production': return <CheckCircle className="h-4 w-4" />
      case 'scheduled_maintenance': return <Clock className="h-4 w-4" />
      case 'breakdown': return <AlertTriangle className="h-4 w-4" />
      case 'offline': return <Settings className="h-4 w-4" />
      case 'scrapped': return <AlertTriangle className="h-4 w-4" />
      default: return <Settings className="h-4 w-4" />
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Invalid date'
      return date.toLocaleDateString()
    } catch {
      return 'Invalid date'
    }
  }

  const formatTime = (hours: number, includeSeconds = false) => {
    const totalSeconds = Math.floor(hours * 3600)
    const days = Math.floor(totalSeconds / 86400)
    const remainingSeconds = totalSeconds % 86400
    const hrs = Math.floor(remainingSeconds / 3600)
    const mins = Math.floor((remainingSeconds % 3600) / 60)
    const secs = remainingSeconds % 60

    if (days > 0) {
      return includeSeconds ? `${days}d ${hrs}h ${mins}m ${secs}s` : `${days}d ${hrs}h ${mins}m`
    } else if (hrs > 0) {
      return includeSeconds ? `${hrs}h ${mins}m ${secs}s` : `${hrs}h ${mins}m`
    } else if (mins > 0) {
      return includeSeconds ? `${mins}m ${secs}s` : `${mins}m`
    } else {
      return includeSeconds ? `${secs}s` : '0m'
    }
  }

  const formatDays = (days: number) => {
    const totalHours = days * 24
    return formatTime(totalHours)
  }

  const getEquipmentLocation = (equipmentId: string) => {
    const section = sections.find(s => s.equipment.some((e: any) => e.equipmentId._id === equipmentId))
    if (section) {
      const line = lines.find(l => l._id === section.productionLine._id)
      return `Line: ${line?.name || 'Unknown'}, Section: ${section.name}`
    }
    return 'Not assigned'
  }


  const filteredEquipment = equipment

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
            Equipment Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Monitor and manage all factory equipment
          </p>
        </div>
        <div className="flex gap-2">
        {(user?.role === 'admin' || user?.role === 'maintenance_manager') && (
        <Button onClick={openAddDialog} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Equipment
        </Button>
        )}
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search equipment..."
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
                <SelectItem value="in_production">In Production</SelectItem>
                <SelectItem value="setup_adjustment">Setup/Adjustment</SelectItem>
                <SelectItem value="paused_by_operator">Paused by Operator</SelectItem>
                <SelectItem value="changeover">Changeover</SelectItem>
                <SelectItem value="scheduled_maintenance">Scheduled Maintenance</SelectItem>
                <SelectItem value="breakdown">Breakdown</SelectItem>
                <SelectItem value="under_repair">Under Repair</SelectItem>
                <SelectItem value="in_workshop">In Workshop</SelectItem>
                <SelectItem value="waiting_spare_parts">Waiting Spare Parts</SelectItem>
                <SelectItem value="testing_after_repair">Testing After Repair</SelectItem>
                <SelectItem value="under_inspection">Under Inspection</SelectItem>
                <SelectItem value="pending_validation">Pending Validation</SelectItem>
                <SelectItem value="stored">Stored</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="scrapped">Scrapped</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => { setPage(1); setSort(v) }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Created</SelectItem>
                <SelectItem value="updatedAt">Updated</SelectItem>
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

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEquipment.map((item) => (
          <Card key={item._id} className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg"><Link className="hover:underline" to={`/equipment/${item._id}`}>{item.category?.name} - {item.type?.name}</Link></CardTitle>
                <Badge className={`${getStatusColor(item.status as EquipmentStatus)} text-white flex items-center gap-1`}>
                  {getStatusIcon(item.status)}
                  {getStatusLabel(item.status as EquipmentStatus)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Location</p>
                  <p className="text-slate-900 flex items-center">
                    <MapPin className="mr-1 h-3 w-3" />
                    {item.location}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Model</p>
                  <p className="text-slate-900">{item.model || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Brand</p>
                  <p className="text-slate-900">
                    {typeof item.brand === 'object' && item.brand ? item.brand.name : (item.brand || '-')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Serial Number</p>
                  <p className="text-slate-900">{item.serialNumber || '-'}</p>
                </div>
              </div>

              <div className="text-sm">
                <p className="text-slate-500">Assigned to</p>
                <p className="text-slate-900">{getEquipmentLocation(item._id)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Serial Number</p>
                  <p className="text-slate-900">{item.serialNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Chip Number</p>
                  <p className="text-slate-900">{item.chipNumber || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">MTBF</p>
                  <p className="font-semibold text-slate-900">{formatTime(item.mtbf)}</p>
                </div>
                <div>
                  <p className="text-slate-500">MTTR</p>
                  <p className="font-semibold text-slate-900">{formatTime(item.mttr)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Time Since Acquisition</p>
                  <p className="font-semibold text-slate-900">{formatDays(item.timeSinceAcquisition)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Operating Time</p>
                  <p className="font-semibold text-slate-900">{formatTime(item.operatingTime)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Downtime</p>
                  <p className="font-semibold text-slate-900">{formatTime(item.downtime)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Availability</p>
                  <p className="font-semibold text-slate-900">{(item.availability || 0).toFixed(1)}%</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Last Maintenance:</span>
                  <span className="text-slate-900">{formatDate(item.lastMaintenance)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Next Maintenance:</span>
                  <span className="text-slate-900 flex items-center">
                    <Calendar className="mr-1 h-3 w-3" />
                    {formatDate(item.nextMaintenance)}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/equipment/${item._id}/interventions`)}
                  className="text-xs"
                >
                  <History className="mr-1 h-3 w-3" />
                  History
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/equipment/${item._id}/parts`)}
                  className="text-xs"
                >
                  <Package className="mr-1 h-3 w-3" />
                  Parts
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/equipment/${item._id}/consumable`)}
                  className="text-xs"
                >
                  <Droplet className="mr-1 h-3 w-3" />
                  Consommables
                </Button>
              </div>

              <div className="flex gap-2 pt-2">
                {(user?.role === 'admin' || user?.role === 'maintenance_manager' || user?.role === 'assistant_maintenance_manager' || user?.role === 'foreman') && (
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(item)} disabled={deletingId === item._id}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                )}
                {user?.role === 'admin' && (
                  <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleDelete(item._id)} disabled={deletingId === item._id}>
                    <Trash className="mr-2 h-4 w-4" /> {deletingId === item._id ? 'Deleting...' : 'Delete'}
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

      {/* Add/Edit Equipment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Equipment' : 'Add Equipment'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value, type: "" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category._id} value={category._id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {types.filter(type => type.category._id === form.category).map((type) => (
                    <SelectItem key={type._id} value={type._id}>
                      {type.name}
                    </SelectItem>
                  )) || <SelectItem value="" disabled>No types available</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(value) => {
                const previousStatus = editingItem?.status || form.status
                setForm({ ...form, status: value })
                
                // Debug logs
                console.log('=== AUTO-SUGGESTION DEBUG ===')
                console.log('New Status:', value)
                console.log('Previous Status:', previousStatus)
                console.log('Breakdown Type:', breakdownType)
                console.log('Is Under Repair?', value === EQUIPMENT_STATUSES.UNDER_REPAIR)
                console.log('Was Breakdown?', previousStatus === EQUIPMENT_STATUSES.BREAKDOWN)
                console.log('Has Breakdown Type?', !!breakdownType)
                
                // Auto-suggest personnel when changing to Under Repair or In Workshop from Breakdown
                if ((value === EQUIPMENT_STATUSES.UNDER_REPAIR || value === EQUIPMENT_STATUSES.IN_WORKSHOP) && previousStatus === EQUIPMENT_STATUSES.BREAKDOWN && breakdownType) {
                  console.log('✅ Conditions met! Looking for personnel...')
                  const selectedType = breakdownTypes.find(t => t.value === breakdownType)
                  console.log('Selected Type:', selectedType)
                  if (selectedType?.suggestedPersonnel === 'mechanic' && mechanics.length > 0) {
                    setSelectedMechanicId(mechanics[0]._id)
                    toast({
                      title: 'Suggested Personnel',
                      description: `Mechanic pre-selected based on breakdown type (${selectedType.label})`,
                    })
                  } else if (selectedType?.suggestedPersonnel === 'electrician' && electricians.length > 0) {
                    setSelectedElectricianId(electricians[0]._id)
                    toast({
                      title: 'Suggested Personnel',
                      description: `Electrician pre-selected based on breakdown type (${selectedType.label})`,
                    })
                  } else if (selectedType?.suggestedPersonnel === 'worker' && maintenanceWorkers.length > 0) {
                    setSelectedMaintenanceWorkerId(maintenanceWorkers[0]._id)
                    toast({
                      title: 'Suggested Personnel',
                      description: `Maintenance worker pre-selected based on breakdown type (${selectedType.label})`,
                    })
                  }
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {/* Production Status - Green background */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-green-700 bg-green-50 border-b border-green-200">
                    🟢 PRODUCTION
                  </div>
                  <SelectItem value={EQUIPMENT_STATUSES.IN_PRODUCTION} className="pl-6 bg-green-50/30 hover:bg-green-100">
                    In Production
                  </SelectItem>
                  <SelectItem value={EQUIPMENT_STATUSES.SETUP_ADJUSTMENT} className="pl-6 bg-green-50/30 hover:bg-green-100">
                    Setup/Adjustment
                  </SelectItem>
                  <SelectItem value={EQUIPMENT_STATUSES.PAUSED_BY_OPERATOR} className="pl-6 bg-green-50/30 hover:bg-green-100">
                    Paused by Operator
                  </SelectItem>
                  <SelectItem value={EQUIPMENT_STATUSES.CHANGEOVER} className="pl-6 bg-green-50/30 hover:bg-green-100">
                    Changeover
                  </SelectItem>
                  <SelectItem value={EQUIPMENT_STATUSES.OFFLINE} className="pl-6 bg-gray-50/30 hover:bg-gray-100">
                    Offline
                  </SelectItem>
                  
                  {/* Maintenance Status - Orange background */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 border-b border-orange-200 mt-1">
                    🟠 MAINTENANCE
                  </div>
                  <SelectItem value={EQUIPMENT_STATUSES.SCHEDULED_MAINTENANCE} className="pl-6 bg-orange-50/30 hover:bg-orange-100">
                    Scheduled Maintenance
                  </SelectItem>
                  <SelectItem value={EQUIPMENT_STATUSES.BREAKDOWN} className="pl-6 bg-orange-50/30 hover:bg-orange-100">
                    Breakdown
                  </SelectItem>
                  <SelectItem value={EQUIPMENT_STATUSES.UNDER_REPAIR} className="pl-6 bg-orange-50/30 hover:bg-orange-100">
                    Under Repair
                  </SelectItem>
                  <SelectItem value={EQUIPMENT_STATUSES.IN_WORKSHOP} className="pl-6 bg-orange-50/30 hover:bg-orange-100">
                    In Workshop
                  </SelectItem>
                  <SelectItem value={EQUIPMENT_STATUSES.WAITING_SPARE_PARTS} className="pl-6 bg-orange-50/30 hover:bg-orange-100">
                    Waiting Spare Parts
                  </SelectItem>
                  <SelectItem value={EQUIPMENT_STATUSES.TESTING_AFTER_REPAIR} className="pl-6 bg-orange-50/30 hover:bg-orange-100">
                    Testing After Repair
                  </SelectItem>
                  <SelectItem value={EQUIPMENT_STATUSES.UNDER_INSPECTION} className="pl-6 bg-orange-50/30 hover:bg-orange-100">
                    Under Inspection
                  </SelectItem>
                  <SelectItem value={EQUIPMENT_STATUSES.PENDING_VALIDATION} className="pl-6 bg-orange-50/30 hover:bg-orange-100">
                    Pending Validation
                  </SelectItem>
                  
                  {/* Out of Service Status - Gray background */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 border-b border-gray-200 mt-1">
                    ⚫ OUT OF SERVICE
                  </div>
                  <SelectItem value={EQUIPMENT_STATUSES.STORED} className="pl-6 bg-gray-50/30 hover:bg-gray-100">
                    Stored
                  </SelectItem>
                  <SelectItem value={EQUIPMENT_STATUSES.SCRAPPED} className="pl-6 bg-gray-50/30 hover:bg-gray-100">
                    Scrapped
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Machinist Selection - Only show when status is "In Production" */}
            {form.status === EQUIPMENT_STATUSES.IN_PRODUCTION && (
              <div className="grid gap-2">
                <Label htmlFor="machinist">Machinist <span className="text-red-500">*</span></Label>
                <Select value={selectedMachinistId} onValueChange={setSelectedMachinistId}>
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

            {/* Breakdown Information - Only show when status is "Breakdown" */}
            {form.status === EQUIPMENT_STATUSES.BREAKDOWN && (
              <div className={`space-y-4 p-4 border rounded-lg ${!breakdownType || !breakdownDescription ? 'bg-red-50 border-red-300' : 'bg-yellow-50 border-yellow-300'}`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-5 w-5 ${!breakdownType || !breakdownDescription ? 'text-red-600' : 'text-yellow-600'}`} />
                  <Label className={`text-base font-semibold ${!breakdownType || !breakdownDescription ? 'text-red-900' : 'text-yellow-900'}`}>
                    Informations sur la Panne <span className="text-red-500">*</span>
                  </Label>
                </div>
                <p className={`text-sm ${!breakdownType || !breakdownDescription ? 'text-red-700 font-medium' : 'text-yellow-700'}`}>
                  {!breakdownType || !breakdownDescription ? '⚠️ Veuillez renseigner le type et la description de la panne' : 'Ces informations aideront à suggérer le bon personnel de maintenance'}
                </p>
                
                {/* Breakdown Type */}
                <div className="grid gap-2">
                  <Label htmlFor="breakdownType">Type de Panne <span className="text-red-500">*</span></Label>
                  <Select value={breakdownType} onValueChange={(value) => {
                    setBreakdownType(value)
                    // Auto-suggest personnel based on breakdown type
                    const selectedType = breakdownTypes.find(t => t.value === value)
                    if (selectedType?.suggestedPersonnel === 'mechanic' && mechanics.length > 0) {
                      setSelectedMechanicId(mechanics[0]._id)
                    } else if (selectedType?.suggestedPersonnel === 'electrician' && electricians.length > 0) {
                      setSelectedElectricianId(electricians[0]._id)
                    } else if (selectedType?.suggestedPersonnel === 'worker' && maintenanceWorkers.length > 0) {
                      setSelectedMaintenanceWorkerId(maintenanceWorkers[0]._id)
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le type de panne" />
                    </SelectTrigger>
                    <SelectContent>
                      {breakdownTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Breakdown Description */}
                <div className="grid gap-2">
                  <Label htmlFor="breakdownDescription">Description de la Panne <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="breakdownDescription"
                    value={breakdownDescription}
                    onChange={(e) => setBreakdownDescription(e.target.value)}
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
                  <div
                    className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors cursor-pointer"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('breakdownMediaInput')?.click()}
                  >
                    <Package className="h-12 w-12 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-600 mb-1">
                      Glissez-déposez vos fichiers ici ou cliquez pour sélectionner
                    </p>
                    <p className="text-xs text-slate-500">
                      Images et vidéos acceptées (max 10MB par fichier)
                    </p>
                    <input
                      id="breakdownMediaInput"
                      type="file"
                      accept="image/*,video/*"
                      capture="environment"
                      multiple
                      className="hidden"
                      onChange={(e) => handleMediaUpload(e.target.files)}
                    />
                  </div>
                  
                  {/* Media Previews */}
                  {breakdownMediaPreviews.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {breakdownMediaPreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          {breakdownMedia[index].type.startsWith('image/') ? (
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded border"
                            />
                          ) : (
                            <video
                              src={preview}
                              className="w-full h-24 object-cover rounded border"
                              controls={false}
                            />
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeMedia(index)
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash className="h-3 w-3" />
                          </button>
                          <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                            {breakdownMedia[index].type.startsWith('image/') ? '📷' : '🎥'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-500">
                    {breakdownMedia.length} fichier(s) sélectionné(s)
                  </p>
                </div>
              </div>
            )}

            {/* Maintenance Personnel Selection - Only show for maintenance statuses */}
            {([EQUIPMENT_STATUSES.UNDER_REPAIR, EQUIPMENT_STATUSES.UNDER_INSPECTION, EQUIPMENT_STATUSES.SCHEDULED_MAINTENANCE, EQUIPMENT_STATUSES.IN_WORKSHOP] as EquipmentStatus[]).includes(form.status as EquipmentStatus) && (
              <div className={`space-y-4 p-4 border rounded-lg ${!selectedMechanicId && !selectedElectricianId && !selectedMaintenanceWorkerId ? 'bg-red-50 border-red-300' : 'bg-orange-50'}`}>
                <div className="flex items-center gap-2">
                  <Wrench className={`h-5 w-5 ${!selectedMechanicId && !selectedElectricianId && !selectedMaintenanceWorkerId ? 'text-red-600' : 'text-orange-600'}`} />
                  <Label className={`text-base font-semibold ${!selectedMechanicId && !selectedElectricianId && !selectedMaintenanceWorkerId ? 'text-red-900' : 'text-orange-900'}`}>
                    Maintenance Personnel <span className="text-red-500">*</span>
                  </Label>
                </div>
                <p className={`text-sm ${!selectedMechanicId && !selectedElectricianId && !selectedMaintenanceWorkerId ? 'text-red-700 font-medium' : 'text-orange-700'}`}>
                  {!selectedMechanicId && !selectedElectricianId && !selectedMaintenanceWorkerId ? '⚠️ Please select at least one maintenance personnel to continue' : 'Select at least one maintenance personnel who will perform the maintenance work'}
                </p>
                
                {/* Mechanic */}
                <div className={`grid gap-2 ${breakdownType && breakdownTypes.find(t => t.value === breakdownType)?.suggestedPersonnel === 'mechanic' ? 'p-3 border-2 border-green-400 rounded-lg bg-green-50' : ''}`}>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="mechanic">Mechanic</Label>
                    {breakdownType && breakdownTypes.find(t => t.value === breakdownType)?.suggestedPersonnel === 'mechanic' && (
                      <Badge className="bg-green-500 text-white text-xs">✓ Suggéré</Badge>
                    )}
                  </div>
                  <Select value={selectedMechanicId} onValueChange={(val) => setSelectedMechanicId(val === 'none' ? '' : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select mechanic (optional)" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="none">None</SelectItem>
                      {mechanics.map((mechanic) => (
                        <SelectItem key={mechanic._id} value={mechanic._id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{mechanic.fullName}</span>
                            <span className="text-xs text-slate-500">Matricule: {mechanic.matricule}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Electrician */}
                <div className={`grid gap-2 ${breakdownType && breakdownTypes.find(t => t.value === breakdownType)?.suggestedPersonnel === 'electrician' ? 'p-3 border-2 border-green-400 rounded-lg bg-green-50' : ''}`}>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="electrician">Electrician</Label>
                    {breakdownType && breakdownTypes.find(t => t.value === breakdownType)?.suggestedPersonnel === 'electrician' && (
                      <Badge className="bg-green-500 text-white text-xs">✓ Suggéré</Badge>
                    )}
                  </div>
                  <Select value={selectedElectricianId} onValueChange={(val) => setSelectedElectricianId(val === 'none' ? '' : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select electrician (optional)" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="none">None</SelectItem>
                      {electricians.map((electrician) => (
                        <SelectItem key={electrician._id} value={electrician._id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{electrician.fullName}</span>
                            <span className="text-xs text-slate-500">Matricule: {electrician.matricule}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Maintenance Worker */}
                <div className={`grid gap-2 ${breakdownType && breakdownTypes.find(t => t.value === breakdownType)?.suggestedPersonnel === 'worker' ? 'p-3 border-2 border-green-400 rounded-lg bg-green-50' : ''}`}>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="maintenanceWorker">Maintenance Worker</Label>
                    {breakdownType && breakdownTypes.find(t => t.value === breakdownType)?.suggestedPersonnel === 'worker' && (
                      <Badge className="bg-green-500 text-white text-xs">✓ Suggéré</Badge>
                    )}
                  </div>
                  <Select value={selectedMaintenanceWorkerId} onValueChange={(val) => setSelectedMaintenanceWorkerId(val === 'none' ? '' : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select maintenance worker (optional)" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="none">None</SelectItem>
                      {maintenanceWorkers.map((worker) => (
                        <SelectItem key={worker._id} value={worker._id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{worker.fullName}</span>
                            <span className="text-xs text-slate-500">Matricule: {worker.matricule}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Enter location" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="model">Model</Label>
              <Input id="model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Enter model" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input id="serialNumber" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} placeholder="Enter serial number" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="chipNumber">Chip Number</Label>
              <Input id="chipNumber" value={form.chipNumber} onChange={(e) => setForm({ ...form, chipNumber: e.target.value })} placeholder="Enter chip number" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="brand">Brand</Label>
              <Select value={form.brand} onValueChange={(value) => setForm({ ...form, brand: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand._id} value={brand._id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="acquisitionDate">Acquisition Date</Label>
              <Input id="acquisitionDate" type="date" value={form.acquisitionDate} onChange={(e) => setForm({ ...form, acquisitionDate: e.target.value })} placeholder="Select installation date" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-indigo-600" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {filteredEquipment.length === 0 && (
        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
          <CardContent className="p-12 text-center">
            <Settings className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No equipment found</h3>
            <p className="text-slate-600">Try adjusting your search or filter criteria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Add/Edit Dialog
// Placed at end to keep JSX cleaner
export default function EquipmentPageWrapper() {
  return <Equipment />
}
