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
  Wrench,
  Trash,
  AlertTriangle,
  Package
} from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { useAuth } from "@/contexts/AuthContext"
import { getProductionLines, createProductionLine, updateProductionLine, deleteProductionLine } from "@/api/productionLines"
import { getProductionSections, createProductionSection, updateProductionSection, updateProductionSectionEquipment } from "@/api/productionSections"
import { getEquipment, updateEquipment, changeEquipmentStatus } from "@/api/equipment"
import { getMachinists } from "@/api/machinists"
import { getMechanics } from "@/api/mechanics"
import { getElectricians } from "@/api/electricians"
import { getMaintenanceWorkers } from "@/api/maintenanceWorkers"
import { uploadBreakdownMedia } from "@/api/breakdownMedia"
import { EQUIPMENT_STATUSES, getStatusColor as getEquipmentStatusColor, getStatusLabel } from "@/types/equipment"
import type { EquipmentStatus } from "@/types/equipment"
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
          location: string
          model?: string
          brand?: string | { _id: string, name: string }
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
  name?: string
  category: { name: string }
  type: { name: string }
  status: string
  location: string
  model?: string
  brand?: string | { _id: string, name: string }
  lastBreakdownType?: string
  lastBreakdownDescription?: string
}

interface SortableEquipmentProps {
  id: string
  equipment: {
    equipmentId: {
      _id: string
      category: { name: string }
      type: { name: string }
      status: string
      location: string
      model?: string
      brand?: string | { _id: string, name: string }
    }
  }
  onDelete: () => void
  onStatusClick: () => void
}

