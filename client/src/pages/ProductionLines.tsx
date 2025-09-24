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
  ArrowLeft,
  GripVertical,
  Factory,
  Wrench
} from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { getProductionLines, createProductionLine, updateProductionLine, deleteProductionLine } from "@/api/productionLines"
import { getProductionSections, createProductionSection, updateProductionSection, updateProductionSectionEquipment } from "@/api/productionSections"
import { getEquipment } from "@/api/equipment"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface ProductionLine {
  _id: string
  name: string
  description?: string
  status: string
  sections: Array<{
    sectionId: {
      _id: string
      name: string
      description?: string
      equipment: Array<{
        equipmentId: {
          _id: string
          category: { name: string }
          type: { name: string }
          status: string
        }
        order: number
      }>
    }
    order: number
  }>
  createdAt: string
  updatedAt: string
}

interface ProductionSection {
  _id: string
  name: string
  description?: string
  productionLine: string
  equipment: Array<{
    equipmentId: any
    order: number
  }>
  order: number
}



interface Equipment {
  _id: string
  name: string
  category: { name: string }
  type: { name: string }
  status: string
}

interface SortableEquipmentProps {
  id: string
  equipment: {
    equipmentId: {
      _id: string
      category: { name: string }
      type: { name: string }
      status: string
    }
  }
}

function SortableEquipment({ id, equipment }: SortableEquipmentProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = transform ? { transform: CSS.Transform.toString(transform), transition } : undefined

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'inactive': return 'bg-gray-500'
      case 'maintenance': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="flex items-center gap-2 p-2 bg-slate-50 rounded border cursor-grab">
      <GripVertical className="h-3 w-3 text-slate-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {equipment.equipmentId.category?.name} - {equipment.equipmentId.type?.name}
        </p>
      </div>
      <Badge className={`${getStatusColor(equipment.equipmentId.status)} text-white text-xs`}>
        {equipment.equipmentId.status}
      </Badge>
    </div>
  )
}

