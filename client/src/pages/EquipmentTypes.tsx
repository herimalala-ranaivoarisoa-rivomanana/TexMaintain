import { useEffect, useState } from "react"
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
  Filter
} from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { useAuth } from "@/contexts/AuthContext"
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

  useEffect(() => {
    fetchData()
  }, [])

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

      {/* Filter */}
      <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium">Filter by Category:</span>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-64">
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
        </CardContent>
      </Card>

      {/* Statistics Table */}
      {stats.length > 0 && (
        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
          <CardHeader>
            <CardTitle className="text-xl">Equipment Statistics by Type</CardTitle>
            <CardDescription>Overview of equipment performance and status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Status Distribution</TableHead>
                  <TableHead className="text-center">MTBF (h)</TableHead>
                  <TableHead className="text-center">MTTR (h)</TableHead>
                  <TableHead className="text-center">Availability (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats
                  .filter(stat => categoryFilter === "all" || categories.find(c => c.name === stat.categoryName)?._id === categoryFilter)
                  .map((stat) => (
                    <TableRow key={stat.typeId}>
                      <TableCell className="font-medium">{stat.typeName}</TableCell>
                      <TableCell>{stat.categoryName}</TableCell>
                      <TableCell className="text-center font-semibold">{stat.totalEquipment}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 bg-blue-500 rounded"></div>
                            <span>Online: {stat.byStatus.online}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                            <span>Maintenance: {stat.byStatus.maintenance}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 bg-red-500 rounded"></div>
                            <span>Breakdown: {stat.byStatus.breakdown}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 bg-gray-500 rounded"></div>
                            <span>Offline: {stat.byStatus.offline}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 bg-red-900 rounded"></div>
                            <span>Scrapped: {stat.byStatus.scrapped}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{stat.avgMtbf}</TableCell>
                      <TableCell className="text-center">{stat.avgMttr}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2">
                          <Progress value={stat.availability} className="w-16 h-2" />
                          <span className="text-sm font-medium">{stat.availability}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTypes.map((type) => (
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
        ))}
      </div>

      {filteredTypes.length === 0 && (
        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
          <CardContent className="p-12 text-center">
            <Wrench className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No equipment types found</h3>
            <p className="text-slate-600">
              {categoryFilter === "all"
                ? "Start by adding your first equipment type."
                : "No types found for the selected category. Try selecting a different category or add a new type."
              }
            </p>
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