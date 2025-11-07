import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  Search,
  Filter,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Calendar,
  Activity
} from "lucide-react"
import api from "@/api/api"
import { useToast } from "@/hooks/useToast"

interface Equipment {
  _id: string
  category: { name: string }
  type: { name: string }
  model?: string
  manufacturer?: string
  serialNumber?: string
  location: string
  brand?: { name: string }
}

interface Intervention {
  _id: string
  title: string
  type: string
  priority: string
  status: string
  equipment: string
  assignedTo: string
  description: string
  createdDate: string
  dueDate: string
}

export function EquipmentInterventions() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return
      
      try {
        const params: any = { page, limit }
        if (typeFilter !== 'all') params.type = typeFilter
        if (statusFilter !== 'all') params.status = statusFilter
        if (searchTerm) params.q = searchTerm
        
        const response = await api.get(`/api/equipment/${id}/interventions`, { params })
        const data = response.data
        
        setEquipment(data.equipment)
        setInterventions(data.interventions)
        setTotal(data.total)
      } catch (error) {
        console.error('Error fetching equipment interventions:', error)
        toast({
          title: "Erreur",
          description: "Impossible de charger l'historique des interventions",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, page, typeFilter, statusFilter, searchTerm, toast])

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
      case 'Cancelled': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle className="h-4 w-4" />
      case 'In Progress': return <Wrench className="h-4 w-4" />
      case 'Pending': return <Clock className="h-4 w-4" />
      case 'Cancelled': return <AlertTriangle className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Preventive': return <Calendar className="h-4 w-4" />
      case 'Corrective': return <Wrench className="h-4 w-4" />
      case 'Emergency': return <AlertTriangle className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Historique Maintenance
          </h1>
          {equipment && (
            <p className="text-muted-foreground">
              {equipment.location} - {equipment.category.name} - {equipment.type.name}
            </p>
          )}
        </div>
      </div>

      {/* Info Équipement */}
      {equipment && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-blue-600 font-medium">Location</p>
                <p className="text-blue-900 font-semibold">{equipment.location}</p>
              </div>
              <div>
                <p className="text-blue-600 font-medium">Catégorie</p>
                <p className="text-blue-900">{equipment.category.name}</p>
              </div>
              <div>
                <p className="text-blue-600 font-medium">Type</p>
                <p className="text-blue-900">{equipment.type.name}</p>
              </div>
              {equipment.brand && (
                <div>
                  <p className="text-blue-600 font-medium">Marque</p>
                  <p className="text-blue-900">{equipment.brand.name}</p>
                </div>
              )}
              {equipment.manufacturer && (
                <div>
                  <p className="text-blue-600 font-medium">Fabricant</p>
                  <p className="text-blue-900">{equipment.manufacturer}</p>
                </div>
              )}
              {equipment.model && (
                <div>
                  <p className="text-blue-600 font-medium">Modèle</p>
                  <p className="text-blue-900">{equipment.model}</p>
                </div>
              )}
              {equipment.serialNumber && (
                <div>
                  <p className="text-blue-600 font-medium">N° Série</p>
                  <p className="text-blue-900">{equipment.serialNumber}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Interventions</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
              <Wrench className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Terminées</p>
                <p className="text-2xl font-bold text-green-600">
                  {interventions.filter(i => i.status === 'Completed').length}
                </p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">En Cours</p>
                <p className="text-2xl font-bold text-blue-600">
                  {interventions.filter(i => i.status === 'In Progress').length}
                </p>
              </div>
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Urgences</p>
                <p className="text-2xl font-bold text-red-600">
                  {interventions.filter(i => i.type === 'Emergency').length}
                </p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher dans les interventions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous Types</SelectItem>
                <SelectItem value="Preventive">Préventive</SelectItem>
                <SelectItem value="Corrective">Corrective</SelectItem>
                <SelectItem value="Emergency">Urgence</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous Statuts</SelectItem>
                <SelectItem value="Pending">En Attente</SelectItem>
                <SelectItem value="In Progress">En Cours</SelectItem>
                <SelectItem value="Completed">Terminé</SelectItem>
                <SelectItem value="Cancelled">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Timeline des interventions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5 text-blue-600" />
            Timeline des Interventions
          </CardTitle>
          <CardDescription>
            Historique chronologique de toutes les interventions sur cet équipement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {interventions.map((intervention) => (
              <div key={intervention._id} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  {getTypeIcon(intervention.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{intervention.title}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="flex items-center text-sm text-slate-600">
                          <Wrench className="mr-1 h-3 w-3" />
                          {intervention.type}
                        </span>
                        <span className="flex items-center text-sm text-slate-600">
                          <User className="mr-1 h-3 w-3" />
                          {intervention.assignedTo || 'Non assigné'}
                        </span>
                        <span className="flex items-center text-sm text-slate-600">
                          <Calendar className="mr-1 h-3 w-3" />
                          {new Date(intervention.createdDate).toLocaleDateString()}
                        </span>
                      </div>
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
                  {intervention.description && (
                    <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded">
                      {intervention.description}
                    </p>
                  )}
                  {intervention.dueDate && (
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <span className="text-slate-500">Échéance:</span>
                      <span className="font-medium">
                        {new Date(intervention.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {interventions.length === 0 && (
            <div className="text-center py-12">
              <Wrench className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Aucune intervention trouvée</h3>
              <p className="text-slate-600">Aucune intervention n'a été enregistrée pour cet équipement.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-center gap-4">
          <span className="text-sm text-muted-foreground">
            {((page - 1) * limit + 1)}-{Math.min(page * limit, total)} sur {total}
          </span>
          <Button 
            variant="outline" 
            disabled={page <= 1} 
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Précédent
          </Button>
          <span className="text-sm">Page {page}</span>
          <Button 
            variant="outline" 
            disabled={page * limit >= total} 
            onClick={() => setPage(p => p + 1)}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  )
}