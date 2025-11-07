import { useState, useEffect } from 'react'
import { Package, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, Truck, ShoppingCart, Calculator } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/useToast'
import { getStockStatus, calculateMinMax, updateOrderStatus, type StockStatus, type PendingOrder } from '@/api/inventory'
import { CreateOrderDialog } from './CreateOrderDialog'

interface StockStatusCardProps {
  partId: string
  partName: string
  defaultSupplier?: string
  onUpdate?: () => void
}

const statusColors = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  low: 'bg-orange-100 text-orange-800 border-orange-300',
  normal: 'bg-green-100 text-green-800 border-green-300',
  high: 'bg-blue-100 text-blue-800 border-blue-300'
}

const orderStatusLabels = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-800', icon: <Clock className="h-3 w-3" /> },
  ordered: { label: 'Ordered', color: 'bg-blue-100 text-blue-800', icon: <ShoppingCart className="h-3 w-3" /> },
  in_transit: { label: 'In transit', color: 'bg-purple-100 text-purple-800', icon: <Truck className="h-3 w-3" /> },
  received: { label: 'Received', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: <AlertTriangle className="h-3 w-3" /> }
}

export function StockStatusCard({ partId, partName, defaultSupplier, onUpdate }: StockStatusCardProps) {
  const [loading, setLoading] = useState(true)
  const [stockStatus, setStockStatus] = useState<StockStatus | null>(null)
  const [currentStock, setCurrentStock] = useState(0)
  const [minStock, setMinStock] = useState(0)
  const [maxStock, setMaxStock] = useState(0)
  const [pendingQuantity, setPendingQuantity] = useState(0)
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([])
  const [associatedEquipmentCount, setAssociatedEquipmentCount] = useState(0)
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false)
  const [calculatingMinMax, setCalculatingMinMax] = useState(false)
  const { toast } = useToast()

  const fetchStockStatus = async () => {
    try {
      setLoading(true)
      const response = await getStockStatus(partId)
      setStockStatus(response.stockStatus)
      setCurrentStock(response.currentStock)
      setMinStock(response.minStock)
      setMaxStock(response.maxStock)
      setPendingQuantity(response.pendingQuantity)
      setPendingOrders(response.pendingOrders || [])
      setAssociatedEquipmentCount(response.associatedEquipmentCount || 0)
    } catch (error: any) {
      console.error('Error fetching stock status:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger le statut du stock',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStockStatus()
  }, [partId])

  const handleCalculateMinMax = async () => {
    try {
      setCalculatingMinMax(true)
      const response = await calculateMinMax(partId)
      
      if (response.calculated) {
        toast({
          title: 'Calcul effectué',
          description: `Min: ${response.minStock}, Max: ${response.maxStock}`
        })
        fetchStockStatus()
        onUpdate?.()
      } else {
        toast({
          title: 'Information',
          description: response.message,
          variant: 'default'
        })
      }
    } catch (error: any) {
      console.error('Error calculating min/max:', error)
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Impossible de calculer min/max',
        variant: 'destructive'
      })
    } finally {
      setCalculatingMinMax(false)
    }
  }

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateOrderStatus(partId, orderId, newStatus)
      toast({
        title: 'Statut mis à jour',
        description: `Commande mise à jour: ${orderStatusLabels[newStatus as keyof typeof orderStatusLabels].label}`
      })
      fetchStockStatus()
      onUpdate?.()
    } catch (error: any) {
      console.error('Error updating order status:', error)
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Impossible de mettre à jour le statut',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-slate-500">Chargement...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Stock Status
            </span>
            {associatedEquipmentCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCalculateMinMax}
                disabled={calculatingMinMax}
              >
                <Calculator className="h-4 w-4 mr-2" />
                {calculatingMinMax ? 'Calculating...' : 'Calculate Min/Max'}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statut du stock */}
          {stockStatus && (
            <div className={`p-4 rounded-lg border-2 ${statusColors[stockStatus.status]}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{stockStatus.icon}</span>
                  <div>
                    <p className="font-semibold text-lg">{stockStatus.label}</p>
                    <p className="text-sm">{stockStatus.message}</p>
                  </div>
                </div>
                {stockStatus.needsOrder && (
                  <Button onClick={() => setIsOrderDialogOpen(true)}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Order
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Informations de stock */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Current stock</p>
              <p className="text-2xl font-bold text-slate-900">{currentStock}</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Minimum stock</p>
              <p className="text-xl font-semibold text-orange-600">{minStock}</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Maximum stock</p>
              <p className="text-xl font-semibold text-green-600">{maxStock}</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">On order</p>
              <p className="text-xl font-semibold text-blue-600">{pendingQuantity}</p>
            </div>
          </div>

          {/* Commandes en cours */}
          {pendingOrders.filter(order => !['received', 'cancelled'].includes(order.status)).length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Pending orders ({pendingOrders.filter(order => !['received', 'cancelled'].includes(order.status)).length})
              </h4>
              <div className="space-y-3">
                {pendingOrders.filter(order => !['received', 'cancelled'].includes(order.status)).map((order) => {
                  const statusInfo = orderStatusLabels[order.status]
                  return (
                    <div
                      key={order._id}
                      className="border rounded-lg p-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={statusInfo.color}>
                              {statusInfo.icon}
                              <span className="ml-1">{statusInfo.label}</span>
                            </Badge>
                            <span className="font-semibold">{order.quantity} piece(s)</span>
                          </div>
                          {order.orderNumber && (
                            <p className="text-xs text-slate-600">
                              Order #: {order.orderNumber}
                            </p>
                          )}
                          {order.supplier && (
                            <p className="text-xs text-slate-600">
                              Supplier: {order.supplier}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-xs text-slate-500">
                          <p>Ordered on {new Date(order.orderDate).toLocaleDateString('en-US')}</p>
                          {order.expectedDate && (
                            <p>Expected on {new Date(order.expectedDate).toLocaleDateString('en-US')}</p>
                          )}
                        </div>
                      </div>

                      {order.notes && (
                        <p className="text-xs text-slate-600 mb-2 italic">
                          {order.notes}
                        </p>
                      )}

                      {/* Actions de changement de statut */}
                      {order.status !== 'received' && order.status !== 'cancelled' && (
                        <div className="flex gap-2 mt-2 pt-2 border-t">
                          {order.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateOrderStatus(order._id, 'ordered')}
                            >
                              Mark as ordered
                            </Button>
                          )}
                          {order.status === 'ordered' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateOrderStatus(order._id, 'in_transit')}
                            >
                              In transit
                            </Button>
                          )}
                          {order.status === 'in_transit' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleUpdateOrderStatus(order._id, 'received')}
                            >
                              Mark as received
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleUpdateOrderStatus(order._id, 'cancelled')}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Info sur les équipements associés */}
          {associatedEquipmentCount > 0 && (
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-slate-600">
                📊 This part is used on <strong>{associatedEquipmentCount}</strong> equipment(s)
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Automatic Min/Max calculation is available
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateOrderDialog
        partId={partId}
        partName={partName}
        suggestedQuantity={stockStatus?.suggestedOrderQty || 0}
        defaultSupplier={defaultSupplier}
        open={isOrderDialogOpen}
        onClose={() => setIsOrderDialogOpen(false)}
        onSuccess={() => {
          fetchStockStatus()
          onUpdate?.()
        }}
      />
    </>
  )
}
