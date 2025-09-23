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
  Factory
} from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { getProductionLines, createProductionLine, updateProductionLine, deleteProductionLine, updateProductionLineSections } from "@/api/productionLines"
import { getProductionSections, createProductionSection, updateProductionSection, updateProductionSectionEquipment } from "@/api/productionSections"
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
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
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


function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  )
}

export function ProductionLines() {
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([])
  const [sections, setSections] = useState<ProductionSection[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLine, setSelectedLine] = useState<ProductionLine | null>(null)
  const [isLineDialogOpen, setIsLineDialogOpen] = useState(false)
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false)
  const [editingLine, setEditingLine] = useState<ProductionLine | null>(null)
  const [editingSection, setEditingSection] = useState<ProductionSection | null>(null)
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
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      console.log('Fetching production lines...')
      const [linesResponse, sectionsResponse] = await Promise.all([
        getProductionLines({ limit: 100 }),
        getProductionSections()
      ])
      console.log('Lines response:', linesResponse)
      console.log('Sections response:', sectionsResponse)
      setProductionLines((linesResponse as any).productionLines || [])
      setSections((sectionsResponse as any).sections || [])
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
      if (editingSection) {
        await updateProductionSection(editingSection._id, sectionForm)
        toast({ title: "Updated", description: "Section updated successfully" })
      } else {
        await createProductionSection(sectionForm)
        toast({ title: "Created", description: "Section created successfully" })
      }
      setIsSectionDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Save section error:', error)
      toast({ title: "Error", description: "Failed to save section", variant: "destructive" })
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

    if (!over || active.id === over.id) return

    const activeId = active.id as string
    const overId = over.id as string

    // Handle section reordering within production line
    if (selectedLine && activeId.startsWith('section-') && overId.startsWith('section-')) {
      const oldIndex = selectedLine.sections.findIndex(s => s.sectionId._id === activeId.replace('section-', ''))
      const newIndex = selectedLine.sections.findIndex(s => s.sectionId._id === overId.replace('section-', ''))

      if (oldIndex !== -1 && newIndex !== -1) {
        const newSections = arrayMove(selectedLine.sections, oldIndex, newIndex)
        const updatedSections = newSections.map((section, index) => ({
          sectionId: section.sectionId._id,
          order: index
        }))

        try {
          await updateProductionLineSections(selectedLine._id, updatedSections)
          setSelectedLine({ ...selectedLine, sections: newSections })
          toast({ title: "Updated", description: "Section order updated successfully" })
        } catch (error) {
          toast({ title: "Error", description: "Failed to update section order", variant: "destructive" })
        }
      }
    }

    // Handle equipment reordering within section
    if (activeId.startsWith('equipment-') && overId.startsWith('equipment-')) {
      const [sectionId, equipmentId] = activeId.replace('equipment-', '').split('-')
      const [overSectionId, overEquipmentId] = overId.replace('equipment-', '').split('-')

      if (sectionId === overSectionId) {
        const section = sections.find(s => s._id === sectionId)
        if (section) {
          const oldIndex = section.equipment.findIndex(e => e.equipmentId._id === equipmentId)
          const newIndex = section.equipment.findIndex(e => e.equipmentId._id === overEquipmentId)

          if (oldIndex !== -1 && newIndex !== -1) {
            const newEquipment = arrayMove(section.equipment, oldIndex, newIndex)
            const updatedEquipment = newEquipment.map((eq, index) => ({
              equipmentId: eq.equipmentId._id,
              order: index
            }))

            try {
              await updateProductionSectionEquipment(sectionId, updatedEquipment)
              setSections(sections.map(s => s._id === sectionId ? { ...s, equipment: newEquipment } : s))
              toast({ title: "Updated", description: "Equipment order updated successfully" })
            } catch (error) {
              toast({ title: "Error", description: "Failed to update equipment order", variant: "destructive" })
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
            <SortableContext items={sortedSections.map(s => `section-${s.sectionId._id}`)} strategy={verticalListSortingStrategy}>
              {sortedSections.map((sectionWrapper) => {
                const section = sectionWrapper.sectionId
                const sortedEquipment = [...section.equipment].sort((a, b) => a.order - b.order)

                return (
                  <SortableItem key={`section-${section._id}`} id={`section-${section._id}`}>
                    <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center">
                            <GripVertical className="mr-2 h-4 w-4 text-slate-400" />
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
                        <SortableContext items={sortedEquipment.map(e => `equipment-${section._id}-${e.equipmentId._id}`)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-2">
                            {sortedEquipment.map((equipmentWrapper) => {
                              const eq = equipmentWrapper.equipmentId
                              return (
                                <SortableItem key={`equipment-${section._id}-${eq._id}`} id={`equipment-${section._id}-${eq._id}`}>
                                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded border">
                                    <GripVertical className="h-3 w-3 text-slate-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">
                                        {eq.category?.name} - {eq.type?.name}
                                      </p>
                                    </div>
                                    <Badge className={`${getStatusColor(eq.status)} text-white text-xs`}>
                                      {eq.status}
                                    </Badge>
                                  </div>
                                </SortableItem>
                              )
                            })}
                            {sortedEquipment.length === 0 && (
                              <p className="text-sm text-slate-500 text-center py-2">No equipment assigned</p>
                            )}
                          </div>
                        </SortableContext>
                      </CardContent>
                    </Card>
                  </SortableItem>
                )
              })}
            </SortableContext>
          </div>
        </DndContext>

        {/* Add Section Button */}
        <div className="flex justify-center">
          <Button onClick={() => openSectionDialog(selectedLine._id)} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
        </div>
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
          <Card key={line._id} className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => setSelectedLine(line)}>
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
    </div>
  )
}

export default function ProductionLinesPageWrapper() {
  return <ProductionLines />
}