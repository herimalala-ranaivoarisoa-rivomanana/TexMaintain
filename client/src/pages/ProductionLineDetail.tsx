import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { ArrowLeft, Activity, Wrench, Package, Settings, Factory } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/useToast"
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { getProductionLineById, getProductionLineDashboardStats } from "@/api/productionLines"
import { updateProductionSectionEquipment } from "@/api/productionSections"
import { UpdateStatsDialog } from "@/components/production/UpdateStatsDialog"
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

interface Section {
    _id: string
    sectionId: {
        _id: string
        name: string
        code: string
        equipment: Array<{
            equipmentId: {
                _id: string
                name: string
                code: string
                status: string
                type: { name: string }
            }
        }>
    }
}

interface ProductionLine {
    _id: string
    name: string
    description: string
    status: 'active' | 'inactive' | 'maintenance'
    sections: Section[]
    stats?: {
        targetOutput: number
        actualOutput: number
        defectCount: number
        shiftDuration: number
        plannedDowntime: number
    }
}

interface DashboardStats {
    kpis: {
        totalEquipment: number
        activeInterventions: number
        criticalParts: number
        pendingOrders: number
        mttr: number
        mtbf: number
        availability: number
        oee: number
    }
    details: {
        activeInterventions: any[]
        criticalParts: any[]
        equipment: any[]
    }
    reorderAlerts: any[]
    activities: any[]
}

interface SortableEquipmentProps {
    id: string
    equipment: {
        equipmentId: {
            _id: string
            name: string
            code: string
            status: string
            type: { name: string }
            model?: string
        }
    }
    getStatusColor: (status: string) => string
}

