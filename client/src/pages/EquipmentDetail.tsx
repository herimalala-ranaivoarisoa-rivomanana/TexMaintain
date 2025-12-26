import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getEquipmentById, getStatusMetadata } from "@/api/equipment"
import { MapPin, Calendar, ArrowLeft, QrCode, History, Info, Boxes } from "lucide-react"
import type { StatusMetadata } from "@/types/equipment"

import { QRCodeGenerator } from "@/components/QRCodeGenerator"
import { SubAssetsList } from "@/components/SubAssetsList"
import { EquipmentTimeline } from "@/components/EquipmentTimeline"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useFactory } from "@/contexts/FactoryContext"

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
  brand?: {
    _id: string
    name: string
  } | string
  serialNumber?: string
  chipNumber?: string
  acquisitionDate?: string
  lastMaintenance?: string
  nextMaintenance?: string
  mtbf?: number
  mttr?: number
  specifications?: Record<string, any>
  // Financial Data
  purchasePrice?: number
  usefulLifeYears?: number
  currentValue?: number
  totalMaintenanceCost?: number
  tco?: number
}

export function EquipmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<EquipmentDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusMetadata, setStatusMetadata] = useState<Record<string, StatusMetadata>>({})
  const { currentFactory } = useFactory()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [equipmentRes, metadataRes] = await Promise.all([
          getEquipmentById(id as string),
          getStatusMetadata()
        ])

        setData((equipmentRes as any).equipment)
        if (metadataRes && metadataRes.success) {
          setStatusMetadata(metadataRes.statuses)
        }
      } catch (error) {
        console.error("Error fetching details:", error)
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchData()
  }, [id, currentFactory])

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
        <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        <Card>
          <CardContent className="p-6">Equipment not found.</CardContent>
        </Card>
      </div>
    )
  }

  // Helper to map backend generic colors to Tailwind classes
  const getTailwindColor = (color: string) => {
    const map: Record<string, string> = {
      'green': 'bg-green-500',
      'blue': 'bg-blue-500',
      'red': 'bg-red-500',
      'orange': 'bg-orange-500',
      'yellow': 'bg-yellow-500',
      'gray': 'bg-gray-500',
      'black': 'bg-black',
      'purple': 'bg-purple-500',
      'pink': 'bg-pink-500'
    }
    return map[color] || 'bg-gray-500'
  }

  const getStatusColor = (status: string) => {
    const meta = statusMetadata[status]
    if (meta) return getTailwindColor(meta.color)
    return 'bg-gray-500'
  }

  const getStatusLabel = (status: string) => {
    const meta = statusMetadata[status]
    return meta ? meta.label : status
  }

  // ... formatDate ...
  // ... getMaintenanceStatus ...

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
      <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="details" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Complete History
          </TabsTrigger>
          <TabsTrigger value="subassets" className="flex items-center gap-2">
            <Boxes className="h-4 w-4" />
            Sub-assets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Information Card */}
            <div className="lg:col-span-2">
              <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl">{data.category?.name} - {data.type?.name}</CardTitle>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <QrCode className="mr-2 h-4 w-4" />
                            QR Code
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md bg-white">
                          <DialogHeader>
                            <DialogTitle>Equipment QR Code</DialogTitle>
                          </DialogHeader>
                          <div className="flex items-center justify-center p-6">
                            <QRCodeGenerator value={(data as any).chipNumber || data._id} />
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Badge className={`${getStatusColor(data.status)} text-white`}>{getStatusLabel(data.status)}</Badge>
                    </div>
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
                      <p className="text-slate-900 flex items-center"><MapPin className="mr-2 h-4 w-4" />{data.location}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Brand</p>
                      <p className="text-slate-900">{typeof data.brand === 'object' ? data.brand.name : (data.brand || '-')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Serial Number</p>
                      <p className="text-slate-900">{data.serialNumber || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Chip Number</p>
                      <p className="text-slate-900">{data.chipNumber || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Site</p>
                      <p className="text-slate-900">{(data as any).site?.code || (data as any).site?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Asset Class</p>
                      <p className="text-slate-900">{(data as any).assetClass?.code || (data as any).assetClass?.name || '-'}</p>
                    </div>
                  </div>

                  {/* Maintenance Information */}
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4">Maintenance Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-500">Acquisition Date</p>
                        <p className="text-slate-900 flex items-center"><Calendar className="mr-2 h-4 w-4" />{formatDate(data.acquisitionDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Last Maintenance</p>
                        <p className="text-slate-900 flex items-center"><Calendar className="mr-2 h-4 w-4" />{formatDate(data.lastMaintenance)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Next Maintenance</p>
                        <p className={`flex items-center ${getMaintenanceStatus(data.nextMaintenance).color}`}>
                          <Calendar className="mr-2 h-4 w-4" />
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

                  {/* Financial Analysis */}
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4 text-emerald-700 flex items-center">
                      <span className="mr-2">💰</span> Financial Analysis (TCO)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                        <p className="text-sm text-slate-500">Purchase Price</p>
                        <p className="text-slate-900 text-lg font-semibold">
                          {data.purchasePrice ? `Rs ${data.purchasePrice.toLocaleString()}` : <span className="text-sm italic text-slate-400">Not set</span>}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Useful Life: {data.usefulLifeYears || 10} years</p>
                      </div>
                      <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                        <p className="text-sm text-slate-500">Current Value</p>
                        <p className="text-emerald-700 text-lg font-bold">
                          {typeof data.currentValue === 'number' ? `Rs ${data.currentValue.toLocaleString()}` : 'Calculating...'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Depreciated Value</p>
                      </div>
                      <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                        <p className="text-sm text-slate-500">Total Cost of Ownership</p>
                        <p className="text-blue-700 text-lg font-bold">
                          {typeof data.tco === 'number' ? `Rs ${data.tco.toLocaleString()}` : 'Calculating...'}
                        </p>
                        <p className="text-xs text-blue-400 mt-1">
                          Maint. Cost: Rs {data.totalMaintenanceCost ? data.totalMaintenanceCost.toLocaleString() : '0'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-500">MTBF (Mean Time Between Failures)</p>
                        <p className="text-slate-900 text-lg font-semibold">{data.mtbf ? `${data.mtbf}h` : 'Not available'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">MTTR (Mean Time To Repair)</p>
                        <p className="text-slate-900 text-lg font-semibold">{data.mttr ? `${data.mttr}h` : 'Not available'}</p>
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
        </TabsContent>

        <TabsContent value="history">
          <EquipmentTimeline equipmentId={id || ''} limit={100} />
        </TabsContent>
        <TabsContent value="subassets">
          <SubAssetsList equipmentId={id || ''} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function EquipmentDetailWrapper() {
  return <EquipmentDetail />
}



