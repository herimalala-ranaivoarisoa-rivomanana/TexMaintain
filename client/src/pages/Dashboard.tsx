import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GeneralDashboard } from "@/components/dashboard/GeneralDashboard"
import { ProcessAreaDashboardView } from "@/components/dashboard/ProcessAreaDashboardView"
import { ProjectsDashboard } from "@/components/dashboard/ProjectsDashboard"
import { LayoutDashboard, Factory, Briefcase } from "lucide-react"
import { getProcessAreas } from "@/api/processAreas"
import { useToast } from "@/hooks/useToast"
import { useFactory } from "@/contexts/FactoryContext"

interface ProcessArea {
  _id: string
  name: string
  createdAt: string
  description?: string
}

export function Dashboard() {
  const [processAreas, setProcessAreas] = useState<ProcessArea[]>([])
  const { toast } = useToast()
  const { currentFactory } = useFactory()

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const data = await getProcessAreas()
        // Sort by creation date (Oldest first)
        const sortedAreas = [...data].sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        setProcessAreas(sortedAreas)
      } catch (error) {
        console.error('Error fetching process areas:', error)
        toast({
          title: "Error",
          description: "Failed to load process areas",
          variant: "destructive",
        })
      }
    }

    fetchAreas()
  }, [toast, currentFactory])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Welcome back! Here's what's happening in your facility.
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
          <TabsTrigger
            value="general"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200"
          >
            <LayoutDashboard className="h-4 w-4" />
            General
          </TabsTrigger>

          {processAreas.map(area => (
            <TabsTrigger
              key={area._id}
              value={`area-${area._id}`}
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200"
            >
              <Factory className="h-4 w-4" />
              {area.name}
            </TabsTrigger>
          ))}

          <TabsTrigger
            value="projects"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200"
          >
            <Briefcase className="h-4 w-4" />
            Projects
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <GeneralDashboard />
        </TabsContent>

        {processAreas.map(area => (
          <TabsContent key={area._id} value={`area-${area._id}`} className="space-y-6">
            <ProcessAreaDashboardView processAreaId={area._id} />
          </TabsContent>
        ))}

        <TabsContent value="projects" className="space-y-6">
          <ProjectsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}