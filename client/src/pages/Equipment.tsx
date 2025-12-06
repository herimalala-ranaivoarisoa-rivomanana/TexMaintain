import { useEffect, useState } from "react"
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
  Wrench,
  QrCode
} from "lucide-react"
import { QRCodeScanner } from "@/components/QRCodeScanner"
import { QRCodeGenerator } from "@/components/QRCodeGenerator"
import { getEquipment, createEquipment, updateEquipment, deleteEquipment, changeEquipmentStatus } from "@/api/equipment"
import { getBrands } from "@/api/brands"
import { getMachinists } from "@/api/machinists"
import { getMechanics } from "@/api/mechanics"
import { getElectricians } from "@/api/electricians"
import { getMaintenanceWorkers } from "@/api/maintenanceWorkers"
import { uploadBreakdownMedia } from "@/api/breakdownMedia"
import { getEquipmentCategories } from "@/api/equipmentCategories"
import { getEquipmentTypes } from "@/api/equipmentTypes"
import { useToast } from "@/hooks/useToast"
import { useAuth } from "@/contexts/AuthContext"
import { EQUIPMENT_STATUSES, EquipmentStatus, getStatusColor, getStatusLabel } from "@/types/equipment"



const breakdownTypes = [
  { value: 'mechanical', label: 'Mechanical', suggestedPersonnel: 'mechanic' },
  { value: 'electrical', label: 'Electrical', suggestedPersonnel: 'electrician' },
  { value: 'hydraulic', label: 'Hydraulic', suggestedPersonnel: 'mechanic' },
  { value: 'pneumatic', label: 'Pneumatic', suggestedPersonnel: 'mechanic' },
  { value: 'software', label: 'Software/Control', suggestedPersonnel: 'worker' },
  { value: 'other', label: 'Other', suggestedPersonnel: 'worker' }
]

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

interface Equipment {
  _id: string
  name: string
  status: string
  category: Category
  type: EquipmentType
  brand: { _id: string; name: string } | string
  model: string
  serialNumber: string
  chipNumber: string
  acquisitionDate: string
  location: string
  lastBreakdownType?: string
  lastBreakdownDescription?: string
  machinistId?: string
  mechanicId?: string
  electricianId?: string
  maintenanceWorkerId?: string
  mtbf: number
  mttr: number
  timeSinceAcquisition: number
  operatingTime: number
  downtime: number
  availability: number
  lastMaintenance: string
  nextMaintenance: string
}



