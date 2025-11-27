import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { FolderOpen, Plus, Calendar, Users, DollarSign, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { getProjects, getProjectStats, createProject, updateProject, deleteProject, Project, ProjectStats, CreateProjectData } from "@/api/projects"
import { toast } from "sonner"
import { format } from "date-fns"

export function Projects() {
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<ProjectStats | null>(null)

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  // Form states
  const [formData, setFormData] = useState<CreateProjectData>({
    title: '',
    description: '',
    status: 'Planned',
    budget: 0,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    teamSize: 0
  })

  const fetchData = async () => {
    try {
      const [projectsData, statsData] = await Promise.all([
        getProjects(),
        getProjectStats()
      ])
      setProjects(projectsData)
      setStats(statsData)
    } catch (error) {
      console.error("Error fetching projects:", error)
      toast.error("Failed to load projects")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'Planned',
      budget: 0,
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      teamSize: 0
    })
    setSelectedProject(null)
  }

  const handleCreateProject = async () => {
    try {
      await createProject(formData)
      toast.success("Project created successfully")
      setIsCreateOpen(false)
      resetForm()
      fetchData()
    } catch (error) {
      toast.error("Failed to create project")
    }
  }

  const handleEditClick = (project: Project) => {
    setSelectedProject(project)
    setFormData({
      title: project.title,
      description: project.description,
      status: project.status,
      budget: project.budget,
      startDate: format(new Date(project.startDate), 'yyyy-MM-dd'),
      endDate: format(new Date(project.endDate), 'yyyy-MM-dd'),
      teamSize: project.teamSize
    })
    setIsEditOpen(true)
  }

  const handleUpdateProject = async () => {
    if (!selectedProject) return
    try {
      await updateProject(selectedProject._id, formData)
      toast.success("Project updated successfully")
      setIsEditOpen(false)
      resetForm()
      fetchData()
    } catch (error) {
      toast.error("Failed to update project")
    }
  }

  const handleDeleteClick = (project: Project) => {
    setSelectedProject(project)
    setIsDeleteOpen(true)
  }

  const handleDeleteProject = async () => {
    if (!selectedProject) return
    try {
      await deleteProject(selectedProject._id)
      toast.success("Project deleted successfully")
      setIsDeleteOpen(false)
      setSelectedProject(null)
      fetchData()
    } catch (error) {
      toast.error("Failed to delete project")
    }
  }

  const handleProgressUpdate = async (project: Project, newProgress: number) => {
    try {
      await updateProject(project._id, { progress: newProgress })
      toast.success("Progress updated")
      fetchData()
    } catch (error) {
      toast.error("Failed to update progress")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planned': return 'bg-blue-500'
      case 'In Progress': return 'bg-yellow-500'
      case 'Completed': return 'bg-green-500'
      case 'On Hold': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Project Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage industrial projects and improvements
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Add a new industrial project to the system.
              </DialogDescription>
            </DialogHeader>
            <ProjectForm formData={formData} setFormData={setFormData} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateProject}>Create Project</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Active Projects"
          value={stats?.activeProjects || 0}
          icon={FolderOpen}
          colorClass="text-blue-600"
          bgClass="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/60"
        />
        <KPICard
          title="Completed"
          value={stats?.completedProjects || 0}
          icon={Calendar}
          colorClass="text-green-600"
          bgClass="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/60"
        />
        <KPICard
          title="Team Members"
          value={stats?.totalTeamMembers || 0}
          icon={Users}
          colorClass="text-purple-600"
          bgClass="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200/60"
        />
        <KPICard
          title="Total Budget"
          value={`$${(stats?.totalBudget || 0).toLocaleString()}`}
          icon={DollarSign}
          colorClass="text-orange-600"
          bgClass="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200/60"
        />
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projects?.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No projects found</p>
            <p className="text-sm">Create a new project to get started</p>
          </div>
        )}
        {projects?.map((project) => (
          <Card key={project._id} className="bg-white/60 backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all duration-200 group">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{project.title}</CardTitle>
                  <Badge className={`${getStatusColor(project.status)} text-white`}>{project.status}</Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditClick(project)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDeleteClick(project)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardDescription>
                {project.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Budget</p>
                  <p className="font-semibold text-slate-900">${project.budget.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-500">Timeline</p>
                  <p className="font-semibold text-slate-900">
                    {format(new Date(project.startDate), 'MMM yyyy')} - {format(new Date(project.endDate), 'MMM yyyy')}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600">Progress</span>
                  <span className="font-medium">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-2 mb-4" />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => window.location.href = `/projects/${project._id}`}>
                    View Details
                  </Button>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    className="w-16 h-8 text-xs"
                    value={project.progress}
                    onChange={(e) => handleProgressUpdate(project, Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update project details.
            </DialogDescription>
          </DialogHeader>
          <ProjectForm formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateProject}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project "{selectedProject?.title}" and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteProject}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Sub-components for cleaner code
function KPICard({ title, value, icon: Icon, colorClass, bgClass }: any) {
  return (
    <Card className={bgClass}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${colorClass.replace('text-', 'text-opacity-80 text-')}`}>{title}</p>
            <p className={`text-3xl font-bold ${colorClass.replace('text-', 'text-slate-900')}`}>{value}</p>
          </div>
          <Icon className={`h-8 w-8 ${colorClass}`} />
        </div>
      </CardContent>
    </Card>
  )
}

function ProjectForm({ formData, setFormData }: { formData: CreateProjectData, setFormData: (data: CreateProjectData) => void }) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Project Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="budget">Budget ($)</Label>
          <Input
            id="budget"
            type="number"
            value={formData.budget}
            onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="teamSize">Team Size</Label>
          <Input
            id="teamSize"
            type="number"
            value={formData.teamSize}
            onChange={(e) => setFormData({ ...formData, teamSize: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Planned">Planned</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="On Hold">On Hold</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}