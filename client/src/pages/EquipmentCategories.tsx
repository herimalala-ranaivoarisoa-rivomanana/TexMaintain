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
  Settings
} from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { useAuth } from "@/contexts/AuthContext"
import { getEquipmentCategories, createEquipmentCategory, updateEquipmentCategory, deleteEquipmentCategory } from "@/api/equipmentCategories"

interface Category {
  _id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
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

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await getEquipmentCategories()
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <Card key={category._id} className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{category.name}</CardTitle>
                <Badge variant="outline">
                  <Settings className="h-3 w-3 mr-1" />
                  Category
                </Badge>
              </div>
              {category.description && (
                <CardDescription>{category.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-500 mb-4">
                Created: {new Date(category.createdAt).toLocaleDateString()}
              </div>
              {user?.role === 'admin' && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(category)} disabled={deletingId === category._id}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleDelete(category._id)} disabled={deletingId === category._id}>
                    <Trash className="mr-2 h-4 w-4" /> {deletingId === category._id ? 'Deleting...' : 'Delete'}
                  </Button>
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