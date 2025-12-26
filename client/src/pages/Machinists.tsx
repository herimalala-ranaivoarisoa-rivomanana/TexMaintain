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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Pencil, Trash2, Search, UserCog } from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { useFactory } from "@/contexts/FactoryContext"
import { getMachinists, createMachinist, updateMachinist, deleteMachinist } from "@/api/machinists"
import type { Machinist, MachinistFormData } from "@/api/machinists"

export default function Machinists() {
  const [machinists, setMachinists] = useState<Machinist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMachinist, setEditingMachinist] = useState<Machinist | null>(null)
  const [formData, setFormData] = useState<MachinistFormData>({
    matricule: "",
    firstName: "",
    lastName: "",
    isActive: true
  })
  const { toast } = useToast()
  const { currentFactory } = useFactory()

  useEffect(() => {
    fetchMachinists()
  }, [searchQuery, currentFactory])

  const fetchMachinists = async () => {
    try {
      setIsLoading(true)
      const response = await getMachinists({ q: searchQuery, limit: 100 })
      setMachinists(response.machinists)
    } catch (error) {
      console.error("Failed to fetch machinists:", error)
      toast({
        title: "Error",
        description: "Failed to load machinists",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDialog = (machinist?: Machinist) => {
    if (machinist) {
      setEditingMachinist(machinist)
      setFormData({
        matricule: machinist.matricule,
        firstName: machinist.firstName,
        lastName: machinist.lastName,
        isActive: machinist.isActive
      })
    } else {
      setEditingMachinist(null)
      setFormData({
        matricule: "",
        firstName: "",
        lastName: "",
        isActive: true
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingMachinist(null)
    setFormData({
      matricule: "",
      firstName: "",
      lastName: "",
      isActive: true
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
      if (editingMachinist) {
        await updateMachinist(editingMachinist._id, formData)
        toast({
          title: "Success",
          description: "Machinist updated successfully"
        })
      } else {
        await createMachinist(formData)
        toast({
          title: "Success",
          description: "Machinist created successfully"
        })
      }
      handleCloseDialog()
      fetchMachinists()
    } catch (error: any) {
      console.error("Save machinist error:", error)
      const errorMessage = error.response?.data?.message || error.message || "Unknown error"
      toast({
        title: "Error",
        description: `Failed to save machinist: ${errorMessage}`,
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this machinist?")) {
      return
    }

    try {
      await deleteMachinist(id)
      toast({
        title: "Success",
        description: "Machinist deactivated successfully"
      })
      fetchMachinists()
    } catch (error: any) {
      console.error("Delete machinist error:", error)
      toast({
        title: "Error",
        description: "Failed to deactivate machinist",
        variant: "destructive"
      })
    }
  }

  const filteredMachinists = machinists

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <UserCog className="h-8 w-8 text-blue-600" />
            Machinists
          </h1>
          <p className="text-slate-500 mt-1">Manage production machinists</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-gradient-to-r from-blue-600 to-indigo-600">
          <Plus className="mr-2 h-4 w-4" />
          Add Machinist
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Machinists List</CardTitle>
          <CardDescription>View and manage all machinists</CardDescription>
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
          ) : filteredMachinists?.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No machinists found. Click "Add Machinist" to create one.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matricule</TableHead>
                    <TableHead>First Name</TableHead>
                    <TableHead>Last Name</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMachinists?.map((machinist) => (
                    <TableRow key={machinist._id}>
                      <TableCell className="font-medium">{machinist.matricule}</TableCell>
                      <TableCell>{machinist.firstName}</TableCell>
                      <TableCell>{machinist.lastName}</TableCell>
                      <TableCell className="font-semibold">{machinist.fullName}</TableCell>
                      <TableCell>
                        <Badge variant={machinist.isActive ? "default" : "secondary"}>
                          {machinist.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(machinist)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(machinist._id)}
                            disabled={!machinist.isActive}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMachinist ? "Edit Machinist" : "Add New Machinist"}
            </DialogTitle>
            <DialogDescription>
              {editingMachinist
                ? "Update the machinist information below"
                : "Enter the machinist information below"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="matricule">
                Matricule <span className="text-red-500">*</span>
              </Label>
              <Input
                id="matricule"
                value={formData.matricule}
                onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                placeholder="e.g., MAT001"
              />
            </div>
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
              {isSaving ? "Saving..." : editingMachinist ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
