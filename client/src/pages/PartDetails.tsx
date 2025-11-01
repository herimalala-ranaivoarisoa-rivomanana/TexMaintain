import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, Package, Edit, Trash2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/useToast'
import { GlobalStockCard } from '@/components/GlobalStockCard'
import { PartEquipmentsList } from '@/components/PartEquipmentsList'
import api from '@/api/api'

interface Part {
  _id: string
  name: string
  partNumber: string
  category: string
  type: 'part' | 'consumable'
  currentStock: number
  minStock: number
  maxStock: number
  unitPrice: number
  supplier?: string
  location?: string
  pendingOrders: {
    quantity: number
    status: string
    orderDate: string
    expectedDate?: string
  }[]
  pendingQuantity: number
  createdAt: string
  updatedAt: string
}

export default function PartDetails() {
  const [searchParams] = useSearchParams()
  const partId = searchParams.get('id')
  const [part, setPart] = useState<Part | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (partId) {
      fetchPart()
    }
  }, [partId])

  const fetchPart = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/api/inventory/${partId}`)
      setPart(response.data.part)
    } catch (error: any) {
      console.error('Error fetching part:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger la pièce',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (!partId) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Aucune pièce sélectionnée
            </h3>
            <p className="text-slate-600 mb-4">
              Veuillez sélectionner une pièce depuis l'inventaire
            </p>
            <Link to="/inventory">
              <Button>
                Aller à l'inventaire
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <Link to="/inventory">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à l'inventaire
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-slate-500">Chargement...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!part) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Pièce introuvable
            </h3>
            <Link to="/inventory">
              <Button>
                Retour à l'inventaire
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/inventory">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{part.name}</h1>
            <p className="text-slate-600 mt-1">
              {part.partNumber} • {part.category}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Informations de base */}
      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-slate-500 mb-1">Type</p>
              <Badge variant={part.type === 'part' ? 'default' : 'secondary'}>
                {part.type === 'part' ? '🔧 Pièce' : '📦 Consommable'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Stock actuel</p>
              <p className="text-2xl font-bold text-slate-900">
                {part.currentStock}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Stock min / max</p>
              <p className="text-sm font-medium">
                {part.minStock} / {part.maxStock}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Prix unitaire</p>
              <p className="text-lg font-semibold text-green-600">
                {part.unitPrice.toFixed(2)} €
              </p>
            </div>
          </div>

          {(part.supplier || part.location) && (
            <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t">
              {part.supplier && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Fournisseur</p>
                  <p className="text-sm font-medium">{part.supplier}</p>
                </div>
              )}
              {part.location && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Emplacement</p>
                  <p className="text-sm font-medium">{part.location}</p>
                </div>
              )}
            </div>
          )}

          {part.pendingOrders.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold text-sm mb-3">
                📦 Commandes en cours ({part.pendingOrders.length})
              </h3>
              <div className="space-y-2">
                {part.pendingOrders.map((order, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{order.quantity} pièce(s)</p>
                      <p className="text-xs text-slate-600">
                        Commandé le {new Date(order.orderDate).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge>{order.status}</Badge>
                      {order.expectedDate && (
                        <p className="text-xs text-slate-600 mt-1">
                          Attendu le {new Date(order.expectedDate).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total en commande</span>
                  <span className="text-lg font-bold text-blue-600">
                    {part.pendingQuantity} pièce(s)
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Global */}
      <GlobalStockCard partId={partId} />

      {/* Équipements utilisant cette pièce */}
      <PartEquipmentsList partId={partId} />

      {/* Historique des mouvements */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Historique des mouvements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-slate-400 mb-3" />
            <p className="text-sm text-slate-600">
              Fonctionnalité à venir
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Historique des entrées, sorties et ajustements de stock
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Graphiques de consommation */}
      <Card>
        <CardHeader>
          <CardTitle>📈 Graphiques de consommation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-slate-400 mb-3" />
            <p className="text-sm text-slate-600">
              Fonctionnalité à venir
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Graphiques de consommation mensuelle, prévisions, tendances
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
