import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Plus, FileText, Clock, CheckCircle, Loader2, AlertTriangle } from "lucide-react"
import { getProcurementOrders, getProcurementStats, createProcurementOrder, updateOrderStatus, ProcurementOrder, ProcurementStats } from "@/api/procurement"
import { getInventory } from "@/api/inventory"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { format, isPast } from "date-fns"

export function Procurement() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<ProcurementOrder[]>([])
  const [stats, setStats] = useState<ProcurementStats | null>(null)

  // New Request State
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false)
  const [parts, setParts] = useState<any[]>([])
  const [requestData, setRequestData] = useState({
    partId: '',
    quantity: 1,
    supplier: '',
    expectedDate: '',
    notes: ''
  })

  // View Order State
  const [selectedOrder, setSelectedOrder] = useState<ProcurementOrder | null>(null)
  const [isViewOrderOpen, setIsViewOrderOpen] = useState(false)

  const fetchData = async () => {
    try {
      const [ordersData, statsData, inventoryData] = await Promise.all([
        getProcurementOrders(),
        getProcurementStats(),
        getInventory({ limit: 1000 })
      ])
      setOrders(ordersData || [])
      setStats(statsData)
      setParts(inventoryData?.parts || [])
    } catch (error) {
      console.error("Error fetching procurement data:", error)
      toast.error("Failed to load procurement data")
      setOrders([])
      setParts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreateRequest = async () => {
    try {
      await createProcurementOrder({
        partId: requestData.partId,
        quantity: Number(requestData.quantity),
        supplier: requestData.supplier,
        expectedDate: requestData.expectedDate,
        notes: requestData.notes
      })

      toast.success("Purchase request created successfully")
      setIsNewRequestOpen(false)
      setRequestData({
        partId: '',
        quantity: 1,
        supplier: '',
        expectedDate: '',
        notes: ''
      })
      fetchData() // Refresh list
    } catch (error) {
      toast.error("Failed to create purchase request")
    }
  }

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedOrder) return
    try {
      await updateOrderStatus(selectedOrder._id, selectedOrder.partId, newStatus)
      toast.success(`Order status updated to ${newStatus}`)
      setIsViewOrderOpen(false)
      setSelectedOrder(null)
      fetchData()
    } catch (error) {
      toast.error("Failed to update order status")
    }
  }

  const handlePartSelect = (partId: string) => {
    const part = parts.find(p => p._id === partId)
    setRequestData({
      ...requestData,
      partId,
      supplier: part?.supplier || ''
    })
  }

  const handleViewOrder = (order: ProcurementOrder) => {
    setSelectedOrder(order)
    setIsViewOrderOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500'
      case 'ordered': return 'bg-blue-500'
      case 'in_transit': return 'bg-purple-500'
      case 'received': return 'bg-green-500'
      case 'cancelled': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const isOverdue = (order: ProcurementOrder) => {
    if (!order.expectedDate || order.status === 'received' || order.status === 'cancelled') return false
    // Check if date is in past and NOT today (to avoid alarming for today's deliveries)
    const expected = new Date(order.expectedDate)
    const today = new Date()
    return isPast(expected) && expected.toDateString() !== today.toDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Procurement Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage purchase requests, suppliers, and orders
          </p>
        </div>

        <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              <Plus className="mr-2 h-4 w-4" />
              New Purchase Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Purchase Request</DialogTitle>
              <DialogDescription>Initiate a new order for parts or consumables.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="part">Select Part</Label>
                <Select value={requestData.partId} onValueChange={handlePartSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a part..." />
                  </SelectTrigger>
                  <SelectContent>
                    {parts.map((part) => (
                      <SelectItem key={part._id} value={part._id}>
                        {part.name} ({part.partNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={requestData.quantity}
                    onChange={(e) => setRequestData({ ...requestData, quantity: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expectedDate">Expected Date</Label>
                  <Input
                    id="expectedDate"
                    type="date"
                    value={requestData.expectedDate}
                    onChange={(e) => setRequestData({ ...requestData, expectedDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  value={requestData.supplier}
                  onChange={(e) => setRequestData({ ...requestData, supplier: e.target.value })}
                  placeholder="Supplier Name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={requestData.notes}
                  onChange={(e) => setRequestData({ ...requestData, notes: e.target.value })}
                  placeholder="Optional notes..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewRequestOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateRequest} disabled={!requestData.partId || requestData.quantity < 1}>
                Create Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View/Edit Order Dialog */}
        <Dialog open={isViewOrderOpen} onOpenChange={setIsViewOrderOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
              <DialogDescription>View and update order status.</DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-500">Part</Label>
                    <p className="font-medium">{selectedOrder.partName}</p>
                    <p className="text-xs text-slate-500">{selectedOrder.partNumber}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Order #</Label>
                    <p className="font-medium">{selectedOrder.orderNumber || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-500">Quantity</Label>
                    <p className="font-medium">{selectedOrder.quantity}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Total Price</Label>
                    <p className="font-medium">${selectedOrder.totalPrice?.toLocaleString() || '0'}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-slate-500">Supplier</Label>
                  <p className="font-medium">{selectedOrder.supplier || 'N/A'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-500">Ordered Date</Label>
                    <p className="font-medium">{format(new Date(selectedOrder.orderDate), 'PPP')}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Expected Date</Label>
                    <p className={`font-medium ${isOverdue(selectedOrder) ? 'text-red-600 font-bold' : ''}`}>
                      {selectedOrder.expectedDate ? format(new Date(selectedOrder.expectedDate), 'PPP') : 'N/A'}
                      {isOverdue(selectedOrder) && ' (Overdue)'}
                    </p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="status">Update Status</Label>
                  <Select
                    defaultValue={selectedOrder.status}
                    onValueChange={handleUpdateStatus}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="ordered">Ordered</SelectItem>
                      <SelectItem value="in_transit">In Transit</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    Marking as "Received" will automatically add items to stock.
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewOrderOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/60">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Pending Requests</p>
                <p className="text-3xl font-bold text-blue-900">{stats?.pendingRequests || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200/60">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Active Orders</p>
                <p className="text-3xl font-bold text-orange-900">{stats?.activeOrders || 0}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200/60">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Overdue Orders</p>
                <p className="text-3xl font-bold text-red-900">{stats?.overdueOrders || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/60">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Completed Orders</p>
                <p className="text-3xl font-bold text-green-900">{stats?.completedOrders || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200/60">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Total Suppliers</p>
                <p className="text-3xl font-bold text-purple-900">{stats?.totalSuppliers || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
        <CardHeader>
          <CardTitle>Recent Purchase Requests</CardTitle>
          <CardDescription>Latest procurement activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!orders || orders.length === 0 ? (
              <p className="text-center text-slate-500 py-4">No purchase orders found.</p>
            ) : (
              orders.map((order) => (
                <div key={order._id} className="flex items-center justify-between p-4 rounded-lg bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
                  <div>
                    <h4 className="font-medium">{order.partName} ({order.quantity} units)</h4>
                    <p className="text-sm text-slate-600">
                      Supplier: {order.supplier || 'Unknown'} • Order #: {order.orderNumber || 'N/A'}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-xs text-slate-500">
                        Ordered: {format(new Date(order.orderDate), 'PPP')}
                      </p>
                      {order.expectedDate && (
                        <p className={`text-xs flex items-center gap-1 ${isOverdue(order) ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                          {isOverdue(order) && <AlertTriangle className="h-3 w-3" />}
                          Expected: {format(new Date(order.expectedDate), 'PPP')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getStatusColor(order.status)} text-white capitalize`}>
                      {order.status.replace('_', ' ')}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => handleViewOrder(order)}>View</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}