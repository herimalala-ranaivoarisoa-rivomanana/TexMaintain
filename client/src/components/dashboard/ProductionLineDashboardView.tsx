import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
    Activity,
    AlertTriangle,
    CheckCircle,
    Clock,
    Settings,
    TrendingUp,
    Wrench,
    Package,
    ShoppingCart
} from "lucide-react"
import { getProductionLineDashboardStats } from "@/api/productionLines"
import { useToast } from "@/hooks/useToast"
import { ReorderAlertsWidget } from "@/components/ReorderAlertsWidget"
import { UpdateStatsDialog } from "@/components/production/UpdateStatsDialog"

interface ProductionLineDashboardViewProps {
    productionLineId: string
}

interface DashboardData {
    kpis: {
        mttr: number
        mtbf: number
        oee: number
        availability: number
        totalEquipment: number
        activeInterventions: number
        criticalParts: number
        pendingOrders: number
    }
    stats?: {
        targetOutput: number
        actualOutput: number
        defectCount: number
        shiftDuration: number
    }
    reorderAlerts: any[]
    recentActivities: any[]
}

export function ProductionLineDashboardView({ productionLineId }: ProductionLineDashboardViewProps) {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [showUpdateStats, setShowUpdateStats] = useState(false)
    const { toast } = useToast()

    const fetchData = async () => {
        try {
            setLoading(true)
            const response = await getProductionLineDashboardStats(productionLineId)
            setData(response)
        } catch (error) {
            console.error('Error fetching production line dashboard:', error)
            toast({
                title: "Error",
                description: "Failed to load dashboard data",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [productionLineId, toast])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (!data) return null

    const { kpis, recentActivities, reorderAlerts, stats } = data

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-500'
            case 'medium': return 'bg-yellow-500'
            case 'low': return 'bg-green-500'
            default: return 'bg-gray-500'
        }
    }

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'intervention': return <Wrench className="h-4 w-4" />
            case 'inventory': return <Package className="h-4 w-4" />
            case 'equipment': return <Settings className="h-4 w-4" />
            default: return <Activity className="h-4 w-4" />
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">General Overview</h2>
                    <p className="text-muted-foreground">
                        Key performance indicators and recent activities.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setShowUpdateStats(true)}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Activity className="mr-2 h-4 w-4" />
                        Update Production Stats
                    </Button>
                    <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Report Issue
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">MTTR</CardTitle>
                        <Clock className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{kpis.mttr}h</div>
                        <p className="text-xs text-green-600 flex items-center mt-1">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            -12% from last month
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">MTBF</CardTitle>
                        <Activity className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{kpis.mtbf}h</div>
                        <p className="text-xs text-green-600 flex items-center mt-1">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            +8% from last month
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">OEE</CardTitle>
                        <CheckCircle className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{kpis.oee}%</div>
                        <Progress value={kpis.oee} className="mt-2" />
                    </CardContent>
                </Card>

                <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Availability</CardTitle>
                        <Settings className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{kpis.availability}%</div>
                        <Progress value={kpis.availability} className="mt-2" />
                    </CardContent>
                </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/60">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600">Total Equipment</p>
                                <p className="text-3xl font-bold text-blue-900">{kpis.totalEquipment}</p>
                            </div>
                            <Settings className="h-8 w-8 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200/60">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-orange-600">Active Interventions</p>
                                <p className="text-3xl font-bold text-orange-900">{kpis.activeInterventions}</p>
                            </div>
                            <Wrench className="h-8 w-8 text-orange-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200/60">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-red-600">Critical Parts</p>
                                <p className="text-3xl font-bold text-red-900">{kpis.criticalParts}</p>
                            </div>
                            <Package className="h-8 w-8 text-red-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/60">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-600">Pending Orders</p>
                                <p className="text-3xl font-bold text-green-900">{kpis.pendingOrders}</p>
                            </div>
                            <ShoppingCart className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Reorder Alerts Widget */}
            <ReorderAlertsWidget maxItems={5} showViewAll={true} alerts={reorderAlerts} />

            {/* Recent Activities */}
            <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Activity className="mr-2 h-5 w-5 text-blue-600" />
                        Recent Activities
                    </CardTitle>
                    <CardDescription>
                        Latest updates from your maintenance operations
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {(data.recentActivities || []).map((activity) => (
                            <div key={activity._id} className="flex items-start space-x-4 p-4 rounded-lg bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
                                <div className="flex-shrink-0">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600">
                                        {getActivityIcon(activity.type)}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900">{activity.description}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {new Date(activity.timestamp).toLocaleString()}
                                    </p>
                                </div>
                                <Badge className={`${getPriorityColor(activity.priority)} text-white`}>
                                    {activity.priority}
                                </Badge>
                            </div>
                        ))}
                        {(data.recentActivities || []).length === 0 && (
                            <p className="text-center text-slate-500 py-4">No recent activities found for this line.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <UpdateStatsDialog
                open={showUpdateStats}
                onOpenChange={setShowUpdateStats}
                lineId={productionLineId}
                currentStats={stats}
                onSuccess={() => {
                    fetchData()
                }}
            />
        </div>
    )
}
