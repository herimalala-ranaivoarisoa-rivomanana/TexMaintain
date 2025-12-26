import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Filter,
  Package,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  MapPin,
  DollarSign,
  Wrench,
  Droplet
} from "lucide-react"
import { Link } from "react-router-dom"
import { getInventory, updateStock, createPart, updatePart, deletePart } from "@/api/inventory"
import { useToast } from "@/hooks/useToast"
import { useAuth } from "@/contexts/AuthContext"
import { useFactory } from "@/contexts/FactoryContext"
import { saveAs } from "file-saver"

interface InventoryItem {
  _id: string
  name: string
  partNumber: string
  category: string
  type: 'part' | 'consumable'
  currentStock: number
  minStock: number
  maxStock: number
  unitPrice: number
  supplier: string
  location: string
  pendingQuantity?: number
  stockStatus?: {
    status: 'critical' | 'low' | 'normal' | 'high'
    label: string
    color: string
    icon: string
    message: string
  }
}

export function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [statistics, setStatistics] = useState({ total: 0, parts: 0, consumables: 0 })
  const [filteredTotal, setFilteredTotal] = useState(0)
  const [filteredCritical, setFilteredCritical] = useState(0)
  const [filteredTotalValue, setFilteredTotalValue] = useState(0)
  const [filteredAverageValue, setFilteredAverageValue] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [searchParams, setSearchParams] = useSearchParams()
  const [stockFilter, setStockFilter] = useState(searchParams.get('filter') || "all")
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || "all")
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10) || 1)
  const [limit, setLimit] = useState<number>(() => parseInt(localStorage.getItem('inv_limit') || '12', 10) || 12)
  const [sort, setSort] = useState<string>(searchParams.get('sort') || 'updatedAt')
  const [order, setOrder] = useState<'asc' | 'desc'>((searchParams.get('order') as any) || 'desc')
  const initialType = (searchParams.get('type') || '').toLowerCase()
  const initialTab: 'parts' | 'consumables' | 'all' = initialType === 'part' ? 'parts' : initialType === 'consumable' ? 'consumables' : 'all'
  const [activeTab, setActiveTab] = useState<'parts' | 'consumables' | 'all'>(initialTab)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPartDialogOpen, setIsPartDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [editingPart, setEditingPart] = useState<InventoryItem | null>(null)
  const [stockUpdate, setStockUpdate] = useState({
    quantity: 0,
    type: 'in' as 'in' | 'out',
    reason: ''
  })
  const [partForm, setPartForm] = useState({
    name: '',
    partNumber: '',
    category: '',
    type: 'part' as 'part' | 'consumable',
    currentStock: 0,
    minStock: 0,
    maxStock: 0,
    unitPrice: 0,
    supplier: '',
    location: ''
  })
  const [isSavingPart, setIsSavingPart] = useState(false)
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null)
  const [deletingPartId, setDeletingPartId] = useState<string | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()
  const { currentFactory } = useFactory()

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const params: any = { page, limit, sort, order }
        if (stockFilter !== 'all') params.stockStatus = stockFilter
        if (categoryFilter !== 'all') params.category = categoryFilter
        if (debouncedSearch) params.q = debouncedSearch
        const typeFromTab = activeTab === 'parts' ? 'part' : activeTab === 'consumables' ? 'consumable' : ''
        const typeFromUrl = (searchParams.get('type') || '').toLowerCase()
        const finalType = typeFromTab || (typeFromUrl === 'part' || typeFromUrl === 'consumable' ? typeFromUrl : '')
        if (finalType) params.type = finalType
        const response = await getInventory(params)
        const stats = (response as any).statistics || { total: 0, parts: 0, consumables: 0 }
        setInventory((response as any).parts)
        setStatistics(stats)
        setFilteredTotal((response as any).filteredTotal ?? (response as any).total ?? 0)
        setFilteredCritical((response as any).filteredCritical ?? 0)
        setFilteredTotalValue((response as any).filteredTotalValue ?? 0)
        setFilteredAverageValue((response as any).filteredAverageValue ?? 0)
        const apiTotal = Number((response as any).total || 0)
        setTotalCount(apiTotal)
        if (typeof (response as any).page === 'number') {
          setPage((response as any).page)
        }
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
    fetchInventory()
  }, [toast, page, categoryFilter, stockFilter, limit, sort, order, activeTab, debouncedSearch, currentFactory])

  // Debounce search term
  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300)
    return () => clearTimeout(h)
  }, [searchTerm])

  // Sync state to URL
  useEffect(() => {
    const next = new URLSearchParams()
    if (page && page !== 1) next.set('page', String(page))
    if (stockFilter && stockFilter !== 'all') next.set('filter', stockFilter)
    if (categoryFilter && categoryFilter !== 'all') next.set('category', categoryFilter)
    if (searchTerm) next.set('q', searchTerm)
    if (sort && sort !== 'updatedAt') next.set('sort', sort)
    if (order && order !== 'desc') next.set('order', order)
    const tFromTab = activeTab === 'parts' ? 'part' : activeTab === 'consumables' ? 'consumable' : ''
    const tFromUrl = (searchParams.get('type') || '').toLowerCase()
    const finalT = tFromTab || (tFromUrl === 'part' || tFromUrl === 'consumable' ? tFromUrl : '')
    if (finalT) next.set('type', finalT)
    setSearchParams(next, { replace: true })
  }, [page, categoryFilter, stockFilter, searchTerm, sort, order, activeTab, searchParams, setSearchParams])

  // Keep activeTab in sync with URL changes (direct navigation)
  useEffect(() => {
    const t = (searchParams.get('type') || '').toLowerCase()
    const tab: 'parts' | 'consumables' | 'all' = t === 'part' ? 'parts' : t === 'consumable' ? 'consumables' : 'all'
    if (tab !== activeTab) {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Reset filters when switching tabs
  useEffect(() => {
    setPage(1)
    setCategoryFilter('all')
    setStockFilter('all')
    setSearchTerm("")
  }, [activeTab])

  // Persist limit
  useEffect(() => {
    localStorage.setItem('inv_limit', String(limit))
  }, [limit])

  /* REMOVED: getStockStatus and helper functions - Now using backend provided stockStatus */
  // The API returns a fully populated stockStatus object with:
  // { status, label, color, icon, message }
  // We will access these properties directly from item.stockStatus


  const exportCSV = () => {
    const headers = ['Name', 'PartNumber', 'Category', 'Current', 'Min', 'Max', 'UnitPrice', 'Supplier', 'Location']
    const rows = inventory.map(p => [
      p.name,
      p.partNumber,
      p.category,
      String(p.currentStock ?? ''),
      String(p.minStock ?? ''),
      String(p.maxStock ?? ''),
      String(p.unitPrice ?? ''),
      p.supplier || '',
      p.location || ''
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, `inventory_export_page${page}.csv`)
  }

  const handleStockUpdate = async () => {
    if (!selectedItem) return

    try {
      console.log('Updating stock...')
      setUpdatingStockId(selectedItem._id)
      const prev = inventory
      const delta = stockUpdate.type === 'in' ? Math.abs(stockUpdate.quantity) : -Math.abs(stockUpdate.quantity)
      setInventory(prev.map(p => p._id === selectedItem._id ? { ...p, currentStock: Math.max(0, p.currentStock + delta) } : p))
      try {
        await updateStock(selectedItem._id, stockUpdate)
      } catch (err) {
        setInventory(prev)
        throw err
      }
      toast({
        title: "Success",
        description: "Stock updated successfully",
      })
      setIsDialogOpen(false)
      setSelectedItem(null)
      setStockUpdate({ quantity: 0, type: 'in', reason: '' })
    } catch (error) {
      console.error('Error updating stock:', error)
      toast({
        title: "Error",
        description: "Failed to update stock",
        variant: "destructive",
      })
    }
    finally {
      setUpdatingStockId(null)
    }
  }

  const openStockDialog = (item: InventoryItem) => {
    setSelectedItem(item)
    setIsDialogOpen(true)
  }

  const openAddPartDialog = () => {
    const defaultCategory = activeTab === 'parts' ? 'Mechanical Parts' : activeTab === 'consumables' ? 'Lubricants' : 'Mechanical Parts'
    setEditingPart(null)
    setPartForm({ name: '', partNumber: '', category: defaultCategory, type: activeTab === 'parts' ? 'part' : activeTab === 'consumables' ? 'consumable' : 'part', currentStock: 0, minStock: 0, maxStock: 0, unitPrice: 0, supplier: '', location: '' })
    setIsPartDialogOpen(true)
  }

  const openEditPartDialog = (item: InventoryItem) => {
    setEditingPart(item)
    setPartForm({
      name: item.name,
      partNumber: item.partNumber,
      category: item.category,
      type: item.type,
      currentStock: item.currentStock,
      minStock: item.minStock,
      maxStock: item.maxStock,
      unitPrice: item.unitPrice,
      supplier: item.supplier,
      location: item.location
    })
    setIsPartDialogOpen(true)
  }

  const handleSavePart = async () => {
    try {
      setIsSavingPart(true)
      if (editingPart) {
        const prev = inventory
        setInventory(prev.map(p => p._id === editingPart._id ? { ...p, ...partForm } as InventoryItem : p))
        try {
          await updatePart(editingPart._id, partForm)
          toast({ title: 'Updated', description: `${activeTab === 'parts' ? 'Part' : 'Consumable'} updated successfully` })
        } catch (err) {
          setInventory(prev)
          throw err
        }
      } else {
        const tempId = `temp-${Date.now()}`
        const temp: InventoryItem = { _id: tempId, ...partForm }
        setInventory([temp, ...inventory])
        try {
          const res = await createPart(partForm)
          const created = (res as any).part
          setInventory(list => list.map(p => p._id === tempId ? { ...created } : p))
          toast({ title: 'Created', description: `${activeTab === 'parts' ? 'Part' : 'Consumable'} created successfully` })
        } catch (err) {
          setInventory(list => list.filter(p => p._id !== tempId))
          throw err
        }
      }
      setIsPartDialogOpen(false)
    } catch (error) {
      console.error('Save part error:', error)
      toast({ title: 'Error', description: `Failed to save ${activeTab === 'parts' ? 'part' : 'consumable'}`, variant: 'destructive' })
    }
    finally {
      setIsSavingPart(false)
    }
  }

  const handleDeletePart = async (id: string) => {
    try {
      setDeletingPartId(id)
      const prev = inventory
      setInventory(prev.filter(p => p._id !== id))
      try {
        await deletePart(id)
        toast({ title: 'Deleted', description: `${activeTab === 'parts' ? 'Part' : 'Consumable'} deleted` })
      } catch (err) {
        setInventory(prev)
        throw err
      }
    } catch (error) {
      console.error('Delete part error:', error)
      toast({ title: 'Error', description: `Failed to delete ${activeTab === 'parts' ? 'part' : 'consumable'}`, variant: 'destructive' })
    }
    finally {
      setDeletingPartId(null)
    }
  }

  // The API already returns the filtered/typed list; use it directly
  const currentItems = inventory

  const getReferenceLabel = () => {
    return activeTab === 'parts' ? 'Part Number' : activeTab === 'consumables' ? 'Reference' : 'Part Number'
  }

  const getAddButtonText = () => {
    return activeTab === 'parts' ? 'Add Part' : activeTab === 'consumables' ? 'Add Consumable' : 'Add Item'
  }

  const getAddButtonIcon = () => {
    return activeTab === 'parts' ? <Wrench className="mr-2 h-4 w-4" /> : activeTab === 'consumables' ? <Droplet className="mr-2 h-4 w-4" /> : <Package className="mr-2 h-4 w-4" />
  }

  const getCategoryOptions = () => {
    if (activeTab === 'parts') {
      return [
        'Belts',
        'Bearings',
        'Gears',
        'Motors',
        'Pumps',
        'Valves',
        'Filters',
        'Sensors',
        'Actuators',
        'Cables',
        'Connectors',
        'Switches',
        'Relays',
        'Circuit Boards',
        'Mechanical Parts',
        'Fasteners',
        'Tools',
        'Maintenance Equipment',
        'Sewing Supplies',
        'Cutting Tools'
      ]
    } else if (activeTab === 'consumables') {
      return [
        'Lubricants',
        'Oils',
        'Greases',
        'Coolants',
        'Cleaning Agents',
        'Adhesives',
        'Sealants',
        'Paints',
        'Coatings',
        'Chemicals',
        'Solvents',
        'Fuels',
        'Batteries',
        'Filters',
        'Cartridges',
        'Tapes',
        'Glues',
        'Welding Supplies'
      ]
    } else {
      // Pour 'all', retourner toutes les catégories
      return [
        'Belts', 'Bearings', 'Gears', 'Motors', 'Pumps', 'Valves', 'Filters', 'Sensors', 'Actuators', 'Cables', 'Connectors', 'Switches', 'Relays', 'Circuit Boards', 'Mechanical Parts', 'Fasteners', 'Tools', 'Maintenance Equipment', 'Sewing Supplies', 'Cutting Tools',
        'Lubricants', 'Oils', 'Greases', 'Coolants', 'Cleaning Agents', 'Adhesives', 'Sealants', 'Paints', 'Coatings', 'Chemicals', 'Solvents', 'Fuels', 'Batteries', 'Cartridges', 'Tapes', 'Glues', 'Welding Supplies'
      ]
    }
  }

  const PartList = ({ items }: { items: InventoryItem[] }) => (
    <>
      {/* Filters */}
      <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={`Search ${activeTab === 'parts' ? 'parts' : 'consumables'}...`}
                value={searchTerm}
                onChange={(e) => { setPage(1); setSearchTerm(e.target.value) }}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => { setPage(1); setCategoryFilter(v) }}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {getCategoryOptions().map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={(v) => { setPage(1); setStockFilter(v) }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Status</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => { setPage(1); setSort(v) }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updatedAt">Updated</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="partNumber">Part #</SelectItem>
                <SelectItem value="currentStock">Stock</SelectItem>
              </SelectContent>
            </Select>
            <Select value={order} onValueChange={(v: any) => { setPage(1); setOrder(v) }}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Desc</SelectItem>
                <SelectItem value="asc">Asc</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(limit)} onValueChange={(v) => { setPage(1); setLimit(parseInt(v, 10)) }}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 / page</SelectItem>
                <SelectItem value="12">12 / page</SelectItem>
                <SelectItem value="24">24 / page</SelectItem>
                <SelectItem value="48">48 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Pagination summary */}
          <div className="mt-3 text-sm text-slate-600 flex items-center justify-between gap-2 flex-wrap">
            <span>
              {filteredTotal} results • Page {page} / {Math.max(1, Math.ceil(totalCount / limit))}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(1)}>«</Button>
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= Math.max(1, Math.ceil(totalCount / limit))} onClick={() => setPage(p => p + 1)}>Next</Button>
              <Button variant="outline" size="sm" disabled={page >= Math.max(1, Math.ceil(totalCount / limit))} onClick={() => setPage(Math.max(1, Math.ceil(totalCount / limit)))}>»</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total {activeTab === 'parts' ? 'Parts' : activeTab === 'consumables' ? 'Consumables' : 'Items'}</p>
                <p className="text-2xl font-bold">{filteredTotal}</p>
              </div>
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Critical Stock</p>
                <p className="text-2xl font-bold text-red-600">{filteredCritical}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Value</p>
                <p className="text-2xl font-bold text-green-600">Rs {filteredTotalValue?.toFixed(2)}</p>
              </div>
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Average Value</p>
                <p className="text-2xl font-bold text-blue-600">Rs {filteredAverageValue?.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items?.map((item) => {
          // Use backend provided status or fallback to safe defaults if missing (should not happen with updated backend)
          const statusObj = item.stockStatus || {
            status: 'normal',
            label: 'Normal',
            color: 'green',
            icon: '🟢',
            message: ''
          }

          // Map backend color names to Tailwind classes if needed, or use the object's color if it's already a class
          // The backend returns simple names: 'red', 'orange', 'blue', 'green'
          const getColorClass = (colorName: string) => {
            switch (colorName) {
              case 'red': return 'bg-red-500'
              case 'orange': return 'bg-orange-500' // 'orange' usually maps to yellow/orange in TW
              case 'yellow': return 'bg-yellow-500'
              case 'blue': return 'bg-blue-500'
              case 'green': return 'bg-green-500'
              default: return 'bg-gray-500'
            }
          }

          // Map icon string to Lucide component
          const getIconComponent = (statusStr: string) => {
            if (statusStr === 'critical') return <AlertTriangle className="h-4 w-4" />
            if (statusStr === 'low') return <TrendingDown className="h-4 w-4" />
            if (statusStr === 'high') return <TrendingUp className="h-4 w-4" />
            return <Package className="h-4 w-4" />
          }

          return (
            <Card key={item._id} className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg"><Link className="hover:underline" to={`/inventory/${item._id}`}>{item.name}</Link></CardTitle>
                  <Badge className={`${getColorClass(statusObj.color)} text-white flex items-center gap-1`} title={statusObj.message}>
                    {getIconComponent(statusObj.status)}
                    {statusObj.label}
                  </Badge>
                </div>
                <CardDescription className="flex items-center text-slate-600">
                  <Package className="mr-1 h-3 w-3" />
                  {item.partNumber}
                  {item.pendingQuantity && item.pendingQuantity > 0 ? (
                    <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200 text-xs py-0 h-5">
                      +{item.pendingQuantity} on order
                    </Badge>
                  ) : null}
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
                    <span className="font-semibold text-slate-900">Rs {item.unitPrice}</span>
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
                  {(user?.role === 'admin' || user?.role === 'procurement_manager') && (
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditPartDialog(item)} disabled={deletingPartId === item._id}>
                      {deletingPartId === item._id ? '...' : 'Edit'}
                    </Button>
                  )}
                  {(user?.role === 'admin' || user?.role === 'maintenance_manager' || user?.role === 'procurement_manager') && (
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-blue-600 to-indigo-600"
                      onClick={() => openStockDialog(item)} disabled={updatingStockId === item._id}
                    >
                      {updatingStockId === item._id ? 'Updating...' : 'Update Stock'}
                    </Button>
                  )}
                  {user?.role === 'admin' && (
                    <Button variant="destructive" size="sm" onClick={() => handleDeletePart(item._id)} disabled={deletingPartId === item._id}>
                      {deletingPartId === item._id ? 'Deleting...' : 'Delete'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Message if no items */}
      {items?.length === 0 && (
        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
          <CardContent className="p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No {activeTab === 'parts' ? 'spare parts' : activeTab === 'consumables' ? 'consumables' : 'items'} found
            </h3>
            <p className="text-slate-600">Try adjusting your search or filter criteria.</p>
          </CardContent>
        </Card>
      )}
    </>
  )

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
            Track and manage spare parts and consumables inventory
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>Export CSV</Button>
          {(user?.role === 'admin' || user?.role === 'procurement_manager') && (
            <Button onClick={openAddPartDialog} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              {getAddButtonIcon()}
              {getAddButtonText()}
            </Button>
          )}
        </div>
      </div>

      {/* Parts / Consumables Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value as 'parts' | 'consumables' | 'all'); setPage(1); setCategoryFilter('all'); setSearchTerm(""); }} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            All ({statistics.total})
          </TabsTrigger>
          <TabsTrigger value="parts" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Spare Parts ({statistics.parts})
          </TabsTrigger>
          <TabsTrigger value="consumables" className="flex items-center gap-2">
            <Droplet className="h-4 w-4" />
            Consumables ({statistics.consumables})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <PartList items={currentItems} />
        </TabsContent>

        <TabsContent value="parts" className="space-y-4">
          <PartList items={currentItems} />
        </TabsContent>

        <TabsContent value="consumables" className="space-y-4">
          <PartList items={currentItems} />
        </TabsContent>
      </Tabs>

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
              <Select value={stockUpdate.type} onValueChange={(value: 'in' | 'out') => setStockUpdate({ ...stockUpdate, type: value })}>
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
                onChange={(e) => setStockUpdate({ ...stockUpdate, quantity: parseInt(e.target.value) || 0 })}
                placeholder="Enter quantity"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                value={stockUpdate.reason}
                onChange={(e) => setStockUpdate({ ...stockUpdate, reason: e.target.value })}
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

      {/* Add/Edit Part Dialog */}
      <Dialog open={isPartDialogOpen} onOpenChange={setIsPartDialogOpen}>
        <DialogContent className="sm:max-w-[520px] bg-white">
          <DialogHeader>
            <DialogTitle>{editingPart ? `Edit ${activeTab === 'parts' ? 'Part' : 'Consumable'}` : `Add ${activeTab === 'parts' ? 'Part' : 'Consumable'}`}</DialogTitle>
            <DialogDescription>
              {editingPart ? `Update the selected ${activeTab === 'parts' ? 'part' : 'consumable'} details.` : `Create a new inventory ${activeTab === 'parts' ? 'part' : 'consumable'}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={partForm.name} onChange={(e) => setPartForm({ ...partForm, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="partNumber">{getReferenceLabel()}</Label>
              <Input id="partNumber" value={partForm.partNumber} onChange={(e) => setPartForm({ ...partForm, partNumber: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select value={partForm.category} onValueChange={(value) => setPartForm({ ...partForm, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select or type a category" />
                </SelectTrigger>
                <SelectContent>
                  {getCategoryOptions().map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                  {partForm.category && !getCategoryOptions().includes(partForm.category) && (
                    <SelectItem value={partForm.category}>
                      {partForm.category} (New)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or type a new category"
                value={partForm.category}
                onChange={(e) => setPartForm({ ...partForm, category: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="currentStock">Current</Label>
                <Input id="currentStock" type="number" value={partForm.currentStock} onChange={(e) => setPartForm({ ...partForm, currentStock: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="minStock">Min</Label>
                <Input id="minStock" type="number" value={partForm.minStock} onChange={(e) => setPartForm({ ...partForm, minStock: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="maxStock">Max</Label>
                <Input id="maxStock" type="number" value={partForm.maxStock} onChange={(e) => setPartForm({ ...partForm, maxStock: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unitPrice">Unit Price</Label>
              <Input id="unitPrice" type="number" value={partForm.unitPrice} onChange={(e) => setPartForm({ ...partForm, unitPrice: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input id="supplier" value={partForm.supplier} onChange={(e) => setPartForm({ ...partForm, supplier: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={partForm.location} onChange={(e) => setPartForm({ ...partForm, location: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPartDialogOpen(false)} disabled={isSavingPart}>Cancel</Button>
            <Button onClick={handleSavePart} className="bg-gradient-to-r from-blue-600 to-indigo-600" disabled={isSavingPart}>{isSavingPart ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {currentItems.length === 0 && (
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