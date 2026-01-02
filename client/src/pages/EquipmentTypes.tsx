import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus,
  Pencil,
  Trash,
  Wrench,
  Filter,
  Search,
  Layers,
  Activity,
  TrendingUp,
  AlertCircle,

  BarChart3,
  Package
} from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { useAuth } from "@/contexts/AuthContext"
import { useFactory } from "@/contexts/FactoryContext"
import { getEquipmentTypes, createEquipmentType, updateEquipmentType, deleteEquipmentType } from "@/api/equipmentTypes"
import { getEquipmentCategories } from "@/api/equipmentCategories"
import { getEquipment } from "@/api/equipment"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"

import { EQUIPMENT_STATUSES } from "@/types/equipment"

interface Category {
  _id: string
  name: string
  description?: string
}

interface EquipmentType {
  _id: string
  name: string
  description?: string
  category: Category
  createdAt: string
  updatedAt: string
}

interface EquipmentStats {
  typeId: string
  typeName: string
  categoryName: string
  totalEquipment: number
  byStatus: {
    online: number
    maintenance: number
    breakdown: number
    offline: number
    scrapped: number
  }
  avgMtbf: number
  avgMttr: number
  availability: number
}

export function EquipmentTypes() {
  const [types, setTypes] = useState<EquipmentType[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [stats, setStats] = useState<EquipmentStats[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<'name' | 'equipment' | 'availability'>('name')
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<EquipmentType | null>(null)
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: ""
  })
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { user } = useAuth()
  const { currentFactory } = useFactory()

  useEffect(() => {
    fetchData()
  }, [currentFactory])

  const fetchData = async () => {
    try {
      const [typesResponse, categoriesResponse, equipmentResponse] = await Promise.all([
        getEquipmentTypes(),
        getEquipmentCategories(),
        getEquipment({ limit: 1000 }) // Get all equipment for stats
      ])
      const typesData = typesResponse.types || []
      const equipmentData = (equipmentResponse as any).equipment || []

      setTypes(typesData)
      setCategories(categoriesResponse.categories || [])

      // Calculate statistics
      const calculatedStats = calculateEquipmentStats(typesData, equipmentData)
      setStats(calculatedStats)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: "Error",
        description: "Failed to load equipment types",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateEquipmentStats = (typesData: EquipmentType[], equipmentData: any[]): EquipmentStats[] => {
    return typesData.map(type => {
      const typeEquipment = equipmentData.filter(eq => eq.type?._id === type._id)
      const totalEquipment = typeEquipment.length

      const byStatus = {
        online: typeEquipment.filter(eq => [
          EQUIPMENT_STATUSES.IN_PRODUCTION,
          EQUIPMENT_STATUSES.SETUP_ADJUSTMENT,
          EQUIPMENT_STATUSES.CHANGEOVER,
          EQUIPMENT_STATUSES.PAUSED_BY_OPERATOR
        ].includes(eq.status as any)).length,
        maintenance: typeEquipment.filter(eq => [
          EQUIPMENT_STATUSES.SCHEDULED_MAINTENANCE,
          EQUIPMENT_STATUSES.UNDER_REPAIR,
          EQUIPMENT_STATUSES.IN_WORKSHOP,
          EQUIPMENT_STATUSES.WAITING_SPARE_PARTS,
          EQUIPMENT_STATUSES.TESTING_AFTER_REPAIR,
          EQUIPMENT_STATUSES.UNDER_INSPECTION,
          EQUIPMENT_STATUSES.PENDING_VALIDATION
        ].includes(eq.status as any)).length,
        breakdown: typeEquipment.filter(eq => eq.status === EQUIPMENT_STATUSES.BREAKDOWN).length,
        offline: typeEquipment.filter(eq => [
          EQUIPMENT_STATUSES.OFFLINE,
          EQUIPMENT_STATUSES.STORED
        ].includes(eq.status as any)).length,
        scrapped: typeEquipment.filter(eq => eq.status === EQUIPMENT_STATUSES.SCRAPPED).length,
      }

      const avgMtbf = totalEquipment > 0 ? typeEquipment.reduce((sum, eq) => sum + (eq.mtbf || 0), 0) / totalEquipment : 0
      const avgMttr = totalEquipment > 0 ? typeEquipment.reduce((sum, eq) => sum + (eq.mttr || 0), 0) / totalEquipment : 0

      // Calculate availability: (online + maintenance) / total * 100
      const operational = byStatus.online + byStatus.maintenance
      const availability = totalEquipment > 0 ? (operational / totalEquipment) * 100 : 0

      return {
        typeId: type._id,
        typeName: type.name,
        categoryName: type.category.name,
        totalEquipment,
        byStatus,
        avgMtbf: Math.round(avgMtbf * 100) / 100,
        avgMttr: Math.round(avgMttr * 100) / 100,
        availability: Math.round(availability * 100) / 100
      }
    })
  }

  const filteredTypes = categoryFilter === "all"
    ? types
    : types.filter(type => type.category._id === categoryFilter)

  // Apply search and sort
  const processedTypes = useMemo(() => {
    let result = filteredTypes.filter(type =>
      type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.category.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      } else if (sortBy === 'equipment') {
        const aCount = stats.find(s => s.typeId === a._id)?.totalEquipment || 0
        const bCount = stats.find(s => s.typeId === b._id)?.totalEquipment || 0
        return bCount - aCount
      } else if (sortBy === 'availability') {
        const aAvail = stats.find(s => s.typeId === a._id)?.availability || 0
        const bAvail = stats.find(s => s.typeId === b._id)?.availability || 0
        return bAvail - aAvail
      }
      return 0
    })

    return result
  }, [filteredTypes, searchTerm, sortBy, stats])

  // Global Statistics
  const globalStats = useMemo(() => {
    const totalTypes = types.length
    const totalEquipment = stats.reduce((sum, s) => sum + s.totalEquipment, 0)
    const totalOnline = stats.reduce((sum, s) => sum + s.byStatus.online, 0)
    const totalMaintenance = stats.reduce((sum, s) => sum + s.byStatus.maintenance, 0)
    const totalBreakdown = stats.reduce((sum, s) => sum + s.byStatus.breakdown, 0)
    const avgAvailability = stats.length > 0 ? stats.reduce((sum, s) => sum + s.availability, 0) / stats.length : 0

    return {
      totalTypes,
      totalEquipment,
      totalOnline,
      totalMaintenance,
      totalBreakdown,
      avgAvailability: Math.round(avgAvailability * 100) / 100
    }
  }, [types, stats])

  const openAddDialog = () => {
    setEditingItem(null)
    setForm({ name: "", description: "", category: "" })
    setIsDialogOpen(true)
  }

  const openEditDialog = (item: EquipmentType) => {
    setEditingItem(item)
    setForm({ name: item.name, description: item.description || "", category: item.category._id })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      // Validation
      if (!form.name.trim()) {
        toast({ title: "Validation Error", description: "Name is required", variant: "destructive" })
        return
      }
      if (!form.category) {
        toast({ title: "Validation Error", description: "Category is required", variant: "destructive" })
        return
      }

      setIsSaving(true)
      if (editingItem) {
        await updateEquipmentType(editingItem._id, form)
        toast({ title: "Updated", description: "Equipment type updated successfully" })
      } else {
        await createEquipmentType(form)
        toast({ title: "Created", description: "Equipment type created successfully" })
      }
      setIsDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Save type error:', error)
      toast({ title: "Error", description: "Failed to save equipment type", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id)
      await deleteEquipmentType(id)
      toast({ title: "Deleted", description: "Equipment type deleted successfully" })
      fetchData()
    } catch (error) {
      console.error('Delete type error:', error)
      toast({ title: "Error", description: "Failed to delete equipment type", variant: "destructive" })
    } finally {
      setDeletingId(null)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Equipment Types
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage equipment types within categories
          </p>
        </div>
        {(user?.role === 'admin' || user?.role === 'maintenance_manager') && (
          <Button onClick={openAddDialog} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Type
          </Button>
        )}
      </div>

      {/* Global KPI Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-3">
            <CardDescription className="text-blue-700 font-medium">Total Types</CardDescription>
            <CardTitle className="text-3xl text-blue-900">{globalStats.totalTypes}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-blue-700">
              <Layers className="mr-2 h-4 w-4" />
              {categories.length} categories
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-3">
            <CardDescription className="text-purple-700 font-medium">Total Equipment</CardDescription>
            <CardTitle className="text-3xl text-purple-900">{globalStats.totalEquipment}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-purple-700">
              <Package className="mr-2 h-4 w-4" />
              Across all types
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-3">
            <CardDescription className="text-green-700 font-medium">Average Availability</CardDescription>
            <CardTitle className="text-3xl text-green-900">{globalStats.avgAvailability}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-green-700">
              <TrendingUp className="mr-2 h-4 w-4" />
              {globalStats.totalOnline} online
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-3">
            <CardDescription className="text-red-700 font-medium">In Breakdown</CardDescription>
            <CardTitle className="text-3xl text-red-900">{globalStats.totalBreakdown}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-red-700">
              <AlertCircle className="mr-2 h-4 w-4" />
              {globalStats.totalMaintenance} in maintenance
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search types by name or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category._id} value={category._id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="equipment">Equipment Count</SelectItem>
                  <SelectItem value="availability">Availability</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 text-sm text-slate-600">
                <BarChart3 className="h-4 w-4" />
                <span>Showing {processedTypes.length} of {types.length} types</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compact Statistics Table */}
      {stats.length > 0 && (
        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Equipment Statistics by Type</CardTitle>
                <CardDescription>Performance metrics and status distribution</CardDescription>
              </div>
              <Badge variant="outline" className="text-sm">
                <Activity className="h-3 w-3 mr-1" />
                Live Data
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Online</TableHead>
                  <TableHead className="text-center">Maintenance</TableHead>
                  <TableHead className="text-center">Breakdown</TableHead>
                  <TableHead className="text-center">MTBF</TableHead>
                  <TableHead className="text-center">MTTR</TableHead>
                  <TableHead className="text-center">Availability</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats
                  .filter(stat => categoryFilter === "all" || categories.find(c => c.name === stat.categoryName)?._id === categoryFilter)
                  .map((stat) => (
                    <TableRow key={stat.typeId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{stat.typeName}</p>
                          <p className="text-xs text-slate-500">{stat.categoryName}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{stat.totalEquipment}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-green-500 text-white">{stat.byStatus.online}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-yellow-500 text-white">{stat.byStatus.maintenance}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-red-500 text-white">{stat.byStatus.breakdown}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm">{stat.avgMtbf.toFixed(1)}h</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm">{stat.avgMttr.toFixed(1)}h</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Progress value={stat.availability} className="w-16 h-2" />
                          <span className="text-sm font-medium min-w-[3rem]">{stat.availability.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Equipment Types Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {processedTypes.map((type) => {
          const typeStat = stats.find(s => s.typeId === type._id)
          const hasEquipment = typeStat && typeStat.totalEquipment > 0

          return (
            <Card key={type._id} className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{type.name}</CardTitle>
                  <Badge variant="secondary">
                    <Wrench className="h-3 w-3 mr-1" />
                    Type
                  </Badge>
                </div>
                <CardDescription className="flex items-center text-slate-600">
                  Category: {type.category.name}
                </CardDescription>
                {type.description && (
                  <CardDescription className="mt-2">{type.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {/* Equipment Statistics */}
                {hasEquipment ? (
                  <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-1">Total Equipment</p>
                        <p className="text-2xl font-bold text-slate-900">{typeStat.totalEquipment}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-xs text-green-700 mb-1">Availability</p>
                        <p className="text-2xl font-bold text-green-900">{typeStat.availability.toFixed(0)}%</p>
                      </div>
                    </div>

                    {/* Status Distribution Mini Chart */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-600">Status Distribution</p>
                      <div className="flex gap-1 h-2 rounded overflow-hidden">
                        {typeStat.byStatus.online > 0 && (
                          <div
                            className="bg-green-500"
                            style={{ width: `${(typeStat.byStatus.online / typeStat.totalEquipment) * 100}%` }}
                            title={`Online: ${typeStat.byStatus.online}`}
                          />
                        )}
                        {typeStat.byStatus.maintenance > 0 && (
                          <div
                            className="bg-yellow-500"
                            style={{ width: `${(typeStat.byStatus.maintenance / typeStat.totalEquipment) * 100}%` }}
                            title={`Maintenance: ${typeStat.byStatus.maintenance}`}
                          />
                        )}
                        {typeStat.byStatus.breakdown > 0 && (
                          <div
                            className="bg-red-500"
                            style={{ width: `${(typeStat.byStatus.breakdown / typeStat.totalEquipment) * 100}%` }}
                            title={`Breakdown: ${typeStat.byStatus.breakdown}`}
                          />
                        )}
                        {typeStat.byStatus.offline > 0 && (
                          <div
                            className="bg-gray-500"
                            style={{ width: `${(typeStat.byStatus.offline / typeStat.totalEquipment) * 100}%` }}
                            title={`Offline: ${typeStat.byStatus.offline}`}
                          />
                        )}
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          {typeStat.byStatus.online}
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                          {typeStat.byStatus.maintenance}
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full" />
                          {typeStat.byStatus.breakdown}
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-gray-500 rounded-full" />
                          {typeStat.byStatus.offline}
                        </span>
                      </div>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div>
                        <p className="text-xs text-slate-500">MTBF</p>
                        <p className="text-sm font-semibold">{typeStat.avgMtbf.toFixed(1)}h</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">MTTR</p>
                        <p className="text-sm font-semibold">{typeStat.avgMttr.toFixed(1)}h</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 p-4 bg-slate-50 rounded-lg text-center">
                    <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">No equipment assigned yet</p>
                  </div>
                )}

                <div className="text-sm text-slate-500 mb-4">
                  Created: {new Date(type.createdAt).toLocaleDateString()}
                </div>

                {user?.role === 'admin' && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(type)} disabled={deletingId === type._id}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleDelete(type._id)} disabled={deletingId === type._id}>
                      <Trash className="mr-2 h-4 w-4" /> {deletingId === type._id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {processedTypes.length === 0 && (
        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
          <CardContent className="p-12 text-center">
            <Wrench className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No equipment types found</h3>
            <p className="text-slate-600 mb-4">
              {searchTerm
                ? `No types match "${searchTerm}". Try a different search term.`
                : categoryFilter === "all"
                  ? "Start by adding your first equipment type."
                  : "No types found for the selected category. Try selecting a different category or add a new type."
              }
            </p>
            {(searchTerm || categoryFilter !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setCategoryFilter('all')
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Type Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Equipment Type' : 'Add Equipment Type'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter type name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category._id} value={category._id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Enter type description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-indigo-600" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function EquipmentTypesPageWrapper() {
  return <EquipmentTypes />
}