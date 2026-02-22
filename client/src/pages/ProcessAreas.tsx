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
  Trash
} from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { useAuth } from "@/contexts/AuthContext"
import { useFactory } from "@/contexts/FactoryContext"
import { getProcessAreas, createProcessArea, updateProcessArea, deleteProcessArea } from "@/api/processAreas"
import { getProcessSections, createProcessSection, updateProcessSection, updateProcessSectionAsset } from "@/api/processSections"
import { getAssets, updateAsset } from "@/api/assets"

import { ASSET_STATUSES, getStatusColor as getAssetStatusColor, getStatusLabel, StatusMetadata } from "@/types/asset"
import type { AssetStatus } from "@/types/asset"
import { getStatusMetadata } from "@/api/assets"
import { AssetStatusDialog } from "@/components/AssetStatusDialog"
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

interface ProcessArea {
  _id: string
  name: string
  description?: string
  status: string
  sections: Array<{
    sectionId: {
      _id: string
      name: string
      description?: string
      asset: Array<{
        assetId: {
          _id: string
          category: { name: string }
          subCategory: { name: string }
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

interface ProcessSection {
  _id: string
  name: string
  description?: string
  processArea: string
  asset: Array<{
    assetId: any
    order: number
  }>
  order: number
}

interface Asset {
  _id: string
  name?: string
  category: { name: string }
  subCategory: { name: string }
  status: string
  location: string
  model?: string
  brand?: string | { _id: string, name: string }
  lastBreakdownType?: string
  lastBreakdownDescription?: string
  statusMedia?: string[]
}

interface SortableAssetProps {
  id: string
  asset: Asset
  onStatusClick: () => void
}

const SortableAsset = ({ id, asset, onStatusClick }: SortableAssetProps) => {
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

  const statusColor = getAssetStatusColor(asset.status as AssetStatus)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:border-primary/50 transition-colors group"
    >
      <div {...attributes} {...listeners} className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className={`h-2 w-2 rounded-full ${statusColor}`} />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{asset.name || 'Unnamed Asset'}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] h-5 px-1">{asset.category?.name}</Badge>
          <span>•</span>
          <span className="truncate">{asset.type?.name}</span>
        </div>
      </div>
      <Badge
        className={`${statusColor} text-white hover:opacity-90 text-[10px] whitespace-nowrap cursor-pointer border-0`}
        onClick={(e) => {
          e.stopPropagation(); // Avoid dragging if clicked while dragging logic exists
          onStatusClick();
        }}
      >
        {getStatusLabel(asset.status as AssetStatus)}
      </Badge>
    </div>
  )
}

function ProcessAreas() {
  const { token, user } = useAuth()
  const { currentFactory } = useFactory()
  const { toast } = useToast()
  const [processAreas, setProcessAreas] = useState<ProcessArea[]>([])
  const [loading, setLoading] = useState(true)

  // Dialogs state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreateSectionDialogOpen, setIsCreateSectionDialogOpen] = useState(false)
  const [selectedArea, setSelectedArea] = useState<ProcessArea | null>(null)
  const [isAddAssetDialogOpen, setIsAddAssetDialogOpen] = useState(false)
  const [selectedSection, setSelectedSection] = useState<any | null>(null) // Section details for adding asset

  // Form states
  const [newAreaName, setNewAreaName] = useState("")
  const [newAreaDescription, setNewAreaDescription] = useState("")
  const [newSectionName, setNewSectionName] = useState("")
  const [newSectionDescription, setNewSectionDescription] = useState("")

  // Asset selection state
  const [availableAsset, setAvailableAsset] = useState<Asset[]>([])
  const [selectedAssetId, setSelectedAssetId] = useState<string>("")

  // Status update state
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [selectedAssetForStatus, setSelectedAssetForStatus] = useState<Asset | null>(null)

  const handleStatusClick = (asset: Asset) => {
    setSelectedAssetForStatus(asset)
    setIsStatusDialogOpen(true)
  }

  // Drag and Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: closestCenter,
    })
  )

  useEffect(() => {
    fetchData()
  }, [token, currentFactory])