export function Equipment() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [types, setTypes] = useState<EquipmentType[]>([])
  const [brands, setBrands] = useState<{ _id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchParams] = useSearchParams()
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || "all")
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10) || 1)
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState<number>(() => parseInt(localStorage.getItem('eq_limit') || '12', 10) || 12)
  const [sort, setSort] = useState<string>(searchParams.get('sort') || 'createdAt')
  const [order, setOrder] = useState<'asc' | 'desc'>((searchParams.get('order') as any) || 'desc')
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState<any>({
    category: "",
    type: "",
    brand: "",
    model: "",
    serialNumber: "",
    chipNumber: "",
    acquisitionDate: "",
    status: "offline",
    location: "",
    machinistId: "",
    mechanicId: "",
    electricianId: "",
    maintenanceWorkerId: "",
    breakdownType: "",
    breakdownDescription: "",
    images: []
  })
  const [editingItem, setEditingItem] = useState<any>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [createdEquipmentId, setCreatedEquipmentId] = useState<string | null>(null)

  // Personnel state
  const [machinists, setMachinists] = useState<any[]>([])
  const [mechanics, setMechanics] = useState<any[]>([])
  const [electricians, setElectricians] = useState<any[]>([])
  const [maintenanceWorkers, setMaintenanceWorkers] = useState<any[]>([])

  // Selected personnel state
  const [selectedMachinistId, setSelectedMachinistId] = useState<string>("")
  const [selectedMechanicId, setSelectedMechanicId] = useState<string>("")
  const [selectedElectricianId, setSelectedElectricianId] = useState<string>("")
  const [selectedMaintenanceWorkerId, setSelectedMaintenanceWorkerId] = useState<string>("")

  // Breakdown state
  const [breakdownType, setBreakdownType] = useState<string>("")
  const [breakdownDescription, setBreakdownDescription] = useState<string>("")
  const [breakdownMedia, setBreakdownMedia] = useState<File[]>([])
  const [breakdownMediaPreviews, setBreakdownMediaPreviews] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const fetchEquipment = async () => {
    try {
      setLoading(true)
      const data = await getEquipment({
        page,
        limit,
        sort,
        order,
        q: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined
      })
      setEquipment(data.equipment || [])
      setTotal(data.total)
    } catch (error) {
      console.error("Error fetching equipment:", error)
      toast({
        title: "Error",
        description: "Failed to fetch equipment",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEquipment()
  }, [page, limit, sort, order, searchTerm, statusFilter])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesData, typesData, brandsData, machinistsData, mechanicsData, electriciansData, workersData] = await Promise.all([
          getEquipmentCategories(),
          getEquipmentTypes(),
          getBrands(),
          getMachinists(),
          getMechanics(),
          getElectricians(),
          getMaintenanceWorkers()
        ])
        setCategories(categoriesData.categories || categoriesData)
        setTypes(typesData.types || typesData)
        setBrands(brandsData.brands || [])
        setMachinists(machinistsData.machinists || [])
        setMechanics(mechanicsData.mechanics || [])
        setElectricians(electriciansData.electricians || [])
        setMaintenanceWorkers(workersData.workers || [])
      } catch (error) {
        console.error("Error fetching initial data:", error)
      }
    }
    fetchData()
  }, [])

  const openAddDialog = () => {
    setEditingItem(null)
    setForm({
      category: "",
      type: "",
      brand: "",
      model: "",
      serialNumber: "",
      chipNumber: "",
      acquisitionDate: "",
      status: "offline",
      location: "",
      machinistId: "",
      mechanicId: "",
      electricianId: "",
      maintenanceWorkerId: "",
      breakdownType: "",
      breakdownDescription: "",
      images: []
    })
    setSelectedMachinistId("")
    setSelectedMechanicId("")
    setSelectedElectricianId("")
    setSelectedMaintenanceWorkerId("")
    setBreakdownType("")
    setBreakdownDescription("")
    setBreakdownMedia([])
    setBreakdownMediaPreviews([])
    setIsDialogOpen(true)
  }

  const openEditDialog = (item: any) => {
    setEditingItem(item)
    setForm({
      category: item.category?._id || "",
      type: item.type?._id || "",
      brand: item.brand?._id || "",
      model: item.model || "",
      serialNumber: item.serialNumber || "",
      chipNumber: item.chipNumber || "",
      acquisitionDate: item.acquisitionDate ? item.acquisitionDate.split('T')[0] : "",
      status: item.status || "offline",
      location: item.location || "",
      machinistId: item.machinistId || "",
      mechanicId: item.mechanicId || "",
      electricianId: item.electricianId || "",
      maintenanceWorkerId: item.maintenanceWorkerId || "",
      breakdownType: item.lastBreakdownType || "",
      breakdownDescription: item.lastBreakdownDescription || "",
      images: []
    })

    setSelectedMachinistId(item.machinistId || "")
    setSelectedMechanicId(item.mechanicId || "")
    setSelectedElectricianId(item.electricianId || "")
    setSelectedMaintenanceWorkerId(item.maintenanceWorkerId || "")

    if (item.status === EQUIPMENT_STATUSES.BREAKDOWN) {
      setBreakdownType(item.lastBreakdownType || "")
      setBreakdownDescription(item.lastBreakdownDescription || "")
    } else {
      setBreakdownType("")
      setBreakdownDescription("")
    }

    setBreakdownMedia([])
    setBreakdownMediaPreviews([])
    setIsDialogOpen(true)
  }



  const handleScan = (data: string) => {
    if (data) {
      setSearchTerm(data)
      setIsScannerOpen(false)
      toast({
        title: "QR Code Scanned",
        description: `Found equipment: ${data}`,
      })
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleMediaUpload(e.dataTransfer.files)
    }
  }

  const handleMediaUpload = (files: FileList | null) => {
    if (!files) return
    const newFiles = Array.from(files)
    setBreakdownMedia(prev => [...prev, ...newFiles])

    const newPreviews = newFiles.map(file => URL.createObjectURL(file))
    setBreakdownMediaPreviews(prev => [...prev, ...newPreviews])
  }

  const removeMedia = (index: number) => {
    setBreakdownMedia(prev => prev.filter((_, i) => i !== index))
    setBreakdownMediaPreviews(prev => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
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
          // Check if status changed
          const statusChanged = editingItem.status !== form.status

          if (statusChanged) {
            // Step 1: Change status (with or without personnel)
            await changeEquipmentStatus(editingItem._id, {
              status: form.status as any,
              machinistId: selectedMachinistId || undefined,
              mechanicId: selectedMechanicId || undefined,
              electricianId: selectedElectricianId || undefined,
              maintenanceWorkerId: selectedMaintenanceWorkerId || undefined,
              breakdownType: breakdownType || undefined,
              breakdownDescription: breakdownDescription || undefined
            })

            // Step 2: Update other fields (excluding status to avoid conflicts)
            const { status, ...otherFields } = form
            if (Object.keys(otherFields).length > 0) {
              await updateEquipment(editingItem._id, otherFields)
            }
          } else {
            // No status change, just update all fields
            await updateEquipment(editingItem._id, form)
          }

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
            } catch (mediaErr: any) {
              console.error('❌ Error uploading media:', mediaErr)
              console.error('Error details:', {
                message: mediaErr?.message,
                response: mediaErr?.response?.data,
                status: mediaErr?.response?.status
              })

              const errorMessage = mediaErr?.response?.data?.error || 'Media upload failed'

              toast({
                title: "Partially Updated",
                description: `Equipment updated but ${errorMessage}`,
                variant: "destructive"
              })
            }
          } else {
            toast({ title: "Updated", description: "Equipment updated successfully" })
          }

          // Reload data from server to ensure UI reflects actual database state
          try {
            await fetchEquipment()
          } catch (fetchErr) {
            console.error('Failed to reload data after save:', fetchErr)
            // Don't throw - the save was successful, just the reload failed
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
          name: 'New Equipment',
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

          // Show QR Code dialog for new equipment
          if (created && created._id) {
            setCreatedEquipmentId(created._id)
          }

          // Reload data from server to ensure UI reflects actual database state
          try {
            await fetchEquipment()
          } catch (fetchErr) {
            console.error('Failed to reload data after create:', fetchErr)
            // Don't throw - the creation was successful, just the reload failed
          }
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
      } catch (err: any) {
        if (err.response && err.response.status === 404) {
          // Item already deleted on server, just keep the local removal
          toast({ title: "Deleted", description: "Equipment was already deleted" })
        } else {
          setEquipment(prev)
          throw err
        }
      }
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        // Already handled above, but just in case
        return
      }
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
    return 'Not assigned'
  }

  const filteredEquipment = equipment
  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)
  const rangeLabel = total > 0 ? `Showing ${start}-${end} of ${total}` : 'No equipment found'

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
            <div className="relative flex-1 md:min-w-[300px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search equipment..."
                className="pl-9 pr-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-10 w-10 text-slate-500 hover:text-slate-900"
                onClick={() => setIsScannerOpen(true)}
              >
                <QrCode className="h-4 w-4" />
              </Button>
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
        {filteredEquipment?.map((item) => (
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
        <DialogContent className="sm:max-w-[500px] bg-white max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Equipment' : 'Add Equipment'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 overflow-y-auto flex-1 pr-2">
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

                // Auto-suggest personnel when changing to Under Repair or In Workshop from Breakdown
                if ((value === EQUIPMENT_STATUSES.UNDER_REPAIR || value === EQUIPMENT_STATUSES.IN_WORKSHOP) && previousStatus === EQUIPMENT_STATUSES.BREAKDOWN && breakdownType) {
                  const selectedType = breakdownTypes.find(t => t.value === breakdownType)
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

            {/* Machinist Selection for Production */}
            {form.status === EQUIPMENT_STATUSES.IN_PRODUCTION && (
              <div className="grid gap-2 p-3 bg-green-50 rounded-md border border-green-200">
                <Label htmlFor="machinist" className="text-green-800">Assigned Machinist *</Label>
                <Select value={selectedMachinistId} onValueChange={setSelectedMachinistId}>
                  <SelectTrigger className="bg-white">
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

            {/* Maintenance Personnel Selection */}
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

            {/* Breakdown Info */}
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

            {/* QR Code Section - Only show when editing existing equipment */}
            {editingItem && (
              <div className="col-span-1 md:col-span-2 border-t pt-4 mt-2">
                <Label className="mb-2 block">Equipment QR Code</Label>
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <QRCodeGenerator value={editingItem._id} size={150} />
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    Scan this code to quickly access equipment details
                  </p>
                </div>
              </div>
            )}
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

      <QRCodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScan}
      />

      {/* Success Dialog with QR Code */}
      <Dialog open={!!createdEquipmentId} onOpenChange={(open) => !open && setCreatedEquipmentId(null)}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-center text-xl text-green-600 flex flex-col items-center gap-2">
              <CheckCircle className="h-8 w-8" />
              Equipment Created Successfully
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            <p className="text-center text-slate-600">
              Here is the QR Code for the new equipment. You can download or print it now.
            </p>
            {createdEquipmentId && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <QRCodeGenerator value={createdEquipmentId} size={200} />
              </div>
            )}
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setCreatedEquipmentId(null)}
              >
                Close
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  setCreatedEquipmentId(null)
                  // Optionally navigate to detail page
                  // navigate(`/equipment/${createdEquipmentId}`)
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Add/Edit Dialog
// Placed at end to keep JSX cleaner
export default function EquipmentPageWrapper() {
  return <Equipment />
}
