import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
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
  Factory
} from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { getEquipment, createEquipment, updateEquipment, deleteEquipment } from "@/api/equipment"
import { getBrands } from "@/api/brands"
import api from "@/api/api"
import { useToast } from "@/hooks/useToast"
import { useAuth } from "@/contexts/AuthContext"

interface Equipment {
  _id: string
  category: Category
  type: EquipmentType
  status: string
  location: string
  model: string
  serialNumber?: string
  chipNumber?: string
  brand?: string
  lastMaintenance: string
  nextMaintenance: string
  mtbf: number
  mttr: number
  productionSection?: {
    _id: string
    name: string
  }
  productionLine?: {
    _id: string
    name: string
  }
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
  const [form, setForm] = useState({
    category: "",
    type: "",
    status: "offline",
    location: "",
    model: "",
    serialNumber: "",
    chipNumber: "",
    brand: ""
  })
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  // Fetch categories, types, and brands on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesResponse, typesResponse, brandsResponse] = await Promise.all([
          api.get('/api/equipment-categories'),
          api.get('/api/equipment-types'),
          getBrands()
        ])
        setCategories((categoriesResponse.data as any).categories || [])
        setTypes((typesResponse.data as any).types || [])
        setBrands(brandsResponse.brands || [])
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
  }, [toast])

  useEffect(() => {
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

    fetchEquipment()
  }, [toast, page, statusFilter, limit, sort, order])

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


  const openAddDialog = () => {
    setEditingItem(null)
    setForm({ category: "", type: "", status: "offline", location: "", model: "", serialNumber: "", chipNumber: "", brand: "" })
    setIsDialogOpen(true)
  }

  const openEditDialog = (item: Equipment) => {
    setEditingItem(item)
    setForm({
      category: item.category._id,
      type: item.type._id,
      status: item.status,
      location: item.location,
      model: item.model || "",
      serialNumber: item.serialNumber || "",
      chipNumber: item.chipNumber || "",
      brand: item.brand || ""
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
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
          category: categories.find(c => c._id === form.category) || e.category,
          type: types.find(t => t._id === form.type) || e.type
        } as Equipment : e)
        setEquipment(optimistic)
        try {
          await updateEquipment(editingItem._id, form)
          toast({ title: "Updated", description: "Equipment updated successfully" })
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
          mtbf: 0,
          mttr: 0,
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-blue-500'
      case 'maintenance': return 'bg-yellow-500'
      case 'breakdown': return 'bg-red-500'
      case 'offline': return 'bg-gray-500'
      case 'scrapped': return 'bg-red-900'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="h-4 w-4" />
      case 'maintenance': return <Clock className="h-4 w-4" />
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
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="breakdown">Breakdown</SelectItem>
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
                <Badge className={`${getStatusColor(item.status)} text-white flex items-center gap-1`}>
                  {getStatusIcon(item.status)}
                  {item.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Modèle</p>
                  <p className="text-slate-900 font-medium">{item.model}</p>
                </div>
                <div>
                  <p className="text-slate-500">Location</p>
                  <p className="text-slate-900 flex items-center">
                    <MapPin className="mr-1 h-3 w-3" />
                    {item.location}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Brand</p>
                  <p className="text-slate-900">{item.brand || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Serial Number</p>
                  <p className="text-slate-900">{item.serialNumber || '-'}</p>
                </div>
              </div>

              {/* Info Ligne/Section de Production */}
              <div className="border-t pt-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Ligne de Production</p>
                    <p className="text-slate-900 flex items-center">
                      <Factory className="mr-1 h-3 w-3" />
                      {item.productionLine?.name || <span className="text-slate-400">Non assigné</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Section</p>
                    <p className="text-slate-900">
                      {item.productionSection?.name || <span className="text-slate-400">Non assigné</span>}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Chip Number</p>
                  <p className="text-slate-900">{item.chipNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500">MTBF</p>
                  <p className="font-semibold text-slate-900">{item.mtbf}h</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">MTTR</p>
                  <p className="font-semibold text-slate-900">{item.mttr}h</p>
                </div>
                <div>
                  <p className="text-slate-500">Last Maintenance</p>
                  <p className="text-slate-900">{formatDate(item.lastMaintenance)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Next Maintenance:</span>
                <span className="text-slate-900 flex items-center">
                  <Calendar className="mr-1 h-3 w-3" />
                  {formatDate(item.nextMaintenance)}
                </span>
              </div>

              {/* Nouveaux boutons */}
              <div className="grid grid-cols-2 gap-2 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/equipment/${item._id}/interventions`)}
                  className="text-xs"
                >
                  <History className="mr-1 h-3 w-3" />
                  Historique
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/equipment/${item._id}/parts`)}
                  className="text-xs"
                >
                  <Package className="mr-1 h-3 w-3" />
                  Pièces
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-1 pt-2">
                {(user?.role === 'admin' || user?.role === 'maintenance_manager' || user?.role === 'assistant_maintenance_manager' || user?.role === 'foreman') && (
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(item)} disabled={deletingId === item._id}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
                {user?.role === 'admin' && (
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(item._id)} disabled={deletingId === item._id}>
                    <Trash className="h-3 w-3" />
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
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="breakdown">Breakdown</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="scrapped">Scrapped</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Enter location" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="model">Model *</Label>
              <Input id="model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Enter model" required />
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
                    <SelectItem key={brand._id} value={brand.name}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
