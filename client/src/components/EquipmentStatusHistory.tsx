import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  Activity
} from 'lucide-react'
import { getStatusColor, getStatusLabel } from '@/types/equipment'
import type { EquipmentStatus } from '@/types/equipment'
import { useToast } from '@/hooks/useToast'
import api from '@/api/api'

interface StatusHistoryEntry {
  _id: string
  previousStatus?: EquipmentStatus
  newStatus: EquipmentStatus
  changedBy: {
    _id: string
    email: string
    role: string
  }
  machinist?: {
    _id: string
    matricule: string
    firstName: string
    lastName: string
    fullName: string
  }
  mechanic?: {
    _id: string
    matricule: string
    firstName: string
    lastName: string
    fullName: string
  }
  electrician?: {
    _id: string
    matricule: string
    firstName: string
    lastName: string
    fullName: string
  }
  maintenanceWorker?: {
    _id: string
    matricule: string
    firstName: string
    lastName: string
    fullName: string
  }
  breakdownInfo?: {
    type: string
    description: string
  }
  intervention?: {
    _id: string
    title: string
    type: string
    status: string
  }
  reason?: string
  notes?: string
  duration?: number
  timestamp: string
  statusMetadata?: {
    label: string
    category: string
    color: string
  }
  previousStatusMetadata?: {
    label: string
    category: string
    color: string
  }
}

interface EquipmentStatusHistoryProps {
  equipmentId: string
  limit?: number
}