  const fetchData = async () => {
    try {
      setLoading(true)
      const data = await getProcessAreas()
      const normalized = Array.isArray(data)
        ? data.map((area: any) => {
            const sections = Array.isArray(area?.sections)
              ? [...area.sections]
                  .sort((a: any, b: any) => (a?.order ?? 0) - (b?.order ?? 0))
                  .map((d: any) => {
                    const section = d?.sectionId
                    const asset = Array.isArray(section?.asset)
                      ? [...section.asset].sort((a: any, b: any) => (a?.order ?? 0) - (b?.order ?? 0))
                      : []

                    return {
                      ...d,
                      sectionId: section
                        ? {
                            ...section,
                            asset,
                          }
                        : section,
                    }
                  })
              : []

            return {
              ...area,
              sections,
            }
          })
        : []

      setProcessAreas(normalized)
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to fetch process areas",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateArea = async () => {
    try {
      if (!newAreaName.trim()) return

      await createProcessArea({
        name: newAreaName,
        description: newAreaDescription,
        status: 'active'
      })

      toast({
        title: "Success",
        description: "Process area created successfully"
      })

      setIsCreateDialogOpen(false)
      setNewAreaName("")
      setNewAreaDescription("")
      fetchData()
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to create process area",
        variant: "destructive"
      })
    }
  }

  const handleCreateSection = async () => {
    try {
      if (!selectedArea || !newSectionName.trim()) return

      await createProcessSection({
        name: newSectionName,
        description: newSectionDescription,
        processArea: selectedArea._id,
        order: (selectedArea.sections || []).length
      })

      toast({
        title: "Success",
        description: "Section created successfully"
      })

      setIsCreateSectionDialogOpen(false)
      setNewSectionName("")
      setNewSectionDescription("")
      fetchData()
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to create section",
        variant: "destructive"
      })
    }
  }

  const loadAvailableAsset = async () => {
    try {
      // Get all asset (we could filter for unassigned later if we want strict assignment)
      // For now, let's just show all active asset not 'out_of_service' maybe?
      // Or just all asset.
      const response = await getAssets({ limit: 1000 })
      setAvailableAsset(response.assets)
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to load asset",
        variant: "destructive"
      })
    }
  }

  const handleAddAsset = async () => {
    if (!selectedSection || !selectedAssetId) return

    try {
      // 1. Add to section list logic
      const currentAsset = selectedSection.asset || [];
      const newAssetList = [
        ...currentAsset.map((e: any) => ({ assetId: e.assetId._id, order: e.order })),
        { assetId: selectedAssetId, order: currentAsset.length }
      ]

      await updateProcessSectionAsset(selectedSection._id, newAssetList)

      // 2. Update asset's processArea and processSection fields
      // Find the parent area for this section
      const parentArea = processAreas.find(area => area.sections.some(d => d.sectionId._id === selectedSection._id))

      if (parentArea) {
        await updateAsset(selectedAssetId, {
          processArea: parentArea._id,
          processSection: selectedSection._id
        })
      }

      toast({ title: "Success", description: "Asset added to section" })
      setIsAddAssetDialogOpen(false)
      setSelectedAssetId("")
      fetchData()
    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "Failed to add asset", variant: "destructive" })
    }
  }


  const handleDragEnd = async (event: DragEndEvent, sectionId: string) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const areaIndex = processAreas.findIndex(area =>
        area.sections.some(d => d.sectionId._id === sectionId)
      )
      if (areaIndex === -1) return

      const sectionEntry = processAreas[areaIndex].sections.find(d => d.sectionId._id === sectionId)
      if (!sectionEntry) return

      const section = sectionEntry.sectionId
      const oldIndex = section.asset.findIndex((e) => e.assetId._id === active.id)
      const newIndex = section.asset.findIndex((e) => e.assetId._id === over?.id)

      // Optimist update locally
      // Deep clone to avoid mutating state directly
      const newProcessAreas = JSON.parse(JSON.stringify(processAreas))
      const targetSection = newProcessAreas[areaIndex].sections.find((d: any) => d.sectionId._id === sectionId).sectionId

      targetSection.asset = arrayMove(targetSection.asset, oldIndex, newIndex)
      setProcessAreas(newProcessAreas)

      // Send to server
      try {
        const assetList = targetSection.asset.map((e: any, index: number) => ({
          assetId: e.assetId._id,
          order: index
        }))
        await updateProcessSectionAsset(sectionId, assetList)
      } catch (error) {
        console.error(error)
        toast({ title: "Error", description: "Failed to reorder asset", variant: "destructive" })
        fetchData() // Revert
      }
    }
  }

  if (loading) {
    return <div className="p-8 flex justify-center">Loading...</div>
  }



  return (
    <div className="space-y-6 p-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Process Areas</h1>
          <p className="text-muted-foreground mt-2">
            Manage your factory's process areas and sections structure.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Process Area
        </Button>
      </div>

      <div className="grid gap-6">
        {Array.isArray(processAreas) && processAreas.map((area) => (
          <Card key={area._id} className="relative overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Factory className="h-5 w-5 text-primary" />
                    {area.name}
                  </CardTitle>
                  <CardDescription className="mt-1">{area.description}</CardDescription>
                </div>
                <Badge variant={area.status === 'active' ? 'default' : 'secondary'}>
                  {area.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Sections
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedArea(area)
                    setIsCreateSectionDialogOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Add Section
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {(area.sections || []).map(({ sectionId: section }) => (
                  <div key={section._id} className="border rounded-lg p-4 bg-card shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-3">
                      <div className="font-semibold">{section.name}</div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setSelectedSection(section)
                          loadAvailableAsset()
                          setIsAddAssetDialogOpen(true)
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleDragEnd(e, section._id)}
                    >
                      <SortableContext
                        items={(section.asset || []).map((e: any) => e.assetId?._id).filter(Boolean)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2 min-h-[50px]">
                          {(section.asset || []).length === 0 && (
                            <div className="text-xs text-muted-foreground text-center py-4 border-2 border-dashed rounded bg-muted/20">
                              No asset
                            </div>
                          )}
                          {(section.asset || []).map(({ assetId }: any) => (
                            <SortableAsset
                              key={assetId._id}
                              id={assetId._id}
                              asset={assetId}
                              onStatusClick={() => handleStatusClick(assetId)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Asset Status Dialog */}
      {selectedAssetForStatus && (
        <AssetStatusDialog
          open={isStatusDialogOpen}
          onOpenChange={(open) => {
            setIsStatusDialogOpen(open)
            if (!open) setSelectedAssetForStatus(null)
          }}
          assetId={selectedAssetForStatus._id}
          currentStatus={selectedAssetForStatus.status as AssetStatus}
          assetName={selectedAssetForStatus.name || 'Asset'}
          onStatusChanged={() => {
            fetchData()
            setIsStatusDialogOpen(false)
            setSelectedAssetForStatus(null)
          }}
        />
      )}

      {/* Create Process Area Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Process Area</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="area-name">Name</Label>
              <Input
                id="area-name"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                placeholder="e.g., Cutting Floor"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="area-desc">Description</Label>
              <Textarea
                id="area-desc"
                value={newAreaDescription}
                onChange={(e) => setNewAreaDescription(e.target.value)}
                placeholder="Area description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateArea}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Section Dialog */}
      <Dialog open={isCreateSectionDialogOpen} onOpenChange={setIsCreateSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Section to {selectedArea?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="dept-name">Name</Label>
              <Input
                id="dept-name"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="e.g., Line 1"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dept-desc">Description</Label>
              <Textarea
                id="dept-desc"
                value={newSectionDescription}
                onChange={(e) => setNewSectionDescription(e.target.value)}
                placeholder="Section description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateSectionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSection}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Asset Dialog */}
      <Dialog open={isAddAssetDialogOpen} onOpenChange={setIsAddAssetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Asset to {selectedSection?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Select Asset</Label>
              <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select asset..." />
                </SelectTrigger>
                <SelectContent>
                  {availableAsset.map(eq => (
                    <SelectItem key={eq._id} value={eq._id}>
                      {eq.name || 'Unnamed'} ({eq.category?.name} - {eq.type?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddAssetDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAsset}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

export default ProcessAreas