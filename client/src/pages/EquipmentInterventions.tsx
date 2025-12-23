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
import { EquipmentTimeline } from "@/components/EquipmentTimeline"

interface Equipment {
  _id: string
  category: { name: string }
  type: { name: string }
  model: string
  location: string
  processArea?: { name: string }
  processDepartment?: { name: string }
}

interface InterventionStats {
  total: number
  completed: number
  inProgress: number
  critical: number
}

export function EquipmentInterventions() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [stats, setStats] = useState<InterventionStats>({ total: 0, completed: 0, inProgress: 0, critical: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return

      try {
        // Fetch equipment info
        const equipResponse = await api.get(`/api/equipment/${id}`)
        setEquipment(equipResponse.data.equipment)

        // Fetch intervention statistics
        const statsResponse = await api.get(`/api/equipment/${id}/interventions`, { params: { limit: 1000 } })
        const interventions = statsResponse.data.interventions || []

        setStats({
          total: statsResponse.data.total || 0,
          completed: interventions.filter((i: any) => i.status === 'Completed').length,
          inProgress: interventions.filter((i: any) => i.status === 'In Progress').length,
          critical: interventions.filter((i: any) => i.priority === 'Critical').length
        })
      } catch (error) {
        console.error('Error fetching equipment data:', error)
        toast({
          title: "Error",
          description: "Failed to load equipment information",
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
            Complete Equipment History
          </h1>
          {equipment && (
            <p className="text-muted-foreground">
              {equipment.category.name} - {equipment.type.name} ({equipment.model})
            </p>
          )}
        </div>
      </div>

      {/* Info Equipment */}
      {equipment && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-blue-600 font-medium">Model</p>
                <p className="text-blue-900">{equipment.model}</p>
              </div>
              <div>
                <p className="text-blue-600 font-medium">Location</p>
                <p className="text-blue-900">{equipment.location}</p>
              </div>
              <div>
                <p className="text-blue-600 font-medium">Process Area</p>
                <p className="text-blue-900">{equipment.processArea?.name || 'Not assigned'}</p>
              </div>
              <div>
                <p className="text-blue-600 font-medium">Department</p>
                <p className="text-blue-900">{equipment.processDepartment?.name || 'Not assigned'}</p>
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
      <EquipmentTimeline equipmentId={id || ''} limit={100} />
    </div>
  )
}
