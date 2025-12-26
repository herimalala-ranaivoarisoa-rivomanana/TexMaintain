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
import { Plus, Pencil, Trash2, Search, Wrench, X } from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { useFactory } from "@/contexts/FactoryContext"
import { getMechanics, createMechanic, updateMechanic, deleteMechanic } from "@/api/mechanics"
import type { Mechanic, MechanicFormData } from "@/api/mechanics"

const SPECIALIZATIONS = [
  'General Mechanics',
  'Hydraulics',
  'Pneumatics',
  'Welding',
  'Fabrication',
  'Other'
]

export default function Mechanics() {
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMechanic, setEditingMechanic] = useState<Mechanic | null>(null)
  const [formData, setFormData] = useState<MechanicFormData>({
    matricule: "",
    firstName: "",
    lastName: "",
    specialization: "General Mechanics",
    certifications: [],
    isActive: true
  })
  const [newCertification, setNewCertification] = useState("")
  const { toast } = useToast()
  const { currentFactory } = useFactory()

  useEffect(() => {
    fetchMechanics()
  }, [searchQuery, currentFactory])

  const fetchMechanics = async () => {
    try {
      setIsLoading(true)
      const response = await getMechanics({ q: searchQuery, limit: 100 })
      setMechanics(response.mechanics)
    } catch (error) {
      console.error("Failed to fetch mechanics:", error)
      toast({
        title: "Error",
        description: "Failed to load mechanics",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDialog = (mechanic?: Mechanic) => {
    if (mechanic) {
      setEditingMechanic(mechanic)
      setFormData({
        matricule: mechanic.matricule,
        firstName: mechanic.firstName,
        lastName: mechanic.lastName,
        specialization: mechanic.specialization,
        certifications: mechanic.certifications || [],
        isActive: mechanic.isActive
      })
    } else {
      setEditingMechanic(null)
      setFormData({
        matricule: "",
        firstName: "",
        lastName: "",
        specialization: "General Mechanics",
        certifications: [],
        isActive: true
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingMechanic(null)
    setNewCertification("")
    setFormData({
      matricule: "",
      firstName: "",
      lastName: "",
      specialization: "General Mechanics",
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
      if (editingMechanic) {
        await updateMechanic(editingMechanic._id, formData)
        toast({
          title: "Success",
          description: "Mechanic updated successfully"
        })
      } else {
        await createMechanic(formData)
        toast({
          title: "Success",
          description: "Mechanic created successfully"
        })
      }
      handleCloseDialog()
      fetchMechanics()
    } catch (error: any) {
      console.error("Save mechanic error:", error)
      const errorMessage = error.response?.data?.message || error.message || "Unknown error"
      toast({
        title: "Error",
        description: `Failed to save mechanic: ${errorMessage}`,
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this mechanic?")) {
      return
    }

    try {
      await deleteMechanic(id)
      toast({
        title: "Success",
        description: "Mechanic deactivated successfully"
      })
      fetchMechanics()
    } catch (error: any) {
      console.error("Delete mechanic error:", error)
      toast({
        title: "Error",
        description: "Failed to deactivate mechanic",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-8 w-8 text-blue-600" />
            Mechanics
          </h1>
          <p className="text-slate-500 mt-1">Manage maintenance mechanics</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-gradient-to-r from-blue-600 to-indigo-600">
          <Plus className="mr-2 h-4 w-4" />
          Add Mechanic
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mechanics List</CardTitle>
          <CardDescription>View and manage all mechanics</CardDescription>
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
          ) : mechanics?.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No mechanics found. Click "Add Mechanic" to create one.
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
                  {mechanics?.map((mechanic) => (
                    <TableRow key={mechanic._id}>
                      <TableCell className="font-medium">{mechanic.matricule}</TableCell>
                      <TableCell className="font-semibold">{mechanic.fullName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{mechanic.specialization}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {mechanic.certifications?.length > 0 ? (
                            mechanic.certifications.map((cert, idx) => (
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
                        <Badge variant={mechanic.isActive ? "default" : "secondary"}>
                          {mechanic.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(mechanic)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(mechanic._id)}
                            disabled={!mechanic.isActive}
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
              {editingMechanic ? "Edit Mechanic" : "Add New Mechanic"}
            </DialogTitle>
            <DialogDescription>
              {editingMechanic
                ? "Update the mechanic information below"
                : "Enter the mechanic information below"}
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
                  placeholder="e.g., MEC001"
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
            <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-blue-600 to-indigo-600">
              {isSaving ? "Saving..." : editingMechanic ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
