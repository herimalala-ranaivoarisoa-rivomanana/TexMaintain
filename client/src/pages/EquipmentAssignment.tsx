import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { 
  ArrowLeft,
  Factory,
  Settings,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Workflow
} from "lucide-react"
import api from "@/api/api"
import { assignEquipmentToSection } from "@/api/equipment"
import { getProductionSections } from "@/api/productionSections"
import { useToast } from "@/hooks/useToast"
import { useAuth } from "@/contexts/AuthContext"

interface Equipment {
  _id: string
  category: { name: string }
  type: { name: string }
  model: string
  location: string
  status: string
  productionLine?: { _id: string; name: string }
  productionSection?: { _id: string; name: string }
  assignmentHistory?: Array<{
    section: { name: string }
    line: { name: string }
    assignedAt: string
    unassignedAt?: string
  }>
}

interface ProductionSection {
  _id: string
  name: string
  productionLine: { _id: string; name: string }
}

export function EquipmentAssignment() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [productionSections, setProductionSections] = useState<ProductionSection[]>([])
  const [loading, setLoading] = useState(true)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedSection, setSelectedSection] = useState("")
  const [isAssigning, setIsAssigning] = useState(false)
  const [sectionOccupancy, setSectionOccupancy] = useState<Record<string, any>>({})

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return

      try {
        const [equipmentResponse, sectionsResponse] = await Promise.all([
          api.get(`/api/equipment/${id}`),
          getProductionSections()
        ])

        setEquipment(equipmentResponse.data.equipment)
        setProductionSections(sectionsResponse.sections)

        // Récupérer l'occupation des sections
        const occupancy: Record<string, any> = {}
        const equipmentResponseAll = await api.get('/api/equipment', {
          params: { limit: 1000 } // Récupérer tous les équipements pour voir l'occupation
        })

        equipmentResponseAll.data.equipment.forEach((eq: any) => {
          if (eq.productionSection) {
            occupancy[eq.productionSection._id] = {
              equipmentId: eq._id,
              model: eq.model,
              location: eq.location,
              category: eq.category?.name,
              type: eq.type?.name
            }
          }
        })

        setSectionOccupancy(occupancy)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: "Erreur",
          description: "Impossible de charger les données",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, toast])

  const handleAssignToSection = async () => {
    if (!selectedSection || !id) return

    try {
      setIsAssigning(true)
      await assignEquipmentToSection(id, selectedSection)

      // Rafraîchir les données de l'équipement
      const response = await api.get(`/api/equipment/${id}`)
      setEquipment(response.data.equipment)

      toast({
        title: "Succès",
        description: "Équipement assigné avec succès à la section",
      })

      setIsAssignDialogOpen(false)
      setSelectedSection("")
    } catch (error: any) {
      console.error('Error assigning equipment:', error)

      // Gestion spécifique des erreurs de validation
      if (error.response?.status === 400 && error.response?.data?.existingEquipment) {
        const existing = error.response.data.existingEquipment
        toast({
          title: "Section occupée",
          description: `Cette section contient déjà l'équipement "${existing.model}" (${existing.location})`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Erreur",
          description: error.response?.data?.message || "Impossible d'assigner l'équipement",
          variant: "destructive",
        })
      }
    } finally {
      setIsAssigning(false)
    }
  }

  const handleUnassign = async () => {
    if (!id) return
    
    try {
      setIsAssigning(true)
      await assignEquipmentToSection(id, "")
      
      // Rafraîchir les données de l'équipement
      const response = await api.get(`/api/equipment/${id}`)
      setEquipment(response.data.equipment)
      
      toast({
        title: "Succès",
        description: "Équipement retiré de la section",
      })
    } catch (error) {
      console.error('Error unassigning equipment:', error)
      toast({
        title: "Erreur",
        description: "Impossible de retirer l'équipement",
        variant: "destructive",
      })
    } finally {
      setIsAssigning(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'offline': return 'bg-gray-500'
      case 'maintenance': return 'bg-yellow-500'
      case 'breakdown': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="h-4 w-4" />
      case 'offline': return <Settings className="h-4 w-4" />
      case 'maintenance': return <Settings className="h-4 w-4" />
      case 'breakdown': return <AlertTriangle className="h-4 w-4" />
      default: return <Settings className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!equipment) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Équipement non trouvé</h3>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Assignation d'Équipement
            </h1>
            <p className="text-muted-foreground">
              {equipment.category.name} - {equipment.type.name} ({equipment.model})
            </p>
          </div>
        </div>
        {(user?.role === 'admin' || user?.role === 'maintenance_manager') && (
          <div className="flex gap-2">
            <Button 
              onClick={() => setIsAssignDialogOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              <Workflow className="mr-2 h-4 w-4" />
              Assigner à Section
            </Button>
            {equipment.productionSection && (
              <Button 
                variant="outline"
                onClick={handleUnassign}
                disabled={isAssigning}
              >
                <Settings className="mr-2 h-4 w-4" />
                {isAssigning ? 'Retrait...' : 'Retirer de Section'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* État Actuel */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Factory className="mr-2 h-5 w-5 text-blue-600" />
            État Actuel de l'Équipement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-blue-600 font-medium">Statut</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${getStatusColor(equipment.status)} text-white flex items-center gap-1`}>
                  {getStatusIcon(equipment.status)}
                  {equipment.status}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Ligne de Production</p>
              <p className="text-blue-900 mt-1">
                {equipment.productionLine?.name || <span className="text-slate-400">Non assigné</span>}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Section</p>
              <p className="text-blue-900 mt-1">
                {equipment.productionSection?.name || <span className="text-slate-400">Non assigné</span>}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Emplacement</p>
              <p className="text-blue-900 mt-1 flex items-center">
                <MapPin className="mr-1 h-3 w-3" />
                {equipment.location}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Règles d'Assignation */}
      <Card>
        <CardHeader>
          <CardTitle>Règles d'Assignation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Un équipement devient <strong>online</strong> quand il est assigné à une section</span>
            </div>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-gray-600" />
              <span>Un équipement devient <strong>offline</strong> quand il est retiré d'une section</span>
            </div>
            <div className="flex items-center gap-2">
              <Factory className="h-4 w-4 text-blue-600" />
              <span>La ligne de production est automatiquement calculée depuis la section</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historique d'Assignation */}
      {equipment.assignmentHistory && equipment.assignmentHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historique d'Assignation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {equipment.assignmentHistory.map((assignment, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {assignment.line.name} → {assignment.section.name}
                    </p>
                    <p className="text-sm text-slate-600">
                      Assigné le {new Date(assignment.assignedAt).toLocaleString()}
                    </p>
                  </div>
                  {assignment.unassignedAt && (
                    <div className="text-right">
                      <p className="text-sm text-slate-600">
                        Retiré le {new Date(assignment.unassignedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sections Disponibles */}
      <Card>
        <CardHeader>
          <CardTitle>Sections de Production Disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productionSections.map((section) => {
              const isOccupied = sectionOccupancy[section._id]
              const isCurrentEquipment = equipment.productionSection?._id === section._id

              return (
                <Card
                  key={section._id}
                  className={`border-slate-200 hover:shadow-md transition-colors ${
                    isOccupied ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h3 className="font-semibold">{section.name}</h3>
                      <p className="text-sm text-slate-600">
                        Ligne: {section.productionLine.name}
                      </p>

                      {isCurrentEquipment && (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Assigné ici
                        </Badge>
                      )}

                      {isOccupied && !isCurrentEquipment && (
                        <div className="bg-red-100 p-2 rounded text-xs">
                          <p className="text-red-700 font-medium">Occupé par:</p>
                          <p className="text-red-600">
                            {isOccupied.category} - {isOccupied.type}
                          </p>
                          <p className="text-red-600 text-xs">
                            {isOccupied.model} ({isOccupied.location})
                          </p>
                        </div>
                      )}

                      {!isOccupied && !isCurrentEquipment && (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                          Disponible
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dialog d'Assignation */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle>Assigner à une Section</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="section">Section de Production</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une section" />
                </SelectTrigger>
                <SelectContent>
                  {productionSections.map((section) => (
                    <SelectItem key={section._id} value={section._id}>
                      {section.productionLine.name} → {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedSection && (
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> L'équipement passera automatiquement au statut "online" 
                  une fois assigné à cette section.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)} disabled={isAssigning}>
              Annuler
            </Button>
            <Button 
              onClick={handleAssignToSection}
              className="bg-gradient-to-r from-blue-600 to-indigo-600" 
              disabled={isAssigning || !selectedSection}
            >
              {isAssigning ? 'Assignation...' : 'Assigner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}