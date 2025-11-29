import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GeneralDashboard } from "@/components/dashboard/GeneralDashboard"
import { ProductionLineDashboardView } from "@/components/dashboard/ProductionLineDashboardView"
import { ProjectsDashboard } from "@/components/dashboard/ProjectsDashboard"
import { LayoutDashboard, Factory, Briefcase } from "lucide-react"
import { getProductionLines } from "@/api/productionLines"
import { useToast } from "@/hooks/useToast"

interface ProductionLine {
  _id: string
  name: string
}

export function Dashboard() {
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([])
  const { toast } = useToast()

  useEffect(() => {
    const fetchLines = async () => {
      try {
        const response = await getProductionLines()
        setProductionLines(response.productionLines)
      } catch (error) {
        console.error('Error fetching production lines:', error)
        toast({
          title: "Error",
          description: "Failed to load production lines",
          variant: "destructive",
        })
      }
    }

    fetchLines()
  }, [toast])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Welcome back! Here's what's happening in your textile factory.
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

          {productionLines.map(line => (
            <TabsTrigger
              key={line._id}
              value={`line-${line._id}`}
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200"
            >
              <Factory className="h-4 w-4" />
              {line.name}
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

        {productionLines.map(line => (
          <TabsContent key={line._id} value={`line-${line._id}`} className="space-y-6">
            <ProductionLineDashboardView productionLineId={line._id} />
          </TabsContent>
        ))}

        <TabsContent value="projects" className="space-y-6">
          <ProjectsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}