import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  Trash
} from "lucide-react"
import { Link } from "react-router-dom"
import { getEquipment, createEquipment, updateEquipment, deleteEquipment } from "@/api/equipment"
import { useToast } from "@/hooks/useToast"
import { useAuth } from "@/contexts/AuthContext"
import { saveAs } from "file-saver"

interface Equipment {
  _id: string
  name: string
  type: string
  status: string
  location: string
  lastMaintenance: string
  nextMaintenance: string
  mtbf: number
  mttr: number
}

export function Equipment() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
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
    name: "",
    type: "spinning",
    status: "operational",
    location: ""
  })
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { user } = useAuth()

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

  const refreshList = async () => {
    const response = await getEquipment()
    setEquipment((response as any).equipment)
  }

  const openAddDialog = () => {
    setEditingItem(null)
    setForm({ name: "", type: "spinning", status: "operational", location: "" })
    setIsDialogOpen(true)
  }

  const openEditDialog = (item: Equipment) => {
    setEditingItem(item)
    setForm({ name: item.name, type: item.type, status: item.status, location: item.location })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      if (editingItem) {
        const prev = equipment
        const optimistic = equipment.map((e) => e._id === editingItem._id ? { ...e, ...form } as Equipment : e)
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
        const tempItem: Equipment = { _id: tempId, mtbf: 0, mttr: 0, lastMaintenance: new Date().toISOString(), nextMaintenance: new Date().toISOString(), ...form }
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
      case 'operational': return 'bg-green-500'
      case 'maintenance': return 'bg-yellow-500'
      case 'breakdown': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <CheckCircle className="h-4 w-4" />
      case 'maintenance': return <Clock className="h-4 w-4" />
      case 'breakdown': return <AlertTriangle className="h-4 w-4" />
      default: return <Settings className="h-4 w-4" />
    }
  }

  const exportCSV = () => {
    const headers = ['Name','Type','Status','Location','MTBF','MTTR','LastMaintenance','NextMaintenance']
    const rows = equipment.map(e => [
      e.name,
      e.type,
      e.status,
      e.location,
      String(e.mtbf ?? ''),
      String(e.mttr ?? ''),
      e.lastMaintenance ? new Date(e.lastMaintenance).toISOString() : '',
      e.nextMaintenance ? new Date(e.nextMaintenance).toISOString() : ''
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, `equipment_export_page${page}.csv`)
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
        <Button variant="outline" onClick={exportCSV}>Export CSV</Button>
        {user?.role === 'admin' && (
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
                <SelectItem value="operational">Operational</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="breakdown">Breakdown</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => { setPage(1); setSort(v) }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Created</SelectItem>
                <SelectItem value="updatedAt">Updated</SelectItem>
                <SelectItem value="name">Name</SelectItem>
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
                <CardTitle className="text-lg"><Link className="hover:underline" to={`/equipment/${item._id}`}>{item.name}</Link></CardTitle>
                <Badge className={`${getStatusColor(item.status)} text-white flex items-center gap-1`}>
                  {getStatusIcon(item.status)}
                  {item.status}
                </Badge>
              </div>
              <CardDescription className="flex items-center text-slate-600">
                <Settings className="mr-1 h-3 w-3" />
                {item.type}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center text-sm text-slate-600">
                <MapPin className="mr-2 h-4 w-4" />
                {item.location}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">MTBF</p>
                  <p className="font-semibold text-slate-900">{item.mtbf}h</p>
                </div>
                <div>
                  <p className="text-slate-500">MTTR</p>
                  <p className="font-semibold text-slate-900">{item.mttr}h</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Last Maintenance:</span>
                  <span className="text-slate-900">{new Date(item.lastMaintenance).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Next Maintenance:</span>
                  <span className="text-slate-900 flex items-center">
                    <Calendar className="mr-1 h-3 w-3" />
                    {new Date(item.nextMaintenance).toLocaleDateString()}
                  </span>
                </div>
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
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spinning">Spinning</SelectItem>
                  <SelectItem value="weaving">Weaving</SelectItem>
                  <SelectItem value="dyeing">Dyeing</SelectItem>
                  <SelectItem value="finishing">Finishing</SelectItem>
                  <SelectItem value="cutting">Cutting</SelectItem>
                  <SelectItem value="sewing">Sewing</SelectItem>
                  <SelectItem value="packaging">Packaging</SelectItem>
                  <SelectItem value="quality_control">Quality Control</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
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
                  <SelectItem value="operational">Operational</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="breakdown">Breakdown</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Enter location" />
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