function SortableEquipment({ id, equipment, onDelete, onStatusClick }: SortableEquipmentProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = transform ? { transform: CSS.Transform.toString(transform), transition } : undefined

  const eq = equipment.equipmentId

  // Build equipment name: Brand Model or Category Type
  const equipmentName = eq.brand && eq.model
    ? `${typeof eq.brand === 'object' ? (eq.brand as any).name : eq.brand} ${eq.model}`
    : `${eq.category?.name} ${eq.type?.name}`

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative flex items-center gap-2 px-3 py-2.5 bg-white rounded-md border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
    >
      {/* Status Badge - Top Right Corner - Clickable */}
      <Badge
        className={`absolute -top-2 -right-2 ${getEquipmentStatusColor(eq.status as EquipmentStatus)} text-white text-[9px] px-2 py-0.5 shadow-md border border-white cursor-pointer hover:scale-110 transition-transform`}
        onClick={(e) => {
          e.stopPropagation();
          onStatusClick();
        }}
      >
        {getStatusLabel(eq.status as EquipmentStatus)}
      </Badge>

      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing flex-shrink-0"
      >
        <GripVertical className="h-3.5 w-3.5 text-slate-400" />
      </div>

      <div className="flex-1 min-w-0 pr-2">
        <p className="text-sm font-semibold text-slate-900">
          {equipmentName}
        </p>
        <p className="text-xs text-slate-500">
          {eq.type?.name}
        </p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="absolute top-1/2 -translate-y-1/2 right-1 h-6 w-6 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash className="h-3 w-3" />
      </Button>
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
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [selectedEquipmentForStatus, setSelectedEquipmentForStatus] = useState<{ id: string, currentStatus: string } | null>(null)
  const [newStatus, setNewStatus] = useState<string>("")
  const [selectedMachinistId, setSelectedMachinistId] = useState<string>("")
  const [machinists, setMachinists] = useState<any[]>([])

  // Maintenance personnel states
  const [selectedMechanicId, setSelectedMechanicId] = useState<string>("")
  const [selectedElectricianId, setSelectedElectricianId] = useState<string>("")
  const [selectedMaintenanceWorkerId, setSelectedMaintenanceWorkerId] = useState<string>("")
  const [mechanics, setMechanics] = useState<any[]>([])
  const [electricians, setElectricians] = useState<any[]>([])
  const [maintenanceWorkers, setMaintenanceWorkers] = useState<any[]>([])

  // Breakdown information
  const [breakdownType, setBreakdownType] = useState('')
  const [breakdownDescription, setBreakdownDescription] = useState('')
  const [breakdownMedia, setBreakdownMedia] = useState<File[]>([])
  const [breakdownMediaPreviews, setBreakdownMediaPreviews] = useState<string[]>([])

  // Breakdown types (extensible list)
  const breakdownTypes = [
    { value: 'mechanical', label: 'Panne Mécanique', suggestedPersonnel: 'mechanic' },
    { value: 'electrical', label: 'Panne Électrique', suggestedPersonnel: 'electrician' },
    { value: 'hydraulic', label: 'Panne Hydraulique', suggestedPersonnel: 'mechanic' },
    { value: 'pneumatic', label: 'Panne Pneumatique', suggestedPersonnel: 'mechanic' },
    { value: 'electronic', label: 'Panne Électronique', suggestedPersonnel: 'electrician' },
    { value: 'software', label: 'Panne Logicielle', suggestedPersonnel: 'electrician' },
    { value: 'structural', label: 'Panne Structurelle', suggestedPersonnel: 'worker' },
    { value: 'other', label: 'Autre', suggestedPersonnel: null }
  ]

  const { toast } = useToast()
  const { user } = useAuth()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  )

  // Get available statuses based on user role
  const getAvailableStatuses = (): EquipmentStatus[] => {
    const productionRoles = ['production_manager', 'line_manager', 'foreman']
    const maintenanceRoles = ['admin', 'maintenance_manager', 'mechanic', 'electrician', 'general_maintenance_agent', 'assistant_maintenance_manager']

    if (!user) return []

    // Production roles can only change production statuses
    if (productionRoles.includes(user.role)) {
      return [
        EQUIPMENT_STATUSES.IN_PRODUCTION,
        EQUIPMENT_STATUSES.SETUP_ADJUSTMENT,
        EQUIPMENT_STATUSES.PAUSED_BY_OPERATOR,
        EQUIPMENT_STATUSES.CHANGEOVER,
        EQUIPMENT_STATUSES.BREAKDOWN,
        EQUIPMENT_STATUSES.OFFLINE
      ]
    }

    // Maintenance roles can change all statuses
    if (maintenanceRoles.includes(user.role)) {
      return Object.values(EQUIPMENT_STATUSES)
    }

    // Other roles have no permission
    return []
  }

  useEffect(() => {
    fetchData()
    fetchMachinists()
    fetchMaintenancePersonnel()
  }, [])

  const fetchData = async () => {
    try {
      console.log('Fetching process areas...')
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

      // Update state in correct order
      setProductionLines(lines)
      setSections(sections)
      setEquipment(equipment)

      // Update selectedLine with fresh data if it's currently selected
      if (selectedLine) {
        const updatedLine = lines.find((line: ProductionLine) => line._id === selectedLine._id)
        if (updatedLine) {
          console.log('Updating selected line with fresh data')
          setSelectedLine(updatedLine)
        }
      }

      console.log('Data loaded successfully')
    } catch (error) {
      console.error('Error fetching data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast({
        title: "Error",
        description: `Failed to load process areas: ${errorMessage}`,
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
        toast({ title: "Updated", description: "Process area updated successfully" })
      } else {
        await createProductionLine(lineForm)
        toast({ title: "Created", description: "Process area created successfully" })
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

      if (!selectedSectionForEquipment || !selectedLine) {
        throw new Error('No section or line selected')
      }

      // Find the section in selectedLine (which has populated equipment)
      const sectionWrapper = selectedLine.sections.find(s => s.sectionId._id === selectedSectionForEquipment)

      if (!sectionWrapper) {
        throw new Error('Section not found in selected line')
      }

      const currentSection = sectionWrapper.sectionId

      // Create the full equipment array: existing + new
      const updatedEquipment = [
        ...currentSection.equipment.map(eq => ({
          equipmentId: typeof eq.equipmentId === 'string' ? eq.equipmentId : eq.equipmentId._id,
          order: eq.order
        })),
        {
          equipmentId: equipmentForm.equipmentId,
          order: currentSection.equipment.length // Auto-increment order
        }
      ]

      console.log('Updated equipment array:', updatedEquipment)

      // Update section equipment
      await updateProductionSectionEquipment(selectedSectionForEquipment, updatedEquipment)

      // Update equipment status to setup_adjustment (transition from offline)
      // Then it can be manually changed to in_production when ready
      await updateEquipment(equipmentForm.equipmentId, { status: EQUIPMENT_STATUSES.SETUP_ADJUSTMENT })

      // Close dialog first
      setIsEquipmentDialogOpen(false)

      // Reload data and wait for completion
      await fetchData()

      toast({ title: "Added", description: "Equipment added to section successfully" })
    } catch (error: any) {
      console.error('Save equipment error:', error)
      console.error('Error response:', error.response?.data)
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error'
      toast({ title: "Error", description: `Failed to add equipment: ${errorMessage}`, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteEquipment = async (sectionId: string, equipmentId: string) => {
    if (!confirm('Are you sure you want to remove this equipment from the section?')) return

    try {
      const currentSection = sections.find(s => s._id === sectionId)
      if (currentSection) {
        const updatedEquipment = currentSection.equipment.filter(e => e.equipmentId._id !== equipmentId).map((e, idx) => ({
          equipmentId: e.equipmentId._id,
          order: idx
        }))
        await updateProductionSectionEquipment(sectionId, updatedEquipment)
        // Update equipment status back to offline when removed from section
        await updateEquipment(equipmentId, { status: EQUIPMENT_STATUSES.STORED })
        const newEquipment = currentSection.equipment.filter(e => e.equipmentId._id !== equipmentId).map((e, idx) => ({ ...e, order: idx }))
        setSections(sections.map(s => s._id === sectionId ? { ...s, equipment: newEquipment } : s))
        setSelectedLine(prev => prev ? { ...prev, sections: prev.sections.map(s => s.sectionId._id === sectionId ? { ...s, sectionId: { ...s.sectionId, equipment: newEquipment } } : s) } : null)
        toast({ title: "Removed", description: "Equipment removed from section successfully" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove equipment", variant: "destructive" })
    }
  }

  const fetchMachinists = async () => {
    try {
      const response = await getMachinists({ isActive: true, limit: 100 })
      setMachinists(response.machinists || [])
    } catch (error) {
      console.error('Error fetching machinists:', error)
    }
  }

  // Handle media file upload
  const handleMediaUpload = (files: FileList | null) => {
    if (!files) return

    const newFiles = Array.from(files).filter(file => {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      const isUnder10MB = file.size <= 10 * 1024 * 1024 // 10MB limit

      if (!isImage && !isVideo) {
        toast({
          title: 'Type de fichier non supporté',
          description: `${file.name} n'est pas une image ou vidéo`,
          variant: 'destructive'
        })
        return false
      }

      if (!isUnder10MB) {
        toast({
          title: 'Fichier trop volumineux',
          description: `${file.name} dépasse 10MB`,
          variant: 'destructive'
        })
        return false
      }

      return true
    })

    if (newFiles.length === 0) return

    // Create previews
    const newPreviews = newFiles.map(file => URL.createObjectURL(file))

    setBreakdownMedia(prev => [...prev, ...newFiles])
    setBreakdownMediaPreviews(prev => [...prev, ...newPreviews])
  }

  // Remove media file
  const removeMedia = (index: number) => {
    URL.revokeObjectURL(breakdownMediaPreviews[index])
    setBreakdownMedia(prev => prev.filter((_, i) => i !== index))
    setBreakdownMediaPreviews(prev => prev.filter((_, i) => i !== index))
  }

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    handleMediaUpload(e.dataTransfer.files)
  }

  const fetchMaintenancePersonnel = async () => {
    try {
      const [mechanicsRes, electriciansRes, workersRes] = await Promise.all([
        getMechanics({ isActive: true }),
        getElectricians({ isActive: true }),
        getMaintenanceWorkers({ isActive: true })
      ])
      setMechanics(mechanicsRes.mechanics || [])
      setElectricians(electriciansRes.electricians || [])
      setMaintenanceWorkers(workersRes.workers || [])
    } catch (error) {
      console.error('Error fetching maintenance personnel:', error)
    }
  }

  const handleStatusClick = async (equipmentId: string, currentStatus: string) => {
    const availableStatuses = getAvailableStatuses()

    if (availableStatuses.length === 0) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to change equipment status",
        variant: "destructive"
      })
      return
    }

    // Load machinists for production status changes
    try {
      const response = await getMachinists({ isActive: true, limit: 100 })
      setMachinists(response.machinists)
    } catch (error) {
      console.error('Failed to load machinists:', error)
    }

    setSelectedEquipmentForStatus({ id: equipmentId, currentStatus })
    setNewStatus(currentStatus)
    setSelectedMachinistId("")
    setSelectedMechanicId("")
    setSelectedElectricianId("")
    setSelectedMaintenanceWorkerId("")
    setBreakdownType("")
    setBreakdownDescription("")
    setBreakdownMedia([])
    setBreakdownMediaPreviews([])

    // Load breakdown info if equipment is in breakdown status
    if (currentStatus === EQUIPMENT_STATUSES.BREAKDOWN) {
      console.log('🔍 Loading breakdown info for equipment:', equipmentId)
      try {
        // Find the equipment in our local state
        const eq = equipment.find(e => e._id === equipmentId)
        if (eq && eq.lastBreakdownType) {
          console.log('✅ Found breakdown info in equipment:', eq.lastBreakdownType)
          setBreakdownType(eq.lastBreakdownType)
          setBreakdownDescription(eq.lastBreakdownDescription || '')
        } else {
          console.log('⚠️ No breakdown info found in equipment')
        }
      } catch (error) {
        console.error('❌ Error loading breakdown info:', error)
      }
    }

    setIsStatusDialogOpen(true)
  }

  const handleChangeStatus = async () => {
    if (!selectedEquipmentForStatus || !newStatus) return

    // Validate machinist selection for "In Production" status
    if (newStatus === EQUIPMENT_STATUSES.IN_PRODUCTION && !selectedMachinistId) {
      toast({
        title: "Machinist Required",
        description: "Please select a machinist for production",
        variant: "destructive"
      })
      return
    }

    // Validate breakdown type and description for "Breakdown" status
    if (newStatus === EQUIPMENT_STATUSES.BREAKDOWN) {
      if (!breakdownType) {
        toast({
          title: 'Type de Panne Requis',
          description: 'Veuillez sélectionner le type de panne',
          variant: 'destructive'
        })
        return
      }
      if (!breakdownDescription.trim()) {
        toast({
          title: 'Description Requise',
          description: 'Veuillez décrire la panne',
          variant: 'destructive'
        })
        return
      }
      // Note: Media files are collected but not sent to API yet
      // TODO: Create separate API endpoint for file uploads
    }

    // Validate maintenance personnel for maintenance statuses (same logic as EquipmentStatusDialog)
    const maintenanceStatuses: EquipmentStatus[] = [EQUIPMENT_STATUSES.UNDER_REPAIR, EQUIPMENT_STATUSES.UNDER_INSPECTION, EQUIPMENT_STATUSES.SCHEDULED_MAINTENANCE, EQUIPMENT_STATUSES.IN_WORKSHOP]
    if (maintenanceStatuses.includes(newStatus as EquipmentStatus)) {
      if (!selectedMechanicId && !selectedElectricianId && !selectedMaintenanceWorkerId) {
        toast({
          title: 'Validation Error',
          description: 'Please select at least one maintenance personnel (Mechanic, Electrician, or Maintenance Worker)',
          variant: 'destructive'
        })
        return
      }
    }

    try {
      setIsSaving(true)

      // Use changeEquipmentStatus API (same as EquipmentStatusDialog)
      await changeEquipmentStatus(selectedEquipmentForStatus.id, {
        status: newStatus as EquipmentStatus,
        machinistId: selectedMachinistId || undefined,
        mechanicId: selectedMechanicId || undefined,
        electricianId: selectedElectricianId || undefined,
        maintenanceWorkerId: selectedMaintenanceWorkerId || undefined,
        breakdownType: breakdownType || undefined,
        breakdownDescription: breakdownDescription || undefined
      })

      // Upload breakdown media if status is Breakdown and there are files
      if (newStatus === EQUIPMENT_STATUSES.BREAKDOWN && breakdownMedia.length > 0) {
        try {
          await uploadBreakdownMedia(
            selectedEquipmentForStatus.id,
            breakdownType,
            breakdownDescription,
            breakdownMedia
          )
          toast({
            title: "Status Updated",
            description: `Equipment status changed with ${breakdownMedia.length} media file(s)`
          })
        } catch (mediaErr: any) {
          console.error('❌ Error uploading media:', mediaErr)
          console.error('Error details:', {
            message: mediaErr?.message,
            response: mediaErr?.response?.data,
            status: mediaErr?.response?.status
          })

          const errorMessage = mediaErr?.response?.data?.error || 'Media upload failed'

          toast({
            title: "Partially Updated",
            description: `Status changed but ${errorMessage}`,
            variant: "destructive"
          })
        }
      } else {
        toast({
          title: "Status Updated",
          description: `Equipment status changed to ${getStatusLabel(newStatus as EquipmentStatus)}`
        })
      }

      setIsStatusDialogOpen(false)
      await fetchData()
    } catch (error: any) {
      console.error('Change status error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error'
      toast({
        title: "Error",
        description: `Failed to change status: ${errorMessage}`,
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteLine = async (id: string) => {
    try {
      await deleteProductionLine(id)
      toast({ title: "Deleted", description: "Process area deleted successfully" })
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
        } else {
          // Move to another section
          const currentSection = sections.find(s => s._id === sectionId)
          const overSection = sections.find(s => s._id === overSectionId)
          const equipmentToMove = currentSection?.equipment.find(e => e.equipmentId._id === equipmentId)

          if (currentSection && overSection && equipmentToMove) {
            // Remove from current section and update orders
            const updatedCurrent = currentSection.equipment.filter(e => e.equipmentId._id !== equipmentId).map((e, idx) => ({ ...e, order: idx }))
            // Add to over section at the end
            const updatedOver = [...overSection.equipment, { ...equipmentToMove, order: overSection.equipment.length }].map((e, idx) => ({ ...e, order: idx }))

            try {
              await Promise.all([
                updateProductionSectionEquipment(sectionId, updatedCurrent.map(e => ({ equipmentId: e.equipmentId._id, order: e.order }))),
                updateProductionSectionEquipment(overSectionId, updatedOver.map(e => ({ equipmentId: e.equipmentId._id, order: e.order })))
              ])
              setSections(sections.map(s =>
                s._id === sectionId ? { ...s, equipment: updatedCurrent } :
                  s._id === overSectionId ? { ...s, equipment: updatedOver } :
                    s
              ))
              setSelectedLine(prev => prev ? {
                ...prev, sections: prev.sections.map(s =>
                  s.sectionId._id === sectionId ? { ...s, sectionId: { ...s.sectionId, equipment: updatedCurrent } } :
                    s.sectionId._id === overSectionId ? { ...s, sectionId: { ...s.sectionId, equipment: updatedOver } } :
                      s
                )
              } : null)
              toast({ title: "Moved", description: "Equipment moved to another section successfully" })
            } catch (error) {
              toast({ title: "Error", description: "Failed to move equipment", variant: "destructive" })
            }
          }
        }
      }
    }
  }

  const getLineStatusColor = (status: string) => {
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
              {selectedLine.name.replace(/^Line \d+:\s*/, '')}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Process area layout and equipment management
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
                            onDelete={() => handleDeleteEquipment(section._id, equipmentWrapper.equipmentId._id)}
                            onStatusClick={() => handleStatusClick(equipmentWrapper.equipmentId._id, equipmentWrapper.equipmentId.status)}
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
                  <SelectContent className="max-h-[400px]">
                    {equipment.filter((eq) => !sections.some((s) => s.equipment.some((e) => e.equipmentId._id === eq._id))).map((eq) => {
                      const brandName = typeof eq.brand === 'object' && eq.brand ? eq.brand.name : eq.brand
                      const equipmentName = brandName && eq.model
                        ? `${brandName} ${eq.model}`
                        : `${eq.category?.name} ${eq.type?.name}`

                      return (
                        <SelectItem key={eq._id} value={eq._id} className="py-2.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-sm">{equipmentName}</span>
                            <span className="text-xs text-slate-500">{eq.type?.name}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
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

        {/* Change Status Dialog */}
        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
          <DialogContent className="sm:max-w-[500px] bg-white">
            <DialogHeader>
              <DialogTitle>Change Equipment Status</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Current Status</Label>
                <div className="flex items-center gap-2">
                  <Badge className={`${getEquipmentStatusColor(selectedEquipmentForStatus?.currentStatus as EquipmentStatus)} text-white`}>
                    {getStatusLabel(selectedEquipmentForStatus?.currentStatus as EquipmentStatus)}
                  </Badge>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="newStatus">New Status</Label>
                <Select value={newStatus} onValueChange={(value) => {
                  setNewStatus(value)

                  // Debug logs
                  console.log('=== AUTO-SUGGESTION DEBUG (ProductionLines) ===')
                  console.log('New Status:', value)
                  console.log('Current Status:', selectedEquipmentForStatus?.currentStatus)
                  console.log('Breakdown Type:', breakdownType)
                  console.log('Is Under Repair?', value === EQUIPMENT_STATUSES.UNDER_REPAIR)
                  console.log('Was Breakdown?', selectedEquipmentForStatus?.currentStatus === EQUIPMENT_STATUSES.BREAKDOWN)
                  console.log('Has Breakdown Type?', !!breakdownType)
                  console.log('Mechanics available:', mechanics.length)
                  console.log('Electricians available:', electricians.length)
                  console.log('Workers available:', maintenanceWorkers.length)

                  // Auto-suggest personnel when changing to Under Repair or In Workshop from Breakdown
                  if ((value === EQUIPMENT_STATUSES.UNDER_REPAIR || value === EQUIPMENT_STATUSES.IN_WORKSHOP) && selectedEquipmentForStatus?.currentStatus === EQUIPMENT_STATUSES.BREAKDOWN && breakdownType) {
                    console.log('✅ Conditions met! Looking for personnel...')
                    const selectedType = breakdownTypes.find(t => t.value === breakdownType)
                    console.log('Selected Type:', selectedType)
                    if (selectedType?.suggestedPersonnel === 'mechanic' && mechanics.length > 0) {
                      setSelectedMechanicId(mechanics[0]._id)
                      toast({
                        title: 'Suggested Personnel',
                        description: `Mechanic pre-selected based on breakdown type (${selectedType.label})`,
                      })
                    } else if (selectedType?.suggestedPersonnel === 'electrician' && electricians.length > 0) {
                      setSelectedElectricianId(electricians[0]._id)
                      toast({
                        title: 'Suggested Personnel',
                        description: `Electrician pre-selected based on breakdown type (${selectedType.label})`,
                      })
                    } else if (selectedType?.suggestedPersonnel === 'worker' && maintenanceWorkers.length > 0) {
                      setSelectedMaintenanceWorkerId(maintenanceWorkers[0]._id)
                      toast({
                        title: 'Suggested Personnel',
                        description: `Maintenance worker pre-selected based on breakdown type (${selectedType.label})`,
                      })
                    }
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    {user?.role && ['production_manager', 'line_manager', 'foreman'].includes(user.role) && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-green-700 bg-green-50 border-b border-green-200">
                          🟢 PRODUCTION
                        </div>
                        {getAvailableStatuses().map((status) => (
                          <SelectItem key={status} value={status} className="pl-6 bg-green-50/30 hover:bg-green-100">
                            {getStatusLabel(status)}
                          </SelectItem>
                        ))}
                      </>
                    )}

                    {user?.role && ['admin', 'maintenance_manager', 'mechanic', 'electrician', 'general_maintenance_agent', 'assistant_maintenance_manager'].includes(user.role) && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-green-700 bg-green-50 border-b border-green-200">
                          🟢 PRODUCTION
                        </div>
                        <SelectItem value={EQUIPMENT_STATUSES.IN_PRODUCTION} className="pl-6 bg-green-50/30 hover:bg-green-100">
                          {getStatusLabel(EQUIPMENT_STATUSES.IN_PRODUCTION)}
                        </SelectItem>
                        <SelectItem value={EQUIPMENT_STATUSES.SETUP_ADJUSTMENT} className="pl-6 bg-green-50/30 hover:bg-green-100">
                          {getStatusLabel(EQUIPMENT_STATUSES.SETUP_ADJUSTMENT)}
                        </SelectItem>
                        <SelectItem value={EQUIPMENT_STATUSES.PAUSED_BY_OPERATOR} className="pl-6 bg-green-50/30 hover:bg-green-100">
                          {getStatusLabel(EQUIPMENT_STATUSES.PAUSED_BY_OPERATOR)}
                        </SelectItem>
                        <SelectItem value={EQUIPMENT_STATUSES.CHANGEOVER} className="pl-6 bg-green-50/30 hover:bg-green-100">
                          {getStatusLabel(EQUIPMENT_STATUSES.CHANGEOVER)}
                        </SelectItem>
                        <SelectItem value={EQUIPMENT_STATUSES.BREAKDOWN} className="pl-6 bg-orange-50/30 hover:bg-orange-100">
                          {getStatusLabel(EQUIPMENT_STATUSES.BREAKDOWN)}
                        </SelectItem>
                        <SelectItem value={EQUIPMENT_STATUSES.OFFLINE} className="pl-6 bg-gray-50/30 hover:bg-gray-100">
                          {getStatusLabel(EQUIPMENT_STATUSES.OFFLINE)}
                        </SelectItem>

                        <div className="px-2 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 border-b border-orange-200 mt-1">
                          🟠 MAINTENANCE
                        </div>
                        <SelectItem value={EQUIPMENT_STATUSES.SCHEDULED_MAINTENANCE} className="pl-6 bg-orange-50/30 hover:bg-orange-100">
                          {getStatusLabel(EQUIPMENT_STATUSES.SCHEDULED_MAINTENANCE)}
                        </SelectItem>
                        <SelectItem value={EQUIPMENT_STATUSES.UNDER_REPAIR} className="pl-6 bg-orange-50/30 hover:bg-orange-100">
                          {getStatusLabel(EQUIPMENT_STATUSES.UNDER_REPAIR)}
                        </SelectItem>
                        <SelectItem value={EQUIPMENT_STATUSES.IN_WORKSHOP} className="pl-6 bg-orange-50/30 hover:bg-orange-100">
                          {getStatusLabel(EQUIPMENT_STATUSES.IN_WORKSHOP)}
                        </SelectItem>
                        <SelectItem value={EQUIPMENT_STATUSES.WAITING_SPARE_PARTS} className="pl-6 bg-orange-50/30 hover:bg-orange-100">
                          {getStatusLabel(EQUIPMENT_STATUSES.WAITING_SPARE_PARTS)}
                        </SelectItem>
                        <SelectItem value={EQUIPMENT_STATUSES.TESTING_AFTER_REPAIR} className="pl-6 bg-orange-50/30 hover:bg-orange-100">
                          {getStatusLabel(EQUIPMENT_STATUSES.TESTING_AFTER_REPAIR)}
                        </SelectItem>
                        <SelectItem value={EQUIPMENT_STATUSES.UNDER_INSPECTION} className="pl-6 bg-orange-50/30 hover:bg-orange-100">
                          {getStatusLabel(EQUIPMENT_STATUSES.UNDER_INSPECTION)}
                        </SelectItem>
                        <SelectItem value={EQUIPMENT_STATUSES.PENDING_VALIDATION} className="pl-6 bg-orange-50/30 hover:bg-orange-100">
                          {getStatusLabel(EQUIPMENT_STATUSES.PENDING_VALIDATION)}
                        </SelectItem>

                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 border-b border-gray-200 mt-1">
                          ⚫ OUT OF SERVICE
                        </div>
                        <SelectItem value={EQUIPMENT_STATUSES.STORED} className="pl-6 bg-gray-50/30 hover:bg-gray-100">
                          {getStatusLabel(EQUIPMENT_STATUSES.STORED)}
                        </SelectItem>
                        <SelectItem value={EQUIPMENT_STATUSES.SCRAPPED} className="pl-6 bg-gray-50/30 hover:bg-gray-100">
                          {getStatusLabel(EQUIPMENT_STATUSES.SCRAPPED)}
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Machinist Selection - Only show when status is "In Production" */}
              {newStatus === EQUIPMENT_STATUSES.IN_PRODUCTION && (
                <div className="grid gap-2">
                  <Label htmlFor="machinist">Machinist <span className="text-red-500">*</span></Label>
                  <Select value={selectedMachinistId} onValueChange={setSelectedMachinistId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select machinist" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {machinists && machinists.length > 0 ? (
                        machinists.map((machinist) => (
                          <SelectItem key={machinist._id} value={machinist._id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{machinist.fullName}</span>
                              <span className="text-xs text-slate-500">Matricule: {machinist.matricule}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-4 text-sm text-slate-500 text-center">
                          No active machinists found
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Breakdown Information - Only show when status is "Breakdown" */}
              {newStatus === EQUIPMENT_STATUSES.BREAKDOWN && (
                <div className={`space-y-4 p-4 border rounded-lg ${!breakdownType || !breakdownDescription ? 'bg-red-50 border-red-300' : 'bg-yellow-50 border-yellow-300'}`}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-5 w-5 ${!breakdownType || !breakdownDescription ? 'text-red-600' : 'text-yellow-600'}`} />
                    <Label className={`text-base font-semibold ${!breakdownType || !breakdownDescription ? 'text-red-900' : 'text-yellow-900'}`}>
                      Informations sur la Panne <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  <p className={`text-sm ${!breakdownType || !breakdownDescription ? 'text-red-700 font-medium' : 'text-yellow-700'}`}>
                    {!breakdownType || !breakdownDescription ? '⚠️ Veuillez renseigner le type et la description de la panne' : 'Ces informations aideront à suggérer le bon personnel de maintenance'}
                  </p>

                  {/* Breakdown Type */}
                  <div className="grid gap-2">
                    <Label htmlFor="breakdownType">Type de Panne <span className="text-red-500">*</span></Label>
                    <Select value={breakdownType} onValueChange={(value) => {
                      setBreakdownType(value)
                      // Auto-suggest personnel based on breakdown type
                      const selectedType = breakdownTypes.find(t => t.value === value)
                      if (selectedType?.suggestedPersonnel === 'mechanic' && mechanics.length > 0) {
                        setSelectedMechanicId(mechanics[0]._id)
                      } else if (selectedType?.suggestedPersonnel === 'electrician' && electricians.length > 0) {
                        setSelectedElectricianId(electricians[0]._id)
                      } else if (selectedType?.suggestedPersonnel === 'worker' && maintenanceWorkers.length > 0) {
                        setSelectedMaintenanceWorkerId(maintenanceWorkers[0]._id)
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le type de panne" />
                      </SelectTrigger>
                      <SelectContent>
                        {breakdownTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Breakdown Description */}
                  <div className="grid gap-2">
                    <Label htmlFor="breakdownDescription">Description de la Panne <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="breakdownDescription"
                      value={breakdownDescription}
                      onChange={(e) => setBreakdownDescription(e.target.value)}
                      placeholder="Décrivez la panne en détail..."
                      rows={3}
                    />
                    <p className="text-xs text-slate-500">
                      Cette information sera utilisée pour suggérer le personnel approprié lors du passage en "Under Repair"
                    </p>
                  </div>

                  {/* Media Upload - Photos/Videos */}
                  <div className="grid gap-2">
                    <Label htmlFor="breakdownMedia">Photos / Vidéos (optionnel)</Label>
                    <div
                      className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors cursor-pointer"
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('breakdownMediaInputPL')?.click()}
                    >
                      <Package className="h-12 w-12 mx-auto text-slate-400 mb-2" />
                      <p className="text-sm text-slate-600 mb-1">
                        Glissez-déposez vos fichiers ici ou cliquez pour sélectionner
                      </p>
                      <p className="text-xs text-slate-500">
                        Images et vidéos acceptées (max 10MB par fichier)
                      </p>
                      <input
                        id="breakdownMediaInputPL"
                        type="file"
                        accept="image/*,video/*"
                        capture="environment"
                        multiple
                        className="hidden"
                        onChange={(e) => handleMediaUpload(e.target.files)}
                      />
                    </div>

                    {/* Media Previews */}
                    {breakdownMediaPreviews.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {breakdownMediaPreviews.map((preview, index) => (
                          <div key={index} className="relative group">
                            {breakdownMedia[index].type.startsWith('image/') ? (
                              <img
                                src={preview}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-24 object-cover rounded border"
                              />
                            ) : (
                              <video
                                src={preview}
                                className="w-full h-24 object-cover rounded border"
                                controls={false}
                              />
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeMedia(index)
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash className="h-3 w-3" />
                            </button>
                            <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                              {breakdownMedia[index].type.startsWith('image/') ? '📷' : '🎥'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-slate-500">
                      {breakdownMedia.length} fichier(s) sélectionné(s)
                    </p>
                  </div>
                </div>
              )}

              {/* Maintenance Personnel Selection - Only show for maintenance statuses (same logic as EquipmentStatusDialog) */}
              {([EQUIPMENT_STATUSES.UNDER_REPAIR, EQUIPMENT_STATUSES.UNDER_INSPECTION, EQUIPMENT_STATUSES.SCHEDULED_MAINTENANCE, EQUIPMENT_STATUSES.IN_WORKSHOP] as EquipmentStatus[]).includes(newStatus as EquipmentStatus) && (
                <div className={`space-y-4 p-4 border rounded-lg ${!selectedMechanicId && !selectedElectricianId && !selectedMaintenanceWorkerId ? 'bg-red-50 border-red-300' : 'bg-orange-50'}`}>
                  <div className="flex items-center gap-2">
                    <Wrench className={`h-5 w-5 ${!selectedMechanicId && !selectedElectricianId && !selectedMaintenanceWorkerId ? 'text-red-600' : 'text-orange-600'}`} />
                    <Label className={`text-base font-semibold ${!selectedMechanicId && !selectedElectricianId && !selectedMaintenanceWorkerId ? 'text-red-900' : 'text-orange-900'}`}>
                      Maintenance Personnel <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  <p className={`text-sm ${!selectedMechanicId && !selectedElectricianId && !selectedMaintenanceWorkerId ? 'text-red-700 font-medium' : 'text-orange-700'}`}>
                    {!selectedMechanicId && !selectedElectricianId && !selectedMaintenanceWorkerId ? '⚠️ Please select at least one maintenance personnel to continue' : 'Select at least one maintenance personnel who will perform the maintenance work'}
                  </p>

                  {/* Mechanic */}
                  <div className={`grid gap-2 ${breakdownType && breakdownTypes.find(t => t.value === breakdownType)?.suggestedPersonnel === 'mechanic' ? 'p-3 border-2 border-green-400 rounded-lg bg-green-50' : ''}`}>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="mechanic">Mechanic</Label>
                      {breakdownType && breakdownTypes.find(t => t.value === breakdownType)?.suggestedPersonnel === 'mechanic' && (
                        <Badge className="bg-green-500 text-white text-xs">✓ Suggéré</Badge>
                      )}
                    </div>
                    <Select value={selectedMechanicId} onValueChange={(val) => setSelectedMechanicId(val === 'none' ? '' : val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mechanic (optional)" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value="none">None</SelectItem>
                        {mechanics.map((mechanic) => (
                          <SelectItem key={mechanic._id} value={mechanic._id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{mechanic.fullName}</span>
                              <span className="text-xs text-slate-500">Matricule: {mechanic.matricule}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Electrician */}
                  <div className={`grid gap-2 ${breakdownType && breakdownTypes.find(t => t.value === breakdownType)?.suggestedPersonnel === 'electrician' ? 'p-3 border-2 border-green-400 rounded-lg bg-green-50' : ''}`}>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="electrician">Electrician</Label>
                      {breakdownType && breakdownTypes.find(t => t.value === breakdownType)?.suggestedPersonnel === 'electrician' && (
                        <Badge className="bg-green-500 text-white text-xs">✓ Suggéré</Badge>
                      )}
                    </div>
                    <Select value={selectedElectricianId} onValueChange={(val) => setSelectedElectricianId(val === 'none' ? '' : val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select electrician (optional)" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value="none">None</SelectItem>
                        {electricians.map((electrician) => (
                          <SelectItem key={electrician._id} value={electrician._id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{electrician.fullName}</span>
                              <span className="text-xs text-slate-500">Matricule: {electrician.matricule}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Maintenance Worker */}
                  <div className={`grid gap-2 ${breakdownType && breakdownTypes.find(t => t.value === breakdownType)?.suggestedPersonnel === 'worker' ? 'p-3 border-2 border-green-400 rounded-lg bg-green-50' : ''}`}>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="maintenanceWorker">Maintenance Worker</Label>
                      {breakdownType && breakdownTypes.find(t => t.value === breakdownType)?.suggestedPersonnel === 'worker' && (
                        <Badge className="bg-green-500 text-white text-xs">✓ Suggéré</Badge>
                      )}
                    </div>
                    <Select value={selectedMaintenanceWorkerId} onValueChange={(val) => setSelectedMaintenanceWorkerId(val === 'none' ? '' : val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select maintenance worker (optional)" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value="none">None</SelectItem>
                        {maintenanceWorkers.map((worker) => (
                          <SelectItem key={worker._id} value={worker._id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{worker.fullName}</span>
                              <span className="text-xs text-slate-500">Matricule: {worker.matricule}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)} disabled={isSaving}>Cancel</Button>
              <Button
                onClick={handleChangeStatus}
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
                disabled={(() => {
                  const maintenanceStatuses: EquipmentStatus[] = [EQUIPMENT_STATUSES.UNDER_REPAIR, EQUIPMENT_STATUSES.UNDER_INSPECTION, EQUIPMENT_STATUSES.SCHEDULED_MAINTENANCE, EQUIPMENT_STATUSES.IN_WORKSHOP];
                  const isMaintenanceStatus = maintenanceStatuses.includes(newStatus as EquipmentStatus);
                  const hasPersonnel = !!(selectedMechanicId || selectedElectricianId || selectedMaintenanceWorkerId);

                  console.log('=== BUTTON DISABLED CHECK ===');
                  console.log('New Status:', newStatus);
                  console.log('Is Maintenance Status:', isMaintenanceStatus);
                  console.log('Selected Mechanic ID:', selectedMechanicId);
                  console.log('Selected Electrician ID:', selectedElectricianId);
                  console.log('Selected Maintenance Worker ID:', selectedMaintenanceWorkerId);
                  console.log('Has Personnel:', hasPersonnel);
                  console.log('Is Saving:', isSaving);
                  console.log('No Status:', !newStatus);
                  console.log('Same Status:', newStatus === selectedEquipmentForStatus?.currentStatus);
                  console.log('In Production without Machinist:', newStatus === EQUIPMENT_STATUSES.IN_PRODUCTION && !selectedMachinistId);
                  console.log('Maintenance without Personnel:', isMaintenanceStatus && !hasPersonnel);

                  const result = isSaving ||
                    !newStatus ||
                    newStatus === selectedEquipmentForStatus?.currentStatus ||
                    (newStatus === EQUIPMENT_STATUSES.IN_PRODUCTION && !selectedMachinistId) ||
                    (isMaintenanceStatus && !hasPersonnel);

                  console.log('BUTTON DISABLED:', result);
                  console.log('=============================');

                  return result;
                })()}
              >
                {isSaving ? 'Changing...' : 'Change Status'}
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
            Process areas
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage process areas and their layouts
          </p>
        </div>
        {/* Temporarily allow all users to create lines for testing */}
        <Button onClick={() => openLineDialog()} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Process Area
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {productionLines.map((line) => (
          <Card key={line._id} className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => { console.log('Line clicked:', line._id); setSelectedLine(line); }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{line.name.replace(/^Line \d+:\s*/, '')}</CardTitle>
                <Badge className={`${getLineStatusColor(line.status)} text-white`}>
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
            <h3 className="text-lg font-medium text-slate-900 mb-2">No process areas found</h3>
            <p className="text-slate-600">Start by adding your first production line.</p>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Process Area Dialog */}
      <Dialog open={isLineDialogOpen} onOpenChange={setIsLineDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle>{editingLine ? 'Edit Process Area' : 'Add Process Area'}</DialogTitle>
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