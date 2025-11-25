import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Plus, FileText, Clock, CheckCircle, Loader2 } from "lucide-react"
import { getProcurementOrders, getProcurementStats, ProcurementOrder, ProcurementStats } from "@/api/procurement"
import { toast } from "sonner"
import { format } from "date-fns"

export function Procurement() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<ProcurementOrder[]>([])
  const [stats, setStats] = useState<ProcurementStats | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersData, statsData] = await Promise.all([
          getProcurementOrders(),
          getProcurementStats()
        ])
        setOrders(ordersData)
        setStats(statsData)
      } catch (error) {
        console.error("Error fetching procurement data:", error)
        toast.error("Failed to load procurement data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

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
        <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
          <Plus className="mr-2 h-4 w-4" />
          New Purchase Request
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            {orders.length === 0 ? (
              <p className="text-center text-slate-500 py-4">No purchase orders found.</p>
            ) : (
              orders.map((order) => (
                <div key={order._id} className="flex items-center justify-between p-4 rounded-lg bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
                  <div>
                    <h4 className="font-medium">{order.partName} ({order.quantity} units)</h4>
                    <p className="text-sm text-slate-600">
                      Supplier: {order.supplier || 'Unknown'} • Order #: {order.orderNumber || 'N/A'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Ordered on: {format(new Date(order.orderDate), 'PPP')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getStatusColor(order.status)} text-white capitalize`}>
                      {order.status.replace('_', ' ')}
                    </Badge>
                    <Button size="sm" variant="outline">View</Button>
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