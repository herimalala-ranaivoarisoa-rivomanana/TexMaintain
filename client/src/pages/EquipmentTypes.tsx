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

export function EquipmentTypes() {
  const [types, setTypes] = useState<EquipmentType[]>([])
  const [categories, setCategories] = useState<Category[]>([])
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
      const [typesResponse, categoriesResponse] = await Promise.all([
        getEquipmentTypes(),
        getEquipmentCategories()
      ])
      setTypes(typesResponse.types || [])
      setCategories(categoriesResponse.categories || [])
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