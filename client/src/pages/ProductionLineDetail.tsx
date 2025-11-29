import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
    Factory,
    Settings,
    AlertCircle,
    CheckCircle2,
    ArrowLeft,
    Wrench,
    Clock,
    Activity,
    Package,
    TrendingUp,
    ShoppingCart
} from "lucide-react"
import { getProductionLineById, getProductionLineDashboardStats } from "@/api/productionLines"
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

interface Equipment {
    _id: string
    name: string
    code: string
    status: string
    type: {
        name: string
    }
}

interface Section {
    _id: string
    sectionId: {
        _id: string
        name: string
        code: string
        equipment: {
            equipmentId: Equipment
        }[]
    }
    order: number
}

interface ProductionLine {
    _id: string
    name: string
    description: string
    status: 'active' | 'inactive' | 'maintenance'
    sections: Section[]
}

interface DashboardStats {
    kpis: {
        totalEquipment: number
        activeInterventions: number
        criticalParts: number
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
}

export function ProductionLineDetail() {
    const { id } = useParams<{ id: string }>()
    const [line, setLine] = useState<ProductionLine | null>(null)
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeDialog, setActiveDialog] = useState<'interventions' | 'parts' | null>(null)
    const { toast } = useToast()

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return
            try {
                const [lineResponse, statsResponse] = await Promise.all([
                    getProductionLineById(id),
                    getProductionLineDashboardStats(id)
                ])
                setLine(lineResponse.productionLine)
                setStats(statsResponse)
            } catch (error) {
                console.error('Error fetching production line data:', error)
                toast({
                    title: "Error",
                    description: "Failed to load production line details",
                    variant: "destructive",
                })
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [id, toast])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (!line) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <p className="text-lg text-slate-600">Production line not found</p>
                <Button asChild variant="outline">
                    <Link to="/production-lines">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to List
                    </Link>
                </Button>
            </div>
        )
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-500'
            case 'maintenance': return 'bg-yellow-500'
            case 'inactive': return 'bg-gray-500'
            default: return 'bg-gray-500'
        }
    }

    const getEquipmentStatusColor = (status: string) => {
        switch (status) {
            case 'In Production': return 'text-green-600 bg-green-50 border-green-200'
            case 'Under Maintenance': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
            case 'Broken Down': return 'text-red-600 bg-red-50 border-red-200'
            default: return 'text-slate-600 bg-slate-50 border-slate-200'
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button asChild variant="ghost" size="icon">
                    <Link to="/production-lines">
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
                                    {section.sectionId.equipment?.map((item) => (
                                        <Link
                                            key={item.equipmentId._id}
                                            to={`/equipment/${item.equipmentId._id}`}
                                            className="block group"
                                        >
                                            <div className="p-4 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md transition-all duration-200">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                                                        {item.equipmentId.name}
                                                    </div>
                                                    <Wrench className="h-4 w-4 text-slate-400 group-hover:text-blue-500" />
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="text-xs text-slate-500">
                                                        {item.equipmentId.type?.name} • {item.equipmentId.code}
                                                    </div>
                                                    <div className={`text-xs px-2 py-1 rounded-full border w-fit ${getEquipmentStatusColor(item.equipmentId.status)}`}>
                                                        {item.equipmentId.status}
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
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
        </div>
    )
}
