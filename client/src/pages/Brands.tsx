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
  Tag,
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
  Wrench
} from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { useAuth } from "@/contexts/AuthContext"
import { useFactory } from "@/contexts/FactoryContext"
import { getBrandStatistics, createBrand, updateBrand, deleteBrand } from "@/api/brands"

interface BrandStatistics {
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

interface Brand {
  _id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  statistics?: BrandStatistics
}

export function Brands() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Brand | null>(null)
  const [form, setForm] = useState({
    name: "",
    description: ""
  })
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { user } = useAuth()
  const { currentFactory } = useFactory()

  useEffect(() => {
    fetchBrands()
  }, [currentFactory])

  const fetchBrands = async () => {
    try {
      setLoading(true)
      const response = await getBrandStatistics()
      setBrands(response.brands || [])
    } catch (error) {
      console.error('Error fetching brands:', error)
      toast({
        title: "Error",
        description: "Failed to load brands",
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

  const openEditDialog = (item: Brand) => {
    setEditingItem(item)
    setForm({ name: item.name, description: item.description || "" })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      if (editingItem) {
        await updateBrand(editingItem._id, form)
        toast({ title: "Updated", description: "Brand updated successfully" })
      } else {
        await createBrand(form)
        toast({ title: "Created", description: "Brand created successfully" })
      }
      setIsDialogOpen(false)
      fetchBrands()
    } catch (error) {
      console.error('Save brand error:', error)
      toast({ title: "Error", description: "Failed to save brand", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id)
      await deleteBrand(id)
      toast({ title: "Deleted", description: "Brand deleted successfully" })
      fetchBrands()
    } catch (error) {
      console.error('Delete brand error:', error)
      toast({ title: "Error", description: "Failed to delete brand", variant: "destructive" })
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
            Brands
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage equipment brands for your factory
          </p>
        </div>
        {(user?.role === 'admin' || user?.role === 'maintenance_manager') && (
          <Button onClick={openAddDialog} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Brand
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {brands.map((brand) => (
          <Card key={brand._id} className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Tag className="h-4 w-4 text-indigo-600" />
                  </div>
                  <CardTitle className="text-lg">{brand.name}</CardTitle>
                </div>
                {(user?.role === 'admin' || user?.role === 'maintenance_manager') && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(brand)} disabled={deletingId === brand._id}>
                      <Pencil className="h-4 w-4 text-slate-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(brand._id)} disabled={deletingId === brand._id}>
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
              {brand.description && (
                <CardDescription className="mt-2 text-xs line-clamp-2 min-h-[2.5em]">
                  {brand.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end">
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Total Equipment</p>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Tag className="h-3.5 w-3.5 text-slate-600" />
                    {brand.statistics?.totalEquipment || 0}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Availability</p>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Activity className={`h-3.5 w-3.5 ${(brand.statistics?.avgAvailability || 0) >= 90 ? 'text-green-500' :
                        (brand.statistics?.avgAvailability || 0) >= 70 ? 'text-orange-500' : 'text-red-500'
                      }`}
                    />
                    {brand.statistics?.avgAvailability ? `${brand.statistics.avgAvailability}%` : 'N/A'}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Avg MTBF</p>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="h-3.5 w-3.5 text-blue-500" />
                    {brand.statistics?.avgMtbf ? `${brand.statistics.avgMtbf}h` : 'N/A'}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Avg MTTR</p>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Wrench className="h-3.5 w-3.5 text-orange-500" />
                    {brand.statistics?.avgMttr ? `${brand.statistics.avgMttr}h` : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Status Mini Bar */}
              {(brand.statistics?.totalEquipment || 0) > 0 && (
                <div className="mt-4 flex h-1.5 w-full rounded-full overflow-hidden">
                  <div className="bg-green-500" style={{ width: `${(brand.statistics!.statusBreakdown.in_production / brand.statistics!.totalEquipment) * 100}%` }} title="In Production" />
                  <div className="bg-orange-400" style={{ width: `${(brand.statistics!.statusBreakdown.maintenance / brand.statistics!.totalEquipment) * 100}%` }} title="Maintenance" />
                  <div className="bg-red-500" style={{ width: `${(brand.statistics!.statusBreakdown.breakdown / brand.statistics!.totalEquipment) * 100}%` }} title="Breakdown" />
                  <div className="bg-slate-300" style={{ width: `${(brand.statistics!.statusBreakdown.offline / brand.statistics!.totalEquipment) * 100}%` }} title="Offline" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {brands.length === 0 && (
        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
          <CardContent className="p-12 text-center">
            <Tag className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No brands found</h3>
            <p className="text-slate-600">Start by adding your first equipment brand.</p>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Brand Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Brand' : 'Add Brand'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter brand name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Enter brand description" />
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

export default function BrandsPageWrapper() {
  return <Brands />
}