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
import { 
  Search, 
  Filter, 
  Plus, 
  Wrench, 
  AlertTriangle, 
  Clock,
  User,
  Calendar,
  CheckCircle
} from "lucide-react"
import { Link } from "react-router-dom"
import { getInterventions, createIntervention, updateIntervention, deleteIntervention } from "@/api/interventions"
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
  assignedTo: string
  createdDate: string
  dueDate: string
}

export function Interventions() {
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchParams, setSearchParams] = useSearchParams()
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || "all")
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
    description: ""
  })
  const { toast } = useToast()
  const { user } = useAuth()
  const [creating, setCreating] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchInterventions = async () => {
      try {
        console.log('Fetching interventions data...')
        const params: any = { page, limit, sort, order }
        if (statusFilter !== 'all') params.status = statusFilter
        if (searchTerm) params.q = searchTerm
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

    fetchInterventions()
  }, [toast, page, statusFilter, limit, sort, order])

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
    try {
      console.log('Creating new intervention...')
      setCreating(true)
      const tempId = `temp-${Date.now()}`
      const temp = { _id: tempId, status: 'Pending', createdDate: new Date().toISOString(), dueDate: new Date().toISOString(), assignedTo: '', ...newIntervention }
      setInterventions([temp as any, ...interventions])
      try {
        const res = await createIntervention(newIntervention)
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
      setNewIntervention({ title: "", type: "", priority: "", equipment: "", description: "" })
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
                  onChange={(e) => setNewIntervention({...newIntervention, title: e.target.value})}
                  placeholder="Enter intervention title"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select value={newIntervention.type} onValueChange={(value) => setNewIntervention({...newIntervention, type: value})}>
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
                <Select value={newIntervention.priority} onValueChange={(value) => setNewIntervention({...newIntervention, priority: value})}>
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
                <Input
                  id="equipment"
                  value={newIntervention.equipment}
                  onChange={(e) => setNewIntervention({...newIntervention, equipment: e.target.value})}
                  placeholder="Enter equipment name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newIntervention.description}
                  onChange={(e) => setNewIntervention({...newIntervention, description: e.target.value})}
                  placeholder="Enter intervention description"
                />
              </div>
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
                <div className="space-y-1">
                  <CardTitle className="text-lg"><Link className="hover:underline" to={`/interventions/${intervention._id}`}>{intervention.title}</Link></CardTitle>
                  <CardDescription className="flex items-center gap-4">
                    <span className="flex items-center">
                      <Wrench className="mr-1 h-3 w-3" />
                      {intervention.type}
                    </span>
                    <span className="flex items-center">
                      <User className="mr-1 h-3 w-3" />
                      {intervention.assignedTo}
                    </span>
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
                  <p className="font-medium text-slate-900 flex items-center">
                    <Calendar className="mr-1 h-3 w-3" />
                    {new Date(intervention.dueDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(intervention._id, 'In Progress')} disabled={updatingId === intervention._id}>{updatingId === intervention._id ? 'Updating...' : 'Start'}</Button>
                <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(intervention._id, 'Completed')} disabled={updatingId === intervention._id}>{updatingId === intervention._id ? 'Updating...' : 'Complete'}</Button>
                {(user?.role === 'admin' || user?.role === 'maintenance_manager') && (
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteIntervention(intervention._id)} disabled={deletingId === intervention._id}>{deletingId === intervention._id ? 'Deleting...' : 'Delete'}</Button>
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