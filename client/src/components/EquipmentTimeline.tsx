import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  ArrowRight,
  AlertTriangle,
  User,
  Wrench,
  Clock,
  Calendar,
  FileText,
  Users,
  Package,
  Droplet,
  Activity,
  Filter
} from 'lucide-react'
import { getStatusColor, getStatusLabel } from '@/types/equipment'
import type { EquipmentStatus } from '@/types/equipment'
import { useToast } from '@/hooks/useToast'
import api from '@/api/api'

interface TimelineEvent {
  _id: string
  type: 'status_change' | 'intervention' | 'part_replacement' | 'consumable_usage'
  timestamp: string
  title: string
  data: any
}

interface EquipmentTimelineProps {
  equipmentId: string
  limit?: number
}

export function EquipmentTimeline({ equipmentId, limit = 50 }: EquipmentTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState({ statusChanges: 0, interventions: 0, partsUsage: 0 })
  const [filter, setFilter] = useState<'all' | 'status' | 'interventions' | 'parts'>('all')
  const { toast } = useToast()

  useEffect(() => {
    fetchTimeline()
  }, [equipmentId, filter])

  const fetchTimeline = async () => {
    if (!equipmentId) {
      console.warn('[EquipmentTimeline] No equipment ID provided')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log('[EquipmentTimeline] Fetching timeline for equipment:', equipmentId)
      
      const eventTypes = filter === 'all' ? 'all' : filter === 'status' ? 'status' : filter === 'interventions' ? 'interventions' : 'parts'
      
      const response = await api.get(`/api/equipment/${equipmentId}/timeline`, {
        params: { limit, eventTypes }
      })
      
      console.log('[EquipmentTimeline] Received:', response.data.total, 'events')
      setTimeline(response.data.timeline || [])
      setTotal(response.data.total || 0)
      setCounts(response.data.counts || { statusChanges: 0, interventions: 0, partsUsage: 0 })
    } catch (error) {
      console.error('Error fetching timeline:', error)
      toast({
        title: 'Error',
        description: 'Failed to load equipment timeline',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date)
  }

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      const remainingHours = hours % 24
      return `${days}d ${remainingHours}h ${mins}m`
    }
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'status_change': return <Activity className="h-5 w-5" />
      case 'intervention': return <Wrench className="h-5 w-5" />
      case 'part_replacement': return <Package className="h-5 w-5" />
      case 'consumable_usage': return <Droplet className="h-5 w-5" />
      default: return <Clock className="h-5 w-5" />
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'status_change': return 'bg-blue-500 text-white'
      case 'intervention': return 'bg-orange-500 text-white'
      case 'part_replacement': return 'bg-purple-500 text-white'
      case 'consumable_usage': return 'bg-teal-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const renderEvent = (event: TimelineEvent) => {
    switch (event.type) {
      case 'status_change':
        return renderStatusChange(event)
      case 'intervention':
        return renderIntervention(event)
      case 'part_replacement':
      case 'consumable_usage':
        return renderPartsUsage(event)
      default:
        return null
    }
  }

  const renderStatusChange = (event: TimelineEvent) => (
    <Card key={event._id} className="bg-white border-slate-200 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${getEventColor(event.type)}`}>
              {getEventIcon(event.type)}
            </div>
            <div>
              {event.data.previousStatus && (
                <>
                  <Badge className={`${getStatusColor(event.data.previousStatus as EquipmentStatus)} text-white mr-2`}>
                    {getStatusLabel(event.data.previousStatus as EquipmentStatus)}
                  </Badge>
                  <ArrowRight className="h-4 w-4 inline mx-1 text-slate-400" />
                </>
              )}
              <Badge className={`${getStatusColor(event.data.newStatus as EquipmentStatus)} text-white`}>
                {getStatusLabel(event.data.newStatus as EquipmentStatus)}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="h-3 w-3" />
              {formatDate(event.timestamp)}
            </div>
            {event.data.duration && (
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                <Clock className="h-3 w-3" />
                Duration: {formatDuration(event.data.duration)}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* User */}
        {event.data.changedBy && (
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-slate-600" />
              <Label className="text-sm font-medium text-slate-700">Changed by</Label>
            </div>
            <p className="text-sm text-slate-900 ml-6">{event.data.changedBy.email}</p>
          </div>
        )}

        {/* Personnel */}
        {(event.data.machinist || event.data.mechanic || event.data.electrician || event.data.maintenanceWorker) && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-600" />
              <Label className="text-sm font-medium text-blue-900">Assigned Personnel</Label>
            </div>
            <div className="space-y-1 ml-6">
              {event.data.machinist && (
                <p className="text-sm text-blue-900">
                  <strong>Machinist:</strong> {event.data.machinist.fullName}
                </p>
              )}
              {event.data.mechanic && (
                <p className="text-sm text-blue-900">
                  <strong>Mechanic:</strong> {event.data.mechanic.fullName}
                </p>
              )}
              {event.data.electrician && (
                <p className="text-sm text-blue-900">
                  <strong>Electrician:</strong> {event.data.electrician.fullName}
                </p>
              )}
              {event.data.maintenanceWorker && (
                <p className="text-sm text-blue-900">
                  <strong>Maintenance Worker:</strong> {event.data.maintenanceWorker.fullName}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Breakdown */}
        {event.data.breakdownInfo && (
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="ml-2">
              <strong className="text-red-900">Breakdown:</strong> {event.data.breakdownInfo.type}
              {event.data.breakdownInfo.description && (
                <p className="text-sm text-red-800 mt-1">{event.data.breakdownInfo.description}</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Reason/Notes */}
        {(event.data.reason || event.data.notes) && (
          <div className="text-sm text-slate-600">
            {event.data.reason && <p><strong>Reason:</strong> {event.data.reason}</p>}
            {event.data.notes && <p><strong>Notes:</strong> {event.data.notes}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )

  const renderIntervention = (event: TimelineEvent) => (
    <Card key={event._id} className="bg-white border-orange-200 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${getEventColor(event.type)}`}>
              {getEventIcon(event.type)}
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">{event.title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{event.data.type}</Badge>
                <Badge className={`${
                  event.data.priority === 'Critical' ? 'bg-red-500' :
                  event.data.priority === 'High' ? 'bg-orange-500' :
                  event.data.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                } text-white`}>
                  {event.data.priority}
                </Badge>
                <Badge variant="outline">{event.data.status}</Badge>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="h-3 w-3" />
              {formatDate(event.timestamp)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {event.data.description && (
          <p className="text-sm text-slate-600">{event.data.description}</p>
        )}
        {event.data.assignedTo && (
          <p className="text-sm text-slate-600 mt-2">
            <strong>Assigned to:</strong> {event.data.assignedTo}
          </p>
        )}
      </CardContent>
    </Card>
  )

  const renderPartsUsage = (event: TimelineEvent) => (
    <Card key={event._id} className={`bg-white border-${event.type === 'consumable_usage' ? 'teal' : 'purple'}-200 hover:shadow-md transition-shadow`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${getEventColor(event.type)}`}>
              {getEventIcon(event.type)}
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">{event.title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{event.data.part.partNumber}</Badge>
                <Badge variant="outline">{event.data.part.type}</Badge>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="h-3 w-3" />
              {formatDate(event.timestamp)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600">
          <strong>Quantity:</strong> {event.data.quantityUsed} {event.data.part.type === 'consumable' ? 'unit(s)' : 'piece(s)'}
        </p>
        {event.data.performedBy && (
          <p className="text-sm text-slate-600 mt-1">
            <strong>Performed by:</strong> {event.data.performedBy.fullName || event.data.performedBy.email}
          </p>
        )}
        {event.data.notes && (
          <p className="text-sm text-slate-600 mt-1">
            <strong>Notes:</strong> {event.data.notes}
          </p>
        )}
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-slate-500 mt-4">Loading timeline...</p>
        </CardContent>
      </Card>
    )
  }

  if (timeline.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Clock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Events</h3>
          <p className="text-slate-600">No events have been recorded yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Complete Equipment Timeline</h3>
          <p className="text-sm text-slate-500">
            Showing {timeline.length} of {total} total events
          </p>
        </div>
        
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-auto">
          <TabsList>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              All ({total})
            </TabsTrigger>
            <TabsTrigger value="status" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Status ({counts.statusChanges})
            </TabsTrigger>
            <TabsTrigger value="interventions" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Interventions ({counts.interventions})
            </TabsTrigger>
            <TabsTrigger value="parts" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Parts ({counts.partsUsage})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Timeline */}
      <ScrollArea className="h-[700px] rounded-md border">
        <div className="space-y-4 p-4">
          {timeline.map((event) => renderEvent(event))}
        </div>
      </ScrollArea>
    </div>
  )
}
