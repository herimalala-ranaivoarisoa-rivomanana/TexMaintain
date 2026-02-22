import { useState, useEffect } from 'react'
import { Package, AlertTriangle, CheckCircle, Clock, Truck, ShoppingCart, Calculator, Plus, X, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/useToast'
import { getStockStatus, calculateMinMax, updateOrderStatus, type StockStatus, type PendingOrder } from '@/api/inventory'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  const [associatedAssetCount, setAssociatedAssetCount] = useState(0)
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false)
  const [calculatingMinMax, setCalculatingMinMax] = useState(false)

  // Partial Update State
  const [selectedOrderForUpdate, setSelectedOrderForUpdate] = useState<PendingOrder | null>(null)
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<string>('')
  const [splitQuantity, setSplitQuantity] = useState<number>(0)

  // Multiple References State
  const [references, setReferences] = useState<string[]>([])
  const [newReferenceInput, setNewReferenceInput] = useState("")

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
      setAssociatedAssetCount(response.associatedAssetCount || 0)
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

  const openUpdateDialog = (order: PendingOrder, status: string) => {
    setSelectedOrderForUpdate(order)
    setNewStatus(status)
    setSplitQuantity(order.quantity)

    // Initialize references from existing data
    let initialRefs: string[] = []
    if (order.references && order.references.length > 0) {
      initialRefs = [...order.references]
    } else if (order.reference) {
      initialRefs = [order.reference]
    } else if ((order as any).references) { // Fallback just in case
      initialRefs = [...(order as any).references]
    }

    setReferences(initialRefs)
    setNewReferenceInput("")
    setIsUpdateDialogOpen(true)
  }

  const addReference = () => {
    if (newReferenceInput.trim()) {
      if (!references.includes(newReferenceInput.trim())) {
        setReferences([...references, newReferenceInput.trim()])
      }
      setNewReferenceInput("")
    }
  }

  const removeReference = (refToRemove: string) => {
    setReferences(references.filter(r => r !== refToRemove))
  }

  const handleUpdateConfirm = async () => {
    if (!selectedOrderForUpdate || !newStatus) return

    try {
      await updateOrderStatus(partId, selectedOrderForUpdate._id, newStatus, {
        quantity: splitQuantity,
        references: references
      })

      toast({
        title: 'Statut mis à jour',
        description: `Commande mise à jour: ${orderStatusLabels[newStatus as keyof typeof orderStatusLabels].label}`
      })
      setIsUpdateDialogOpen(false)
      setSelectedOrderForUpdate(null)
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
            {associatedAssetCount > 0 && (
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
                  // Display references: prioritize array, fallback to single string
                  const rawRefs = order.references && order.references.length > 0
                    ? order.references
                    : (order.reference ? [order.reference] : []);

                  // Sanitize references to avoid UI breaking with garbage values (e.g. long ++++++ strings)
                  const displayRefs = rawRefs
                    .map(r => String(r || '').trim())
                    .filter(r => r.length > 0)
                    .filter(r => !/^\++$/.test(r))
                    .map(r => (r.length > 60 ? `${r.slice(0, 60)}…` : r));

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

                          {/* Display References */}
                          {displayRefs.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {displayRefs.map((ref, idx) => (
                                <Badge key={idx} variant="outline" className="text-[10px] h-5 bg-white">
                                  <FileText className="w-3 h-3 mr-1 text-slate-400" />
                                  {ref}
                                </Badge>
                              ))}
                            </div>
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
                              onClick={() => openUpdateDialog(order, 'ordered')}
                            >
                              Mark as ordered
                            </Button>
                          )}
                          {order.status === 'ordered' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openUpdateDialog(order, 'in_transit')}
                            >
                              In transit
                            </Button>
                          )}
                          {order.status === 'in_transit' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => openUpdateDialog(order, 'received')}
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
          {associatedAssetCount > 0 && (
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-slate-600">
                📊 This part is used on <strong>{associatedAssetCount}</strong> asset(s)
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

      {/* Update Order Status Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Update to: <strong>{newStatus && orderStatusLabels[newStatus as keyof typeof orderStatusLabels]?.label}</strong>
            </DialogDescription>
          </DialogHeader>

          {selectedOrderForUpdate && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Quantity Input */}
                <div>
                  <Label className="text-xs text-slate-500">Move Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    max={selectedOrderForUpdate.quantity}
                    value={splitQuantity}
                    onChange={(e) => setSplitQuantity(Number(e.target.value))}
                    className="mt-1 h-8"
                  />
                  {splitQuantity < selectedOrderForUpdate.quantity && (
                    <span className="text-[10px] text-orange-600 font-medium block mt-1">
                      Splitting (Remaining: {selectedOrderForUpdate.quantity - splitQuantity})
                    </span>
                  )}
                </div>

                {/* Reference List Input */}
                <div className="col-span-2">
                  <Label className="text-xs text-slate-500">Document References</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={newReferenceInput}
                      onChange={(e) => setNewReferenceInput(e.target.value)}
                      placeholder="e.g. BL-123, Invoice #456"
                      className="h-8 flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addReference()
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addReference}
                      type="button"
                      className="h-8 px-2"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* References List */}
                  {references.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 p-2 bg-slate-50 rounded-md border border-slate-100">
                      {references.map((ref, idx) => (
                        <div key={idx} className="flex items-center bg-white border rounded px-2 py-1 text-xs shadow-sm">
                          <span className="mr-2">{ref}</span>
                          <button
                            onClick={() => removeReference(ref)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {references.length === 0 && (
                    <p className="text-[10px] text-slate-400 mt-1 italic">No references added yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateConfirm}>Confirm Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
