import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  ArrowLeft,
  Plus,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  MapPin,
  DollarSign,
  Calendar,
  Factory,
  Search
} from "lucide-react"
import api from "@/api/api"
import { useToast } from "@/hooks/useToast"
import { useAuth } from "@/contexts/AuthContext"

interface Equipment {
  _id: string
  category: { name: string }
  type: { name: string }
  model: string
  location: string
  productionLine?: { name: string }
  productionSection?: { name: string }
}

interface Part {
  _id: string
  name: string
  partNumber: string
  category: string
  currentStock: number
  minStock: number
  maxStock: number
  unitPrice: number
  supplier: string
  location: string
  pendingOrders?: any[]
  pendingQuantity?: number
}

interface EquipmentPart {
  _id: string
  equipment: string
  part: Part
  quantity: number
  isStandardPart: boolean
  lastReplacementDate?: string
  nextReplacementDate?: string
  replacementFrequency?: number
  notes?: string
}

export function EquipmentParts() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [equipmentParts, setEquipmentParts] = useState<EquipmentPart[]>([])
  const [allParts, setAllParts] = useState<Part[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddPartDialogOpen, setIsAddPartDialogOpen] = useState(false)
  const [selectedPart, setSelectedPart] = useState("")
  const [partQuantity, setPartQuantity] = useState(1)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return
      
      try {
        const [equipmentPartsResponse, allPartsResponse] = await Promise.all([
          api.get(`/api/equipment/${id}/parts`),
          api.get('/api/inventory')
        ])
        
        const data = equipmentPartsResponse.data
        setEquipment(data.equipment)
        setEquipmentParts(data.equipmentParts)
        setAllParts(allPartsResponse.data.parts)
      } catch (error) {
        console.error('Error fetching equipment parts:', error)
        toast({
          title: "Erreur",
          description: "Impossible de charger les pièces de l'équipement",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, toast])

  const getStockStatus = (part: Part) => {
    if (part.currentStock <= part.minStock) return 'critical'
    if (part.currentStock <= part.minStock * 1.5) return 'low'
    return 'normal'
  }

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-500'
      case 'low': return 'bg-yellow-500'
      case 'normal': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getStockStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />
      case 'low': return <TrendingDown className="h-4 w-4" />
      case 'normal': return <TrendingUp className="h-4 w-4" />
      default: return <Package className="h-4 w-4" />
    }
  }

  const handleAddPart = async () => {
    if (!selectedPart || !id) return
    
    try {
      setIsSaving(true)
      await api.post(`/api/equipment/${id}/parts`, {
        partId: selectedPart,
        quantity: partQuantity
      })
      
      toast({
        title: "Succès",
        description: "Pièce associée avec succès",
      })
      
      // Rafraîchir les données
      const response = await api.get(`/api/equipment/${id}/parts`)
      setEquipmentParts(response.data.equipmentParts)
      
      setIsAddPartDialogOpen(false)
      setSelectedPart("")
      setPartQuantity(1)
    } catch (error) {
      console.error('Error adding part to equipment:', error)
      toast({
        title: "Erreur",
        description: "Impossible d'associer la pièce",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const filteredParts = equipmentParts.filter(ep => 
    !searchTerm || 
    ep.part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ep.part.partNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const criticalPartsCount = equipmentParts.filter(ep => getStockStatus(ep.part) === 'critical').length
  const totalPendingOrders = equipmentParts.reduce((sum, ep) => sum + (ep.part.pendingQuantity || 0), 0)

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
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Pièces de Rechange
            </h1>
            {equipment && (
              <p className="text-muted-foreground">
                {equipment.category.name} - {equipment.type.name} ({equipment.model})
              </p>
            )}
          </div>
        </div>
        {(user?.role === 'admin' || user?.role === 'maintenance_manager') && (
          <Button onClick={() => setIsAddPartDialogOpen(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600">
            <Plus className="mr-2 h-4 w-4" />
            Associer Pièce
          </Button>
        )}
      </div>

      {/* Info Équipement */}
      {equipment && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-blue-600 font-medium">Modèle</p>
                <p className="text-blue-900">{equipment.model}</p>
              </div>
              <div>
                <p className="text-blue-600 font-medium">Location</p>
                <p className="text-blue-900">{equipment.location}</p>
              </div>
              <div>
                <p className="text-blue-600 font-medium">Ligne</p>
                <p className="text-blue-900">{equipment.productionLine?.name || 'Non assigné'}</p>
              </div>
              <div>
                <p className="text-blue-600 font-medium">Section</p>
                <p className="text-blue-900">{equipment.productionSection?.name || 'Non assigné'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistiques des stocks */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Pièces</p>
                <p className="text-2xl font-bold">{equipmentParts.length}</p>
              </div>
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Stock Critique</p>
                <p className="text-2xl font-bold text-red-600">{criticalPartsCount}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">En Commande</p>
                <p className="text-2xl font-bold text-blue-600">{totalPendingOrders}</p>
              </div>
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Valeur Stock</p>
                <p className="text-2xl font-bold text-green-600">
                  ${equipmentParts.reduce((sum, ep) => sum + (ep.part.currentStock * ep.part.unitPrice), 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recherche */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher des pièces..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Liste des pièces */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredParts.map((equipmentPart) => {
          const part = equipmentPart.part
          const status = getStockStatus(part)
          const isLowStock = status === 'critical' || status === 'low'
          
          return (
            <Card key={equipmentPart._id} className={`bg-white/60 backdrop-blur-sm hover:shadow-lg transition-all duration-200 ${isLowStock ? 'border-red-200' : 'border-slate-200/60'}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{part.name}</CardTitle>
                  <Badge className={`${getStockStatusColor(status)} text-white flex items-center gap-1`}>
                    {getStockStatusIcon(status)}
                    {status === 'critical' ? 'Critique' : status === 'low' ? 'Faible' : 'OK'}
                  </Badge>
                </div>
                <CardDescription className="flex items-center">
                  <Package className="mr-1 h-3 w-3" />
                  {part.partNumber}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Catégorie:</span>
                  <Badge variant="outline">{part.category}</Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <p className="text-slate-500">Stock</p>
                    <p className={`font-bold text-lg ${isLowStock ? 'text-red-600' : 'text-slate-900'}`}>
                      {part.currentStock}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-500">Min</p>
                    <p className="font-semibold text-slate-700">{part.minStock}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-500">En Commande</p>
                    <p className="font-semibold text-blue-600">{part.pendingQuantity || 0}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 flex items-center">
                      <DollarSign className="mr-1 h-3 w-3" />
                      Prix Unitaire:
                    </span>
                    <span className="font-semibold text-slate-900">${part.unitPrice}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 flex items-center">
                      <MapPin className="mr-1 h-3 w-3" />
                      Emplacement:
                    </span>
                    <span className="text-slate-900">{part.location}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 flex items-center">
                      <Factory className="mr-1 h-3 w-3" />
                      Fournisseur:
                    </span>
                    <span className="text-slate-900">{part.supplier}</span>
                  </div>
                </div>

                {equipmentPart.quantity > 1 && (
                  <div className="bg-blue-50 p-2 rounded text-sm">
                    <span className="text-blue-700 font-medium">
                      Quantité nécessaire: {equipmentPart.quantity}
                    </span>
                  </div>
                )}

                {equipmentPart.lastReplacementDate && (
                  <div className="bg-slate-50 p-2 rounded text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Dernier Remplacement:</span>
                      <span className="font-medium">
                        {new Date(equipmentPart.lastReplacementDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                {equipmentPart.replacementFrequency && (
                  <div className="bg-yellow-50 p-2 rounded text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-700">Fréquence de Remplacement:</span>
                      <span className="font-medium">
                        Toutes les {equipmentPart.replacementFrequency}h
                      </span>
                    </div>
                  </div>
                )}

                {part.pendingOrders && part.pendingOrders.length > 0 && (
                  <div className="bg-blue-50 p-2 rounded">
                    <p className="text-sm text-blue-700 font-medium mb-1">Commandes en cours:</p>
                    {part.pendingOrders.map((order: any, index: number) => (
                      <div key={index} className="text-xs text-blue-600">
                        • {order.quantity} unités - {order.status}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <ShoppingCart className="mr-1 h-3 w-3" />
                    Commander
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Calendar className="mr-1 h-3 w-3" />
                    Historique
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Message si aucune pièce */}
      {filteredParts.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {equipmentParts.length === 0 ? 'Aucune pièce associée' : 'Aucune pièce trouvée'}
            </h3>
            <p className="text-slate-600">
              {equipmentParts.length === 0 
                ? 'Aucune pièce de rechange n\'est encore associée à cet équipement.'
                : 'Essayez d\'ajuster vos critères de recherche.'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog Ajouter Pièce */}
      <Dialog open={isAddPartDialogOpen} onOpenChange={setIsAddPartDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle>Associer une Pièce</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="part">Pièce</Label>
              <Select value={selectedPart} onValueChange={setSelectedPart}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une pièce" />
                </SelectTrigger>
                <SelectContent>
                  {allParts
                    .filter(part => !equipmentParts.some(ep => ep.part._id === part._id))
                    .map((part) => (
                    <SelectItem key={part._id} value={part._id}>
                      {part.name} ({part.partNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantité nécessaire</Label>
              <Input 
                id="quantity" 
                type="number" 
                min="1"
                value={partQuantity} 
                onChange={(e) => setPartQuantity(parseInt(e.target.value) || 1)} 
                placeholder="Quantité" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddPartDialogOpen(false)} disabled={isSaving}>
              Annuler
            </Button>
            <Button 
              onClick={handleAddPart} 
              className="bg-gradient-to-r from-blue-600 to-indigo-600" 
              disabled={isSaving || !selectedPart}
            >
              {isSaving ? 'Ajout...' : 'Associer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}