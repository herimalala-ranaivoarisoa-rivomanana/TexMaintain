import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Factory,
    Settings,
    AlertCircle,
    CheckCircle2,
    MoreVertical
} from "lucide-react"
import { getProcessAreas } from "@/api/processAreas"
import { useToast } from "@/hooks/useToast"
import { Link } from "react-router-dom"

interface ProcessArea {
    _id: string
    name: string
    description: string
    status: 'active' | 'inactive' | 'maintenance'
    departments: any[]
}

export function ProcessAreasDashboard() {
    const [processAreas, setProcessAreas] = useState<ProcessArea[]>([])
    const [loading, setLoading] = useState(true)
    const { toast } = useToast()

    useEffect(() => {
        const fetchAreas = async () => {
            try {
                const response = await getProcessAreas()
                setProcessAreas(response)
            } catch (error) {
                console.error('Error fetching process areas:', error)
                toast({
                    title: "Error",
                    description: "Failed to load process areas",
                    variant: "destructive",
                })
            } finally {
                setLoading(false)
            }
        }

        fetchAreas()
    }, [toast])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <CheckCircle2 className="h-4 w-4 text-green-600" />
            case 'maintenance': return <Settings className="h-4 w-4 text-yellow-600" />
            case 'inactive': return <AlertCircle className="h-4 w-4 text-gray-600" />
            default: return <AlertCircle className="h-4 w-4 text-gray-600" />
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Process areas</h2>
                    <p className="text-muted-foreground">
                        Monitor status and performance of your process areas.
                    </p>
                </div>
                <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                    <Link to="/process-areas">
                        <Settings className="mr-2 h-4 w-4" />
                        Manage Areas
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {processAreas.map((area) => (
                    <Card key={area._id} className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200">
                        <CardHeader className="flex flex-row items-start justify-between pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <Factory className="h-5 w-5 text-blue-600" />
                                    {area.name}
                                </CardTitle>
                                <CardDescription>{area.description}</CardDescription>
                            </div>
                            <Badge className={`${getStatusColor(area.status)} text-white`}>
                                {area.status}
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Status</span>
                                    <div className="flex items-center gap-1 font-medium">
                                        {getStatusIcon(area.status)}
                                        <span className="capitalize">{area.status}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Departments</span>
                                    <span className="font-medium">{area.departments?.length || 0}</span>
                                </div>

                                <div className="pt-4 border-t">
                                    <Button variant="outline" className="w-full" asChild>
                                        <Link to={`/process-areas/${area._id}`}>
                                            View Details
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
