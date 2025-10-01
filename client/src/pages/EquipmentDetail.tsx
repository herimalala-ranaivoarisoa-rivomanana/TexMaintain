import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getEquipmentById } from "@/api/equipment"
import { MapPin, Calendar, ArrowLeft } from "lucide-react"
import { EquipmentStatusChanger } from "@/components/EquipmentStatusChanger"
import { EquipmentMetrics } from "@/components/EquipmentMetrics"

interface EquipmentDetailData {
  _id: string
  category: {
    _id: string
    name: string
  }
  type: {
    _id: string
    name: string
    category: {
      _id: string
      name: string
    }
  }
  status: string
  location: string
  brand?: string
  serialNumber?: string
  chipNumber?: string
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
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const fetchDetail = async () => {
    try {
      setLoading(true)
      const res = await getEquipmentById(id as string)
      setData((res as any).equipment)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChanged = () => {
    fetchDetail()
    setRefreshTrigger(prev => prev + 1)
  }

  useEffect(() => {
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



  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Invalid date'
      return date.toLocaleDateString()
    } catch {
      return 'Invalid date'
    }
  }

  const getMaintenanceStatus = (nextMaintenance?: string) => {
    if (!nextMaintenance) return { text: 'Not scheduled', color: 'text-gray-500' }
    try {
      const nextDate = new Date(nextMaintenance)
      if (isNaN(nextDate.getTime())) return { text: 'Invalid date', color: 'text-red-500' }
      const now = new Date()
      const daysUntil = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysUntil < 0) return { text: `${Math.abs(daysUntil)} days overdue`, color: 'text-red-600' }
      if (daysUntil === 0) return { text: 'Due today', color: 'text-orange-600' }
      if (daysUntil <= 7) return { text: `${daysUntil} days`, color: 'text-yellow-600' }
      return { text: `${daysUntil} days`, color: 'text-green-600' }
    } catch {
      return { text: 'Invalid date', color: 'text-red-500' }
    }
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4"/>Back</Button>
      

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information Card */}
        <div className="lg:col-span-2">
          <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">{data.category?.name} - {data.type?.name}</CardTitle>
                <EquipmentStatusChanger 
                  equipmentId={data._id}
                  currentStatus={data.status}
                  onStatusChanged={handleStatusChanged}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Category</p>
                  <p className="text-slate-900">{data.category?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Type</p>
                  <p className="text-slate-900">{data.type?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Location</p>
                  <p className="text-slate-900 flex items-center"><MapPin className="mr-2 h-4 w-4"/>{data.location}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Brand</p>
                  <p className="text-slate-900">{data.brand || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Serial Number</p>
                  <p className="text-slate-900">{data.serialNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Chip Number</p>
                  <p className="text-slate-900">{data.chipNumber || '-'}</p>
                </div>
              </div>

              {/* Maintenance Information */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Maintenance Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Installation Date</p>
                    <p className="text-slate-900 flex items-center"><Calendar className="mr-2 h-4 w-4"/>{formatDate(data.installationDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Last Maintenance</p>
                    <p className="text-slate-900 flex items-center"><Calendar className="mr-2 h-4 w-4"/>{formatDate(data.lastMaintenance)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Next Maintenance</p>
                    <p className={`flex items-center ${getMaintenanceStatus(data.nextMaintenance).color}`}>
                      <Calendar className="mr-2 h-4 w-4"/>
                      {formatDate(data.nextMaintenance)}
                      {data.nextMaintenance && (
                        <span className="ml-2 text-xs">({getMaintenanceStatus(data.nextMaintenance).text})</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Maintenance Status</p>
                    <p className={`font-medium ${getMaintenanceStatus(data.nextMaintenance).color}`}>
                      {getMaintenanceStatus(data.nextMaintenance).text}
                    </p>
                  </div>
                </div>
              </div>


            </CardContent>
          </Card>
        </div>

        {/* Specifications Card */}
        <div>
          <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
            <CardHeader>
              <CardTitle className="text-lg">Technical Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              {data.specifications && Object.keys(data.specifications).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(data.specifications).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-sm text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                      <p className="text-slate-900">{String(value)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">No specifications available</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Equipment Metrics Section */}
      <EquipmentMetrics 
        equipmentId={data._id}
        refreshTrigger={refreshTrigger}
      />
    </div>
  )
}

export default function EquipmentDetailWrapper() {
  return <EquipmentDetail />
}



