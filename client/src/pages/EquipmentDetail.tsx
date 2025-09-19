import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getEquipmentById } from "@/api/equipment"
import { Settings, MapPin, Calendar, ArrowLeft } from "lucide-react"

interface EquipmentDetailData {
  _id: string
  name: string
  type: string
  status: string
  location: string
  manufacturer?: string
  model?: string
  serialNumber?: string
  installationDate?: string
  lastMaintenance?: string
  nextMaintenance?: string
  mtbf?: number
  mttr?: number
  specifications?: Record<string, any>
}

export function EquipmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<EquipmentDetailData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await getEquipmentById(id as string)
        setData((res as any).equipment)
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchDetail()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4"/>Back</Button>
        <Card>
          <CardContent className="p-6">Equipment not found.</CardContent>
        </Card>
      </div>
    )
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-green-500'
      case 'maintenance': return 'bg-yellow-500'
      case 'breakdown': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4"/>Back</Button>
      <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{data.name}</CardTitle>
            <Badge className={`${statusColor(data.status)} text-white`}>{data.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center text-slate-700"><Settings className="mr-2 h-4 w-4"/>{data.type}</div>
          <div className="flex items-center text-slate-700"><MapPin className="mr-2 h-4 w-4"/>{data.location}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">Manufacturer</p>
              <p className="text-slate-900">{data.manufacturer || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Model</p>
              <p className="text-slate-900">{data.model || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Serial Number</p>
              <p className="text-slate-900">{data.serialNumber || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Installation</p>
              <p className="text-slate-900 flex items-center"><Calendar className="mr-1 h-3 w-3"/>{data.installationDate ? new Date(data.installationDate).toLocaleDateString() : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Last Maintenance</p>
              <p className="text-slate-900 flex items-center"><Calendar className="mr-1 h-3 w-3"/>{data.lastMaintenance ? new Date(data.lastMaintenance).toLocaleDateString() : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Next Maintenance</p>
              <p className="text-slate-900 flex items-center"><Calendar className="mr-1 h-3 w-3"/>{data.nextMaintenance ? new Date(data.nextMaintenance).toLocaleDateString() : '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function EquipmentDetailWrapper() {
  return <EquipmentDetail />
}



