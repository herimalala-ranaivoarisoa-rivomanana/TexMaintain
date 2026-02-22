import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Wrench,
  CheckCircle,
  AlertTriangle
} from "lucide-react"
import api from "@/api/api"
import { useToast } from "@/hooks/useToast"
import { AssetTimeline } from "@/components/AssetTimeline"

interface Asset {
  _id: string
  category: { name: string }
  subCategory: { name: string }
  model: string
  location: string
  processArea?: { name: string }
  processSection?: { name: string }
}

interface InterventionStats {
  total: number
  completed: number
  inProgress: number
  critical: number
}

export function AssetInterventions() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [asset, setAsset] = useState<Asset | null>(null)
  const [stats, setStats] = useState<InterventionStats>({ total: 0, completed: 0, inProgress: 0, critical: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return

      try {
        // Fetch asset info
        const equipResponse = await api.get(`/api/assets/${id}`)
        setAsset(equipResponse.data.asset)

        // Fetch intervention statistics
        // Fetch intervention statistics
        const statsResponse = await api.get(`/api/assets/${id}/interventions`, { params: { limit: 1000 } })
        const interventions = statsResponse.data.interventions || []

        setStats({
          total: statsResponse.data.total || 0,
          completed: interventions.filter((i: any) => i.status === 'Completed').length,
          inProgress: interventions.filter((i: any) => i.status === 'In Progress').length,
          critical: interventions.filter((i: any) => i.priority === 'Critical').length
        })
      } catch (error) {
        console.error('Error fetching asset data:', error)
        toast({
          title: "Error",
          description: "Failed to load asset information",
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Complete Asset History
          </h1>
          {asset && (
            <p className="text-muted-foreground">
              {asset.category.name} - {asset.subCategory.name} ({asset.model})
            </p>
          )}
        </div>
      </div>

      {/* Info Asset */}
      {asset && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-blue-600 font-medium">Model</p>
                <p className="text-blue-900">{asset.model}</p>
              </div>
              <div>
                <p className="text-blue-600 font-medium">Location</p>
                <p className="text-blue-900">{asset.location}</p>
              </div>
              <div>
                <p className="text-blue-600 font-medium">Process Area</p>
                <p className="text-blue-900">{asset.processArea?.name || 'Not assigned'}</p>
              </div>
              <div>
                <p className="text-blue-600 font-medium">Section</p>
                <p className="text-blue-900">{asset.processSection?.name || 'Not assigned'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Interventions</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Wrench className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <Wrench className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Critical</p>
                <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unified Timeline */}
      <AssetTimeline assetId={id || ''} limit={100} />
    </div>
  )
}
