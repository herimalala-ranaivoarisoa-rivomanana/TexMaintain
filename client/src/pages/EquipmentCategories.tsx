import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus,
  Pencil,
  Trash,
  Settings,
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
  Wrench
} from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { useAuth } from "@/contexts/AuthContext"
import { useFactory } from "@/contexts/FactoryContext"
import { getEquipmentCategoryStatistics, createEquipmentCategory, updateEquipmentCategory, deleteEquipmentCategory } from "@/api/equipmentCategories"

interface CategoryStatistics {
  totalEquipment: number
  avgMtbf: number
  avgMttr: number
  avgAvailability: number
  statusBreakdown: {
    in_production: number
    offline: number
    maintenance: number
    breakdown: number
    other: number
  }
}

interface Category {
  _id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  statistics?: CategoryStatistics
}

export function EquipmentCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Category | null>(null)
  const [form, setForm] = useState({
    name: "",
    description: ""
  })
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { user } = useAuth()
  const { currentFactory } = useFactory()

  useEffect(() => {
    fetchCategories()
  }, [currentFactory])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await getEquipmentCategoryStatistics()
      setCategories(response.categories || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const openAddDialog = () => {
    setEditingItem(null)
    setForm({ name: "", description: "" })
    setIsDialogOpen(true)
  }

  const openEditDialog = (item: Category) => {
    setEditingItem(item)
    setForm({ name: item.name, description: item.description || "" })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      if (editingItem) {
        await updateEquipmentCategory(editingItem._id, form)
        toast({ title: "Updated", description: "Category updated successfully" })
      } else {
        await createEquipmentCategory(form)
        toast({ title: "Created", description: "Category created successfully" })
      }
      setIsDialogOpen(false)
      fetchCategories()
    } catch (error) {
      console.error('Save category error:', error)
      toast({ title: "Error", description: "Failed to save category", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id)
      await deleteEquipmentCategory(id)
      toast({ title: "Deleted", description: "Category deleted successfully" })
      fetchCategories()
    } catch (error) {
      console.error('Delete category error:', error)
      toast({ title: "Error", description: "Failed to delete category", variant: "destructive" })
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
            Equipment Categories
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage equipment categories for your factory
          </p>
        </div>
        {(user?.role === 'admin' || user?.role === 'maintenance_manager') && (
          <Button onClick={openAddDialog} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {categories.map((category) => (
          <Card key={category._id} className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Settings className="h-4 w-4 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                </div>
                {(user?.role === 'admin' || user?.role === 'maintenance_manager') && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(category)} disabled={deletingId === category._id}>
                      <Pencil className="h-4 w-4 text-slate-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(category._id)} disabled={deletingId === category._id}>
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
              {category.description && (
                <CardDescription className="mt-2 text-xs line-clamp-2 min-h-[2.5em]">
                  {category.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end">
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Total Equipment</p>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Settings className="h-3.5 w-3.5 text-slate-600" />
                    {category.statistics?.totalEquipment || 0}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Availability</p>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Activity className={`h-3.5 w-3.5 ${(category.statistics?.avgAvailability || 0) >= 90 ? 'text-green-500' :
                        (category.statistics?.avgAvailability || 0) >= 70 ? 'text-orange-500' : 'text-red-500'
                      }`}
                    />
                    {category.statistics?.avgAvailability ? `${category.statistics.avgAvailability}%` : 'N/A'}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Avg MTBF</p>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="h-3.5 w-3.5 text-blue-500" />
                    {category.statistics?.avgMtbf ? `${category.statistics.avgMtbf}h` : 'N/A'}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Avg MTTR</p>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Wrench className="h-3.5 w-3.5 text-orange-500" />
                    {category.statistics?.avgMttr ? `${category.statistics.avgMttr}h` : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Status Mini Bar */}
              {(category.statistics?.totalEquipment || 0) > 0 && (
                <div className="mt-4 flex h-1.5 w-full rounded-full overflow-hidden">
                  <div className="bg-green-500" style={{ width: `${(category.statistics!.statusBreakdown.in_production / category.statistics!.totalEquipment) * 100}%` }} title="In Production" />
                  <div className="bg-orange-400" style={{ width: `${(category.statistics!.statusBreakdown.maintenance / category.statistics!.totalEquipment) * 100}%` }} title="Maintenance" />
                  <div className="bg-red-500" style={{ width: `${(category.statistics!.statusBreakdown.breakdown / category.statistics!.totalEquipment) * 100}%` }} title="Breakdown" />
                  <div className="bg-slate-300" style={{ width: `${(category.statistics!.statusBreakdown.offline / category.statistics!.totalEquipment) * 100}%` }} title="Offline" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.length === 0 && (
        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
          <CardContent className="p-12 text-center">
            <Settings className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No categories found</h3>
            <p className="text-slate-600">Start by adding your first equipment category.</p>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Category Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter category name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Enter category description" />
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

export default function EquipmentCategoriesPageWrapper() {
  return <EquipmentCategories />
}