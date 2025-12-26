import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Pencil, Trash2, Search, HardHat, X } from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { useFactory } from "@/contexts/FactoryContext"
import { getMaintenanceWorkers, createMaintenanceWorker, updateMaintenanceWorker, deleteMaintenanceWorker } from "@/api/maintenanceWorkers"
import type { MaintenanceWorker, MaintenanceWorkerFormData } from "@/api/maintenanceWorkers"

const SPECIALIZATIONS = [
  'Cleaning',
  'Painting',
  'General Repairs',
  'Facility Maintenance',
  'Grounds Keeping',
  'Other'
]

export default function MaintenanceWorkers() {
  const [workers, setWorkers] = useState<MaintenanceWorker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingWorker, setEditingWorker] = useState<MaintenanceWorker | null>(null)
  const [formData, setFormData] = useState<MaintenanceWorkerFormData>({
    matricule: "",
    firstName: "",
    lastName: "",
    specialization: "General Repairs",
    certifications: [],
    isActive: true
  })
  const [newCertification, setNewCertification] = useState("")
  const { toast } = useToast()
  const { currentFactory } = useFactory()

  useEffect(() => {
    fetchWorkers()
  }, [searchQuery, currentFactory])

  const fetchWorkers = async () => {
    try {
      setIsLoading(true)
      const response = await getMaintenanceWorkers({ q: searchQuery, limit: 100 })
      setWorkers(response.workers)
    } catch (error) {
      console.error("Failed to fetch maintenance workers:", error)
      toast({
        title: "Error",
        description: "Failed to load maintenance workers",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDialog = (worker?: MaintenanceWorker) => {
    if (worker) {
      setEditingWorker(worker)
      setFormData({
        matricule: worker.matricule,
        firstName: worker.firstName,
        lastName: worker.lastName,
        specialization: worker.specialization,
        certifications: worker.certifications || [],
        isActive: worker.isActive
      })
    } else {
      setEditingWorker(null)
      setFormData({
        matricule: "",
        firstName: "",
        lastName: "",
        specialization: "General Repairs",
        certifications: [],
        isActive: true
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingWorker(null)
    setNewCertification("")
    setFormData({
      matricule: "",
      firstName: "",
      lastName: "",
      specialization: "General Repairs",
      certifications: [],
      isActive: true
    })
  }

  const handleAddCertification = () => {
    if (newCertification.trim()) {
      setFormData({
        ...formData,
        certifications: [...(formData.certifications || []), newCertification.trim()]
      })
      setNewCertification("")
    }
  }

  const handleRemoveCertification = (index: number) => {
    setFormData({
      ...formData,
      certifications: formData.certifications?.filter((_, i) => i !== index) || []
    })
  }

  const handleSave = async () => {
    if (!formData.matricule || !formData.firstName || !formData.lastName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSaving(true)
      if (editingWorker) {
        await updateMaintenanceWorker(editingWorker._id, formData)
        toast({
          title: "Success",
          description: "Maintenance worker updated successfully"
        })
      } else {
        await createMaintenanceWorker(formData)
        toast({
          title: "Success",
          description: "Maintenance worker created successfully"
        })
      }
      handleCloseDialog()
      fetchWorkers()
    } catch (error: any) {
      console.error("Save maintenance worker error:", error)
      const errorMessage = error.response?.data?.message || error.message || "Unknown error"
      toast({
        title: "Error",
        description: `Failed to save maintenance worker: ${errorMessage}`,
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this maintenance worker?")) {
      return
    }

    try {
      await deleteMaintenanceWorker(id)
      toast({
        title: "Success",
        description: "Maintenance worker deactivated successfully"
      })
      fetchWorkers()
    } catch (error: any) {
      console.error("Delete maintenance worker error:", error)
      toast({
        title: "Error",
        description: "Failed to deactivate maintenance worker",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <HardHat className="h-8 w-8 text-green-600" />
            General Maintenance Workers
          </h1>
          <p className="text-slate-500 mt-1">Manage general maintenance workers</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-gradient-to-r from-green-600 to-emerald-600">
          <Plus className="mr-2 h-4 w-4" />
          Add Worker
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Maintenance Workers List</CardTitle>
          <CardDescription>View and manage all maintenance workers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name or matricule..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : workers?.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No maintenance workers found. Click "Add Worker" to create one.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matricule</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Certifications</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workers?.map((worker) => (
                    <TableRow key={worker._id}>
                      <TableCell className="font-medium">{worker.matricule}</TableCell>
                      <TableCell className="font-semibold">{worker.fullName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{worker.specialization}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {worker.certifications?.length > 0 ? (
                            worker.certifications.map((cert, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {cert}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-slate-400 text-sm">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={worker.isActive ? "default" : "secondary"}>
                          {worker.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(worker)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(worker._id)}
                            disabled={!worker.isActive}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingWorker ? "Edit Maintenance Worker" : "Add New Maintenance Worker"}
            </DialogTitle>
            <DialogDescription>
              {editingWorker
                ? "Update the maintenance worker information below"
                : "Enter the maintenance worker information below"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="matricule">
                  Matricule <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="matricule"
                  value={formData.matricule}
                  onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                  placeholder="e.g., WORK001"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Select
                  value={formData.specialization}
                  onValueChange={(value) => setFormData({ ...formData, specialization: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALIZATIONS.map((spec) => (
                      <SelectItem key={spec} value={spec}>
                        {spec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="e.g., John"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="e.g., Doe"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Certifications</Label>
              <div className="flex gap-2">
                <Input
                  value={newCertification}
                  onChange={(e) => setNewCertification(e.target.value)}
                  placeholder="Add certification..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCertification()}
                />
                <Button type="button" onClick={handleAddCertification} variant="outline">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.certifications?.map((cert, idx) => (
                  <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                    {cert}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleRemoveCertification(idx)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-green-600 to-emerald-600">
              {isSaving ? "Saving..." : editingWorker ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