export function ProductionLines() {
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([])
  const [sections, setSections] = useState<ProductionSection[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLine, setSelectedLine] = useState<ProductionLine | null>(null)
  const [isLineDialogOpen, setIsLineDialogOpen] = useState(false)
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false)
  const [isEquipmentDialogOpen, setIsEquipmentDialogOpen] = useState(false)
  const [editingLine, setEditingLine] = useState<ProductionLine | null>(null)
  const [editingSection, setEditingSection] = useState<ProductionSection | null>(null)
  const [selectedSectionForEquipment, setSelectedSectionForEquipment] = useState<string | null>(null)
  const [lineForm, setLineForm] = useState({
    name: "",
    description: "",
    status: "active"
  })
  const [sectionForm, setSectionForm] = useState({
    name: "",
    description: "",
    productionLine: ""
  })
  const [equipmentForm, setEquipmentForm] = useState({
    equipmentId: "",
    order: 0
  })
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  )

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      console.log('Fetching production lines...')
      const [linesResponse, sectionsResponse, equipmentResponse] = await Promise.all([
        getProductionLines({ limit: 100 }),
        getProductionSections(),
        getEquipment({ limit: 100 })
      ])
      console.log('Lines response:', linesResponse)
      console.log('Sections response:', sectionsResponse)
      console.log('Equipment response:', equipmentResponse)
      const lines = (linesResponse as any).productionLines || []
      const sections = (sectionsResponse as any).sections || []
      const equipment = (equipmentResponse as any).equipment || []

      setProductionLines(lines)
      setSections(sections)
      setEquipment(equipment)

      // Update selectedLine with fresh data if it's currently selected
      if (selectedLine) {
        const updatedLine = lines.find((line: ProductionLine) => line._id === selectedLine._id)
        if (updatedLine) {
          setSelectedLine(updatedLine)
        }
      }

      console.log('Data loaded successfully')
    } catch (error) {
      console.error('Error fetching data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast({
        title: "Error",
        description: `Failed to load production lines: ${errorMessage}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const openLineDialog = (line?: ProductionLine) => {
    if (line) {
      setEditingLine(line)
      setLineForm({
        name: line.name,
        description: line.description || "",
        status: line.status
      })
    } else {
      setEditingLine(null)
      setLineForm({ name: "", description: "", status: "active" })
    }
    setIsLineDialogOpen(true)
  }

  const openSectionDialog = (lineId: string, section?: ProductionSection) => {
    console.log('Opening section dialog for line:', lineId, 'section:', section)
    if (section) {
      setEditingSection(section)
      setSectionForm({
        name: section.name,
        description: section.description || "",
        productionLine: section.productionLine
      })
    } else {
      setEditingSection(null)
      setSectionForm({
        name: "",
        description: "",
        productionLine: lineId
      })
    }
    setIsSectionDialogOpen(true)
  }

  const openEquipmentDialog = (sectionId: string) => {
    console.log('Opening equipment dialog for section:', sectionId)
    console.log('Equipment available:', equipment.length)
    setSelectedSectionForEquipment(sectionId)
    setEquipmentForm({
      equipmentId: "",
      order: 0
    })
    setIsEquipmentDialogOpen(true)
    console.log('Dialog should be open now')
  }

  const handleSaveLine = async () => {
    try {
      setIsSaving(true)
      if (editingLine) {
        await updateProductionLine(editingLine._id, lineForm)
        toast({ title: "Updated", description: "Production line updated successfully" })
      } else {
        await createProductionLine(lineForm)
        toast({ title: "Created", description: "Production line created successfully" })
      }
      setIsLineDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Save line error:', error)
      toast({ title: "Error", description: "Failed to save production line", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveSection = async () => {
    try {
      setIsSaving(true)
      console.log('Saving section with form:', sectionForm)
      if (editingSection) {
        await updateProductionSection(editingSection._id, sectionForm)
        toast({ title: "Updated", description: "Section updated successfully" })
      } else {
        const result = await createProductionSection(sectionForm)
        console.log('Section created:', result)
        toast({ title: "Created", description: "Section created successfully" })
      }
      setIsSectionDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Save section error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast({ title: "Error", description: `Failed to save section: ${errorMessage}`, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveEquipment = async () => {
    try {
      setIsSaving(true)
      console.log('Saving equipment to section:', selectedSectionForEquipment, 'with form:', equipmentForm)
      if (selectedSectionForEquipment) {
        // Find the current section to get existing equipment
        const currentSection = sections.find(s => s._id === selectedSectionForEquipment)
        if (currentSection) {
          // Create the full equipment array: existing + new
          const updatedEquipment = [
            ...currentSection.equipment.map(eq => ({
              equipmentId: eq.equipmentId._id,
              order: eq.order
            })),
            {
              equipmentId: equipmentForm.equipmentId,
              order: equipmentForm.order
            }
          ]
          await updateProductionSectionEquipment(selectedSectionForEquipment, updatedEquipment)
          toast({ title: "Added", description: "Equipment added to section successfully" })
        } else {
          throw new Error('Section not found')
        }
      }
      setIsEquipmentDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Save equipment error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast({ title: "Error", description: `Failed to add equipment: ${errorMessage}`, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteLine = async (id: string) => {
    try {
      await deleteProductionLine(id)
      toast({ title: "Deleted", description: "Production line deleted successfully" })
      fetchData()
    } catch (error) {
      console.error('Delete line error:', error)
      toast({ title: "Error", description: "Failed to delete production line", variant: "destructive" })
    }
  }


  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    console.log('Drag end:', active.id, over?.id)

    if (!over || active.id === over.id) return

    const activeId = active.id as string
    const overId = over.id as string

    console.log('Processing drag:', activeId, overId)

    // Section reordering removed for now to avoid complexity

    // Handle equipment reordering within section or moving between sections
    if (activeId.startsWith('equipment-')) {
      const [sectionId, equipmentId] = activeId.replace('equipment-', '').split('-')

      if (overId.startsWith('equipment-')) {
        const [overSectionId, overEquipmentId] = overId.replace('equipment-', '').split('-')

        if (sectionId === overSectionId) {
          // Reorder within section
          const section = sections.find(s => s._id === sectionId)
          if (section) {
            const oldIndex = section.equipment.findIndex(e => e.equipmentId._id === equipmentId)
            const newIndex = section.equipment.findIndex(e => e.equipmentId._id === overEquipmentId)

            if (oldIndex !== -1 && newIndex !== -1) {
              const newEquipment = arrayMove(section.equipment, oldIndex, newIndex).map((eq, index) => ({ ...eq, order: index }))
              const updatedEquipment = newEquipment.map((eq, index) => ({
                equipmentId: eq.equipmentId._id,
                order: index
              }))

              try {
                await updateProductionSectionEquipment(sectionId, updatedEquipment)
                setSections(sections.map(s => s._id === sectionId ? { ...s, equipment: newEquipment } : s))
                setSelectedLine(prev => prev ? { ...prev, sections: prev.sections.map(s => s.sectionId._id === sectionId ? { ...s, sectionId: { ...s.sectionId, equipment: newEquipment } } : s) } : null)
                toast({ title: "Updated", description: "Equipment order updated successfully" })
              } catch (error) {
                toast({ title: "Error", description: "Failed to update equipment order", variant: "destructive" })
              }
            }
          }
        }
      } else if (overId.startsWith('section-')) {
        // Move equipment to another section
        const overSectionId = overId.replace('section-', '')
        if (sectionId !== overSectionId) {
          const currentSection = sections.find(s => s._id === sectionId)
          const overSection = sections.find(s => s._id === overSectionId)
          const equipmentToMove = currentSection?.equipment.find(e => e.equipmentId._id === equipmentId)

          if (currentSection && overSection && equipmentToMove) {
            // Remove from current section and update orders
            const updatedCurrent = currentSection.equipment.filter(e => e.equipmentId._id !== equipmentId).map((e, idx) => ({ ...e, order: idx }))
            // Remove from over section if already there, add to over section, update orders
            const updatedOver = overSection.equipment.filter(e => e.equipmentId._id !== equipmentId)
            updatedOver.push({ ...equipmentToMove, order: updatedOver.length })
            const updatedOverOrdered = updatedOver.map((e, idx) => ({ ...e, order: idx }))

            try {
              await Promise.all([
                updateProductionSectionEquipment(sectionId, updatedCurrent.map(e => ({ equipmentId: e.equipmentId._id, order: e.order }))),
                updateProductionSectionEquipment(overSectionId, updatedOverOrdered.map(e => ({ equipmentId: e.equipmentId._id, order: e.order })))
              ])
              setSections(sections.map(s =>
                s._id === sectionId ? { ...s, equipment: updatedCurrent } :
                s._id === overSectionId ? { ...s, equipment: updatedOverOrdered } :
                s
              ))
              setSelectedLine(prev => prev ? { ...prev, sections: prev.sections.map(s =>
                s.sectionId._id === sectionId ? { ...s, sectionId: { ...s.sectionId, equipment: updatedCurrent } } :
                s.sectionId._id === overSectionId ? { ...s, sectionId: { ...s.sectionId, equipment: updatedOverOrdered } } :
                s
              ) } : null)
              toast({ title: "Moved", description: "Equipment moved to another section successfully" })
            } catch (error) {
              toast({ title: "Error", description: "Failed to move equipment", variant: "destructive" })
            }
          }
        }
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'inactive': return 'bg-gray-500'
      case 'maintenance': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (selectedLine) {
    console.log('Rendering selected line:', selectedLine.name, 'sections:', selectedLine.sections)
    const sortedSections = [...selectedLine.sections].sort((a, b) => a.order - b.order)

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setSelectedLine(null)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Lines
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {selectedLine.name}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Production line layout and equipment management
            </p>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedSections.map((sectionWrapper) => {
              const section = sectionWrapper.sectionId
              const sortedEquipment = [...section.equipment].sort((a, b) => a.order - b.order)

              return (
                <Card key={`section-${section._id}`} id={`section-${section._id}`} className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center">
                        {section.name}
                      </CardTitle>
                      <Badge variant="outline">
                        <Factory className="h-3 w-3 mr-1" />
                        Section
                      </Badge>
                    </div>
                    {section.description && (
                      <CardDescription>{section.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex justify-end mb-3">
                      <Button variant="outline" size="sm" onClick={() => { console.log('Button clicked, section:', section._id); openEquipmentDialog(section._id); }} className="bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100">
                        <Wrench className="mr-2 h-3 w-3" />
                        Add Equipment
                      </Button>
                    </div>
                    <SortableContext items={sortedEquipment.map(e => `equipment-${section._id}-${e.equipmentId._id}`)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {sortedEquipment.map((equipmentWrapper) => (
                          <SortableEquipment
                            key={`equipment-${section._id}-${equipmentWrapper.equipmentId._id}`}
                            id={`equipment-${section._id}-${equipmentWrapper.equipmentId._id}`}
                            equipment={equipmentWrapper}
                          />
                        ))}
                        {sortedEquipment.length === 0 && (
                          <p className="text-sm text-slate-500 text-center py-2">No equipment assigned</p>
                        )}
                      </div>
                    </SortableContext>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </DndContext>

      {/* Add Section Button */}
        <div className="flex justify-center">
          <Button onClick={() => { console.log('Add Section button clicked for line:', selectedLine._id); openSectionDialog(selectedLine._id); }} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
        </div>

        {/* Add/Edit Section Dialog */}
        <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
          <DialogContent className="sm:max-w-[500px] bg-white">
            <DialogHeader>
              <DialogTitle>{editingSection ? 'Edit Section' : 'Add Section'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="sectionName">Name</Label>
                <Input id="sectionName" value={sectionForm.name} onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })} placeholder="Enter section name" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sectionDescription">Description (Optional)</Label>
                <Textarea id="sectionDescription" value={sectionForm.description} onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })} placeholder="Enter section description" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSectionDialogOpen(false)} disabled={isSaving}>Cancel</Button>
              <Button onClick={handleSaveSection} className="bg-gradient-to-r from-blue-600 to-indigo-600" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
  
        {/* Add Equipment Dialog */}
        <Dialog open={isEquipmentDialogOpen} onOpenChange={setIsEquipmentDialogOpen}>
          <DialogContent className="sm:max-w-[500px] bg-white">
            <DialogHeader>
              <DialogTitle>Add Equipment to Section</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="equipmentSelect">Select Equipment</Label>
                <Select value={equipmentForm.equipmentId} onValueChange={(value) => setEquipmentForm({ ...equipmentForm, equipmentId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose equipment to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipment.map((eq) => (
                      <SelectItem key={eq._id} value={eq._id}>
                        {eq.category?.name} - {eq.type?.name} ({eq.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="order">Order</Label>
                <Input
                  id="order"
                  type="number"
                  value={equipmentForm.order}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, order: parseInt(e.target.value) || 0 })}
                  placeholder="Enter order position"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEquipmentDialogOpen(false)} disabled={isSaving}>Cancel</Button>
              <Button onClick={handleSaveEquipment} className="bg-gradient-to-r from-blue-600 to-indigo-600" disabled={isSaving || !equipmentForm.equipmentId}>
                {isSaving ? 'Adding...' : 'Add Equipment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Production Lines
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage production lines and their layouts
          </p>
        </div>
        {/* Temporarily allow all users to create lines for testing */}
        <Button onClick={() => openLineDialog()} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Production Line
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {productionLines.map((line) => (
          <Card key={line._id} className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => { console.log('Line clicked:', line._id); setSelectedLine(line); }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{line.name}</CardTitle>
                <Badge className={`${getStatusColor(line.status)} text-white`}>
                  {line.status}
                </Badge>
              </div>
              {line.description && (
                <CardDescription>{line.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>{line.sections.length} sections</span>
                <span>{line.sections.reduce((total, section) => total + section.sectionId.equipment.length, 0)} equipment</span>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); openLineDialog(line) }}>
                  Edit
                </Button>
                <Button variant="destructive" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); handleDeleteLine(line._id) }}>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {productionLines.length === 0 && (
        <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
          <CardContent className="p-12 text-center">
            <Factory className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No production lines found</h3>
            <p className="text-slate-600">Start by adding your first production line.</p>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Production Line Dialog */}
      <Dialog open={isLineDialogOpen} onOpenChange={setIsLineDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle>{editingLine ? 'Edit Production Line' : 'Add Production Line'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={lineForm.name} onChange={(e) => setLineForm({ ...lineForm, name: e.target.value })} placeholder="Enter line name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" value={lineForm.description} onChange={(e) => setLineForm({ ...lineForm, description: e.target.value })} placeholder="Enter line description" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={lineForm.status} onValueChange={(value) => setLineForm({ ...lineForm, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLineDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSaveLine} className="bg-gradient-to-r from-blue-600 to-indigo-600" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ProductionLinesPageWrapper() {
  return <ProductionLines />
}