function SortableEquipment({ id, equipment, getStatusColor }: SortableEquipmentProps) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

    const style = transform ? {
        transform: CSS.Transform.toString(transform),
        transition,
    } : undefined

    const item = equipment

    return (
        <div ref={setNodeRef} style={style} className="relative group">
            <Link
                to={`/equipment/${item.equipmentId._id}`}
                className="block"
            >
                <div className="p-4 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md transition-all duration-200">
                    <div className="flex items-start justify-between mb-2">
                        <div className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                            <div
                                {...attributes}
                                {...listeners}
                                className="cursor-grab active:cursor-grabbing p-1 -ml-2 rounded hover:bg-slate-100 text-slate-400"
                                onClick={(e) => e.preventDefault()}
                            >
                                <Settings className="h-4 w-4" />
                            </div>
                            {item.equipmentId.name}
                        </div>
                        <Wrench className="h-4 w-4 text-slate-400 group-hover:text-blue-500" />
                    </div>
                    <div className="space-y-2 pl-6">
                        <div className="text-xs text-slate-500">
                            Model: {item.equipmentId.model || 'N/A'}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full border w-fit ${getStatusColor(item.equipmentId.status)}`}>
                            {item.equipmentId.status}
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    )
}

export function ProductionLineDetail() {
    const { id } = useParams<{ id: string }>()
    const [line, setLine] = useState<ProductionLine | null>(null)
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeDialog, setActiveDialog] = useState<'interventions' | 'parts' | 'stats' | null>(null)
    const { toast } = useToast()

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor)
    )

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return
            try {
                setLoading(true)
                const [lineData, statsData] = await Promise.all([
                    getProductionLineById(id),
                    getProductionLineDashboardStats(id)
                ])
                setLine(lineData.productionLine)
                console.log('Process Area Data:', lineData.productionLine)
                if (lineData.productionLine?.sections) {
                    lineData.productionLine.sections.forEach((s: any) => {
                        console.log(`Section ${s.sectionId?.name} equipment:`, s.sectionId?.equipment)
                    })
                }
                setStats(statsData)
            } catch (err) {
                console.error('Error fetching production line dashboard:', err)
                setError('Failed to load dashboard data')
                toast({
                    title: "Error",
                    description: "Failed to load dashboard data",
                    variant: "destructive",
                })
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [id, toast])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-500'
            case 'maintenance': return 'bg-orange-500'
            case 'inactive': return 'bg-slate-500'
            default: return 'bg-slate-500'
        }
    }

    const getEquipmentStatusColor = (status: string) => {
        switch (status) {
            case 'in_production': return 'bg-green-100 text-green-700 border-green-200'
            case 'maintenance': return 'bg-orange-100 text-orange-700 border-orange-200'
            case 'error': return 'bg-red-100 text-red-700 border-red-200'
            case 'standby': return 'bg-blue-100 text-blue-700 border-blue-200'
            default: return 'bg-slate-100 text-slate-700 border-slate-200'
        }
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (!over || active.id === over.id || !line) return

        const activeId = active.id as string
        const overId = over.id as string

        // Find the section containing these items
        const section = line.sections.find(s =>
            s.sectionId.equipment.some(e => e.equipmentId._id === activeId)
        )

        if (!section) return

        const oldIndex = section.sectionId.equipment.findIndex(e => e.equipmentId._id === activeId)
        const newIndex = section.sectionId.equipment.findIndex(e => e.equipmentId._id === overId)

        if (oldIndex !== -1 && newIndex !== -1) {
            // Optimistic update
            const newEquipment = arrayMove(section.sectionId.equipment, oldIndex, newIndex)

            const updatedSections = line.sections.map(s => {
                if (s._id === section._id) {
                    return {
                        ...s,
                        sectionId: {
                            ...s.sectionId,
                            equipment: newEquipment
                        }
                    }
                }
                return s
            })

            setLine({ ...line, sections: updatedSections })

            // API call
            try {
                const updatedEquipmentPayload = newEquipment.map((eq, index) => ({
                    equipmentId: eq.equipmentId._id,
                    order: index
                }))

                await updateProductionSectionEquipment(section.sectionId._id, updatedEquipmentPayload)
                toast({ title: "Updated", description: "Equipment order updated successfully" })
            } catch (error) {
                console.error('Failed to update order:', error)
                toast({ title: "Error", description: "Failed to update equipment order", variant: "destructive" })
                // Revert on error (could be implemented by refetching)
                const [lineData] = await Promise.all([getProductionLineById(id!)])
                setLine(lineData.productionLine)
            }
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (error || !line) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-500">
                <Activity className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg">{error || 'Process area not found'}</p>
                <Button asChild variant="link" className="mt-4">
                    <Link to="/process-area">Return to list</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button asChild variant="ghost" size="icon">
                        <Link to="/process-area">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                            {line.name}
                            <Badge className={`${getStatusColor(line.status)} text-white text-base font-normal`}>
                                {line.status}
                            </Badge>
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            {line.description}
                        </p>
                    </div>
                </div>
                <Button onClick={() => setActiveDialog('stats')} className="bg-blue-600 hover:bg-blue-700">
                    <Activity className="mr-2 h-4 w-4" />
                    Update Production Stats
                </Button>
            </div>

            {/* Dashboard KPIs */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card
                        className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        onClick={() => setActiveDialog('interventions')}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600">Active Interventions</CardTitle>
                            <Wrench className="h-4 w-4 text-orange-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{stats.kpis.activeInterventions}</div>
                            <p className="text-xs text-slate-500 mt-1">Click to view details</p>
                        </CardContent>
                    </Card>

                    <Card
                        className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        onClick={() => setActiveDialog('parts')}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600">Critical Parts</CardTitle>
                            <Package className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{stats.kpis.criticalParts}</div>
                            <p className="text-xs text-slate-500 mt-1">Click to view details</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600">Availability</CardTitle>
                            <Settings className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{stats.kpis.availability}%</div>
                            <Progress value={stats.kpis.availability} className="mt-2" />
                        </CardContent>
                    </Card>

                    <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600">OEE (Est.)</CardTitle>
                            <Activity className="h-4 w-4 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{stats.kpis.oee}%</div>
                            <Progress value={stats.kpis.oee} className="mt-2" />
                        </CardContent>
                    </Card>
                </div>
            )}

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                            <Factory className="h-5 w-5 text-blue-600" />
                            Production Sections
                        </h2>

                        {line.sections?.map((section) => (
                            <Card key={section._id} className="bg-white/60 backdrop-blur-sm border-slate-200/60">
                                <CardHeader>
                                    <CardTitle className="text-lg font-medium flex items-center justify-between">
                                        <span>{section.sectionId.name}</span>
                                        <Badge variant="outline" className="font-normal">
                                            Code: {section.sectionId.code}
                                        </Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <SortableContext
                                            items={section.sectionId.equipment?.map(e => e.equipmentId._id) || []}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {section.sectionId.equipment?.map((item) => (
                                                <SortableEquipment
                                                    key={item.equipmentId._id}
                                                    id={item.equipmentId._id}
                                                    equipment={item}
                                                    getStatusColor={getEquipmentStatusColor}
                                                />
                                            ))}
                                        </SortableContext>

                                        {(!section.sectionId.equipment || section.sectionId.equipment.length === 0) && (
                                            <div className="col-span-full text-center py-8 text-slate-500 bg-slate-50/50 rounded-lg border border-dashed">
                                                No equipment assigned to this section
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {(!line.sections || line.sections.length === 0) && (
                            <Card className="bg-slate-50 border-dashed">
                                <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
                                    <Settings className="h-12 w-12 mb-4 opacity-50" />
                                    <p>No sections configured for this production line</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </DndContext>

            {/* Drill-down Dialogs */}
            <Dialog open={activeDialog === 'interventions'} onOpenChange={() => setActiveDialog(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Active Interventions</DialogTitle>
                        <DialogDescription>
                            Current interventions for equipment on this production line.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Equipment</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats?.details.activeInterventions.map((intervention) => (
                                    <TableRow key={intervention._id}>
                                        <TableCell className="font-medium">{intervention.equipment?.name}</TableCell>
                                        <TableCell>{intervention.title}</TableCell>
                                        <TableCell>
                                            <Badge variant={intervention.priority === 'Critical' ? 'destructive' : 'secondary'}>
                                                {intervention.priority}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{intervention.status}</TableCell>
                                        <TableCell>{new Date(intervention.createdDate).toLocaleDateString()}</TableCell>
                                    </TableRow>
                                ))}
                                {stats?.details.activeInterventions.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-slate-500">
                                            No active interventions found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={activeDialog === 'parts'} onOpenChange={() => setActiveDialog(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Critical Parts</DialogTitle>
                        <DialogDescription>
                            Parts with stock levels below minimum threshold.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Part Name</TableHead>
                                    <TableHead>Part Number</TableHead>
                                    <TableHead>Current Stock</TableHead>
                                    <TableHead>Min Stock</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats?.details.criticalParts.map((part) => (
                                    <TableRow key={part._id}>
                                        <TableCell className="font-medium">{part.name}</TableCell>
                                        <TableCell>{part.partNumber}</TableCell>
                                        <TableCell className="text-red-600 font-bold">{part.currentStock}</TableCell>
                                        <TableCell>{part.minStock}</TableCell>
                                        <TableCell>
                                            <Badge variant="destructive">Low Stock</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {stats?.details.criticalParts.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-slate-500">
                                            No critical parts found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>

            <UpdateStatsDialog
                open={activeDialog === 'stats'}
                onOpenChange={(open) => !open && setActiveDialog(null)}
                lineId={id || ''}
                currentStats={line.stats}
                onSuccess={() => {
                    // Refresh data
                    getProductionLineDashboardStats(id || '').then(setStats)
                    getProductionLineById(id || '').then(res => setLine(res.productionLine))
                }}
            />
        </div>
    )
}
