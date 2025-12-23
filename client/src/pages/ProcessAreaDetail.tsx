import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { ArrowLeft, Activity, Wrench, Package, Settings, Factory, Pencil } from "lucide-react"
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
import { getProcessAreaById, getProcessAreaDashboardStats } from "@/api/processAreas"
import { updateProcessDepartmentEquipment } from "@/api/processDepartments"
import { UpdateProcessAreaStatsDialog } from "@/components/production/UpdateProcessAreaStatsDialog"
import { UpdateDepartmentDialog } from "@/components/production/UpdateDepartmentDialog"
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

interface Department {
    _id: string
    departmentId: {
        _id: string
        name: string
        equipment: Array<{
            equipmentId: {
                _id: string
                name: string
                status: string
                type: { name: string }
            }
        }>
    }
}

interface ProcessArea {
    _id: string
    name: string
    description: string
    status: 'active' | 'inactive' | 'maintenance'
    departments: Department[]
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
        _id: string
        name: string
        status: string
        type: { name: string }
    }
}

const SortableEquipment = ({ id, equipment }: SortableEquipmentProps) => {
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
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="flex items-center justify-between p-2 mb-2 bg-muted/50 rounded-md cursor-grab active:cursor-grabbing hover:bg-muted"
        >
            <div className="flex flex-col">
                <span className="font-medium text-sm">{equipment.name}</span>
                <span className="text-xs text-muted-foreground">{equipment.type?.name}</span>
            </div>
            <Badge variant={equipment.status === 'in_production' ? 'default' : 'secondary'} className="text-[10px]">
                {equipment.status}
            </Badge>
        </div>
    )
}

export function ProcessAreaDetail() {
    const { id } = useParams<{ id: string }>()
    const { toast } = useToast()
    const [processArea, setProcessArea] = useState<ProcessArea | null>(null)
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false)
    const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false)
    const [selectedDepartment, setSelectedDepartment] = useState<any>(null)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: closestCenter,
        })
    )

    useEffect(() => {
        if (id) {
            fetchData(id)
        }
    }, [id])

    const fetchData = async (areaId: string) => {
        try {
            setLoading(true)
            const [areaData, statsData] = await Promise.all([
                getProcessAreaById(areaId),
                getProcessAreaDashboardStats(areaId)
            ])
            setProcessArea(areaData)
            setStats(statsData)
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "Failed to load process area details",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const handleDragEnd = async (event: DragEndEvent, departmentId: string) => {
        const { active, over } = event
        if (!processArea) return

        if (active.id !== over?.id) {
            const departmentIndex = processArea.departments.findIndex(d => d.departmentId._id === departmentId)
            if (departmentIndex === -1) return

            const department = processArea.departments[departmentIndex].departmentId
            const oldIndex = department.equipment.findIndex((e) => e.equipmentId._id === active.id)
            const newIndex = department.equipment.findIndex((e) => e.equipmentId._id === over?.id)

            // Optimistic update
            const newProcessArea = { ...processArea }
            newProcessArea.departments[departmentIndex].departmentId.equipment = arrayMove(department.equipment, oldIndex, newIndex)
            setProcessArea(newProcessArea)

            // Server update
            try {
                const equipmentList = newProcessArea.departments[departmentIndex].departmentId.equipment.map((e, index) => ({
                    equipmentId: e.equipmentId._id,
                    order: index
                }))
                await updateProcessDepartmentEquipment(departmentId, equipmentList)
            } catch (error) {
                console.error(error)
                toast({
                    title: "Error",
                    description: "Failed to save order",
                    variant: "destructive"
                })
                fetchData(id!) // Revert
            }
        }
    }

    if (loading) return <div className="p-8 text-center">Loading...</div>
    if (!processArea || !stats) return <div className="p-8 text-center">Process Area not found</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link to="/process-areas">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{processArea.name}</h1>
                        <p className="text-muted-foreground">{processArea.description}</p>
                    </div>
                    <Badge variant={processArea.status === 'active' ? 'default' : 'secondary'} className="ml-2">
                        {processArea.status}
                    </Badge>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsStatsDialogOpen(true)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Configure Stats
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Availability</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.kpis.availability}%</div>
                        <p className="text-xs text-muted-foreground">OEE: {stats.kpis.oee}%</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Performance</CardTitle>
                        <Factory className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Math.round(stats.kpis.performance * 100)}%</div>
                        <p className="text-xs text-muted-foreground">Target: {processArea.stats?.targetOutput || 0} units</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Reliability</CardTitle>
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">MTBF: {stats.kpis.mtbf}h</div>
                        <p className="text-xs text-muted-foreground">MTTR: {stats.kpis.mttr}h</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.kpis.activeInterventions} Active</div>
                        <p className="text-xs text-muted-foreground">{stats.kpis.criticalParts} critical parts</p>
                    </CardContent>
                </Card>
            </div>

            {/* Department Management */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {processArea.departments.map(({ departmentId: department }) => (
                    <Card key={department._id} className="flex flex-col">
                        <CardHeader className="flex flex-row items-start justify-between pb-2">
                            <div>
                                <CardTitle className="text-lg">{department.name}</CardTitle>
                                <Dialog>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Edit Department</DialogTitle>
                                        </DialogHeader>
                                        {/* Simple edit form could go here, for now using placeholder logic */}
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                    setSelectedDepartment(department)
                                    setIsDepartmentDialogOpen(true)
                                }}
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={(e) => handleDragEnd(e, department._id)}
                            >
                                <SortableContext
                                    items={department.equipment.map(e => e.equipmentId._id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-2">
                                        {department.equipment.length === 0 && (
                                            <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
                                                No equipment
                                            </div>
                                        )}
                                        {department.equipment.map(({ equipmentId }) => (
                                            <SortableEquipment key={equipmentId._id} id={equipmentId._id} equipment={equipmentId} />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Dialogs */}
            <UpdateProcessAreaStatsDialog
                open={isStatsDialogOpen}
                onOpenChange={setIsStatsDialogOpen}
                processArea={processArea}
                onSuccess={() => fetchData(id!)}
            />

            <UpdateDepartmentDialog
                open={isDepartmentDialogOpen}
                onOpenChange={setIsDepartmentDialogOpen}
                department={selectedDepartment}
                onSuccess={() => fetchData(id!)}
            />
        </div>
    )
}

export default ProcessAreaDetail
