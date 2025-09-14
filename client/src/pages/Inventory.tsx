import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { 
  Search, 
  Filter, 
  Plus, 
  Package, 
  AlertTriangle, 
  TrendingDown,
  TrendingUp,
  MapPin,
  DollarSign
} from "lucide-react"
import { getInventory, updateStock } from "@/api/inventory"
import { useToast } from "@/hooks/useToast"

interface InventoryItem {
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
}

export function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [stockUpdate, setStockUpdate] = useState({
    quantity: 0,
    type: 'in' as 'in' | 'out',
    reason: ''
  })
  const { toast } = useToast()

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        console.log('Fetching inventory data...')
        const response = await getInventory()
        setInventory((response as any).parts)
        console.log('Inventory data loaded successfully')
      } catch (error) {
        console.error('Error fetching inventory:', error)
        toast({
          title: "Error",
          description: "Failed to load inventory data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchInventory()
  }, [toast])

  const getStockStatus = (item: InventoryItem) => {
    if (item.currentStock <= item.minStock) return 'critical'
    if (item.currentStock <= item.minStock * 1.5) return 'low'
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

  const handleStockUpdate = async () => {
    if (!selectedItem) return

    try {
      console.log('Updating stock...')
      await updateStock(selectedItem._id, stockUpdate)
      toast({
        title: "Success",
        description: "Stock updated successfully",
      })
      setIsDialogOpen(false)
      setSelectedItem(null)
      setStockUpdate({ quantity: 0, type: 'in', reason: '' })
      // Refresh the list
      const response = await getInventory()
      setInventory((response as any).parts)
    } catch (error) {
      console.error('Error updating stock:', error)
      toast({
        title: "Error",
        description: "Failed to update stock",
        variant: "destructive",
      })
    }
  }

  const openStockDialog = (item: InventoryItem) => {
    setSelectedItem(item)
    setIsDialogOpen(true)
  }

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const categories = [...new Set(inventory.map(item => item.category))]

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
            Inventory Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Track and manage spare parts inventory
          </p>
        </div>
        <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Part
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search parts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInventory.map((item) => {
          const status = getStockStatus(item)
          return (
            <Card key={item._id} className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  <Badge className={`${getStockStatusColor(status)} text-white flex items-center gap-1`}>
                    {getStockStatusIcon(status)}
                    {status}
                  </Badge>
                </div>
                <CardDescription className="flex items-center text-slate-600">
                  <Package className="mr-1 h-3 w-3" />
                  {item.partNumber}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Category:</span>
                  <Badge variant="outline">{item.category}</Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <p className="text-slate-500">Current</p>
                    <p className="font-bold text-lg text-slate-900">{item.currentStock}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-500">Min</p>
                    <p className="font-semibold text-slate-700">{item.minStock}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-500">Max</p>
                    <p className="font-semibold text-slate-700">{item.maxStock}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 flex items-center">
                      <DollarSign className="mr-1 h-3 w-3" />
                      Unit Price:
                    </span>
                    <span className="font-semibold text-slate-900">${item.unitPrice}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 flex items-center">
                      <MapPin className="mr-1 h-3 w-3" />
                      Location:
                    </span>
                    <span className="text-slate-900">{item.location}</span>
                  </div>
                </div>

                <div className="text-sm">
                  <p className="text-slate-500">Supplier:</p>
                  <p className="text-slate-900">{item.supplier}</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    View Details
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
                    onClick={() => openStockDialog(item)}
                  >
                    Update Stock
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Stock Update Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
            <DialogDescription>
              Update stock levels for {selectedItem?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Transaction Type</Label>
              <Select value={stockUpdate.type} onValueChange={(value: 'in' | 'out') => setStockUpdate({...stockUpdate, type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Stock In</SelectItem>
                  <SelectItem value="out">Stock Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={stockUpdate.quantity}
                onChange={(e) => setStockUpdate({...stockUpdate, quantity: parseInt(e.target.value) || 0})}
                placeholder="Enter quantity"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                value={stockUpdate.reason}
                onChange={(e) => setStockUpdate({...stockUpdate, reason: e.target.value})}
                placeholder="Enter reason for stock change"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStockUpdate} className="bg-gradient-to-r from-blue-600 to-indigo-600">
              Update Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {filteredInventory.length === 0 && (
        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
          <CardContent className="p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No parts found</h3>
            <p className="text-slate-600">Try adjusting your search or filter criteria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}