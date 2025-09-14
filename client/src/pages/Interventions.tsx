import { useEffect, useState } from "react"
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
import { getInterventions, createIntervention } from "@/api/interventions"
import { useToast } from "@/hooks/useToast"

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
  const [statusFilter, setStatusFilter] = useState("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newIntervention, setNewIntervention] = useState({
    title: "",
    type: "",
    priority: "",
    equipment: "",
    description: ""
  })
  const { toast } = useToast()

  useEffect(() => {
    const fetchInterventions = async () => {
      try {
        console.log('Fetching interventions data...')
        const response = await getInterventions()
        setInterventions((response as any).interventions)
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
  }, [toast])

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

  const handleCreateIntervention = async () => {
    try {
      console.log('Creating new intervention...')
      await createIntervention(newIntervention)
      toast({
        title: "Success",
        description: "Intervention created successfully",
      })
      setIsDialogOpen(false)
      setNewIntervention({ title: "", type: "", priority: "", equipment: "", description: "" })
      // Refresh the list
      const response = await getInterventions()
      setInterventions((response as any).interventions)
    } catch (error) {
      console.error('Error creating intervention:', error)
      toast({
        title: "Error",
        description: "Failed to create intervention",
        variant: "destructive",
      })
    }
  }

  const filteredInterventions = interventions.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.equipment.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.assignedTo.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || item.status === statusFilter
    return matchesSearch && matchesStatus
  })

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
                  <CardTitle className="text-lg">{intervention.title}</CardTitle>
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
                <Button variant="outline" size="sm">
                  View Details
                </Button>
                <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600">
                  Update Status
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
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