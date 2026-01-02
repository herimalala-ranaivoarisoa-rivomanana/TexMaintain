import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    Briefcase,
    Users,
    DollarSign,
    Calendar,
    CheckCircle2,
    Clock
} from "lucide-react"
import { getProjectStats, getProjects, Project, ProjectStats } from "@/api/projects"
import { useToast } from "@/hooks/useToast"

export function ProjectsDashboard() {
    const [stats, setStats] = useState<ProjectStats | null>(null)
    const [recentProjects, setRecentProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const { toast } = useToast()

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsData, projectsData] = await Promise.all([
                    getProjectStats(),
                    getProjects()
                ])
                setStats(statsData)
                setRecentProjects(projectsData.slice(0, 5)) // Get top 5 recent projects
            } catch (error) {
                console.error('Error fetching project data:', error)
                toast({
                    title: "Error",
                    description: "Failed to load project dashboard data",
                    variant: "destructive",
                })
            } finally {
                setLoading(false)
            }
        }

        fetchData()
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
            case 'Completed': return 'bg-green-500'
            case 'In Progress': return 'bg-blue-500'
            case 'Planned': return 'bg-gray-500'
            case 'On Hold': return 'bg-yellow-500'
            default: return 'bg-gray-500'
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Projects Overview</h2>
                    <p className="text-muted-foreground">
                        Track progress, budgets, and team activities.
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Active Projects</CardTitle>
                        <Briefcase className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{stats?.activeProjects}</div>
                        <p className="text-xs text-slate-500 mt-1">Currently in progress</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Completed Projects</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{stats?.completedProjects}</div>
                        <p className="text-xs text-slate-500 mt-1">Successfully delivered</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Total Budget</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">
                            ${stats?.totalBudget.toLocaleString()}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Across all projects</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Team Members</CardTitle>
                        <Users className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{stats?.totalTeamMembers}</div>
                        <p className="text-xs text-slate-500 mt-1">Assigned to projects</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Projects List */}
            <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
                <CardHeader>
                    <CardTitle>Recent Projects</CardTitle>
                    <CardDescription>Latest projects and their status</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {recentProjects.map((project) => (
                            <div key={project._id} className="flex items-center justify-between p-4 border rounded-lg bg-white/50">
                                <div className="space-y-1">
                                    <h4 className="font-semibold text-slate-900">{project.title}</h4>
                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            Due: {new Date(project.endDate).toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users className="h-3 w-3" />
                                            {project.teamSize} members
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right hidden sm:block">
                                        <div className="text-sm font-medium text-slate-900">{project.progress}%</div>
                                        <Progress value={project.progress} className="w-24 h-2" />
                                    </div>
                                    <Badge className={`${getStatusColor(project.status)} text-white`}>
                                        {project.status}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