export function EquipmentStatusHistory({ equipmentId, limit = 20 }: EquipmentStatusHistoryProps) {
  const [history, setHistory] = useState<StatusHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const { toast } = useToast()

  useEffect(() => {
    fetchHistory()
  }, [equipmentId])

  const fetchHistory = async () => {
    if (!equipmentId) {
      console.warn('[EquipmentStatusHistory] No equipment ID provided')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log('[EquipmentStatusHistory] Fetching history for equipment:', equipmentId)
      const response = await api.get(`/api/equipment/${equipmentId}/status-history`, {
        params: { limit }
      })
      console.log('[EquipmentStatusHistory] Received:', response.data.total, 'entries')
      setHistory(response.data.history || [])
      setTotal(response.data.total || 0)
    } catch (error) {
      console.error('Error fetching status history:', error)
      toast({
        title: 'Error',
        description: 'Failed to load status history',
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

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      'admin': 'Administrator',
      'maintenance_manager': 'Maintenance Manager',
      'mechanic': 'Mechanic',
      'electrician': 'Electrician',
      'general_maintenance_agent': 'Maintenance Agent',
      'production_manager': 'Production Manager',
      'line_manager': 'Line Manager',
      'foreman': 'Foreman',
      'procurement_manager': 'Procurement Manager'
    }
    return roleMap[role] || role
  }

  const getBreakdownTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'mechanical': 'Mechanical',
      'electrical': 'Electrical',
      'hydraulic': 'Hydraulic',
      'pneumatic': 'Pneumatic',
      'electronic': 'Electronic',
      'software': 'Software/Control',
      'structural': 'Structural',
      'other': 'Other'
    }
    return typeMap[type] || type
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-slate-500 mt-4">Loading history...</p>
        </CardContent>
      </Card>
    )
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Clock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No History Available</h3>
          <p className="text-slate-600">No status changes have been recorded yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Status Change History</h3>
          <p className="text-sm text-slate-500">
            Showing {history.length} of {total} total changes
          </p>
        </div>
      </div>

      <ScrollArea className="h-[600px] rounded-md border">
        <div className="space-y-4 p-4">
          {history.map((entry, index) => (
            <Card key={entry._id} className="bg-white border-slate-200 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {entry.previousStatus && (
                      <>
                        <Badge className={`${getStatusColor(entry.previousStatus)} text-white`}>
                          {getStatusLabel(entry.previousStatus)}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                      </>
                    )}
                    <Badge className={`${getStatusColor(entry.newStatus)} text-white`}>
                      {getStatusLabel(entry.newStatus)}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="h-3 w-3" />
                      {formatDate(entry.timestamp)}
                    </div>
                    {entry.duration && (
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                        <Clock className="h-3 w-3" />
                        Duration: {formatDuration(entry.duration)}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* User who made the change */}
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-slate-600" />
                    <Label className="text-sm font-medium text-slate-700">Changed by</Label>
                  </div>
                  <p className="text-sm text-slate-900 ml-6">
                    {entry.changedBy.email}
                    <Badge variant="outline" className="ml-2 text-xs">
                      {getRoleLabel(entry.changedBy.role)}
                    </Badge>
                  </p>
                </div>

                {/* Assigned Personnel */}
                {(entry.machinist || entry.mechanic || entry.electrician || entry.maintenanceWorker) && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <Label className="text-sm font-medium text-blue-900">Assigned Personnel</Label>
                    </div>
                    <div className="space-y-2 ml-6">
                      {entry.machinist && (
                        <div className="text-sm">
                          <span className="font-medium text-blue-700">Machinist:</span>{' '}
                          <span className="text-blue-900">
                            {entry.machinist.fullName || `${entry.machinist.firstName} ${entry.machinist.lastName}`}
                          </span>
                          <Badge variant="outline" className="ml-2 text-xs border-blue-300 text-blue-700">
                            #{entry.machinist.matricule}
                          </Badge>
                        </div>
                      )}
                      {entry.mechanic && (
                        <div className="text-sm">
                          <span className="font-medium text-blue-700">Mechanic:</span>{' '}
                          <span className="text-blue-900">
                            {entry.mechanic.fullName || `${entry.mechanic.firstName} ${entry.mechanic.lastName}`}
                          </span>
                          <Badge variant="outline" className="ml-2 text-xs border-blue-300 text-blue-700">
                            #{entry.mechanic.matricule}
                          </Badge>
                        </div>
                      )}
                      {entry.electrician && (
                        <div className="text-sm">
                          <span className="font-medium text-blue-700">Electrician:</span>{' '}
                          <span className="text-blue-900">
                            {entry.electrician.fullName || `${entry.electrician.firstName} ${entry.electrician.lastName}`}
                          </span>
                          <Badge variant="outline" className="ml-2 text-xs border-blue-300 text-blue-700">
                            #{entry.electrician.matricule}
                          </Badge>
                        </div>
                      )}
                      {entry.maintenanceWorker && (
                        <div className="text-sm">
                          <span className="font-medium text-blue-700">Maintenance Worker:</span>{' '}
                          <span className="text-blue-900">
                            {entry.maintenanceWorker.fullName || `${entry.maintenanceWorker.firstName} ${entry.maintenanceWorker.lastName}`}
                          </span>
                          <Badge variant="outline" className="ml-2 text-xs border-blue-300 text-blue-700">
                            #{entry.maintenanceWorker.matricule}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Breakdown Information */}
                {entry.breakdownInfo && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="ml-2">
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="font-semibold text-red-900">Breakdown Type:</span>{' '}
                          <Badge variant="destructive" className="ml-1">
                            {getBreakdownTypeLabel(entry.breakdownInfo.type)}
                          </Badge>
                        </div>
                        {entry.breakdownInfo.description && (
                          <div className="text-sm text-red-800 mt-2">
                            <span className="font-semibold">Description:</span>{' '}
                            {entry.breakdownInfo.description}
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Intervention Link */}
                {entry.intervention && (
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Wrench className="h-4 w-4 text-orange-600" />
                      <Label className="text-sm font-medium text-orange-900">Related Intervention</Label>
                    </div>
                    <div className="text-sm text-orange-800 ml-6">
                      <span className="font-medium">{entry.intervention.title}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs border-orange-300">
                          {entry.intervention.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-orange-300">
                          {entry.intervention.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reason and Notes */}
                {(entry.reason || entry.notes) && (
                  <div className="space-y-2">
                    {entry.reason && (
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-amber-600 mt-0.5" />
                          <div>
                            <Label className="text-sm font-medium text-amber-900">Reason</Label>
                            <p className="text-sm text-amber-800 mt-1">{entry.reason}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {entry.notes && (
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-slate-600 mt-0.5" />
                          <div>
                            <Label className="text-sm font-medium text-slate-700">Notes</Label>
                            <p className="text-sm text-slate-600 mt-1">{entry.notes}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>

              {index < history.length - 1 && <Separator className="mt-4" />}
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
