import { useEffect, useState, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getInterventionById } from "@/api/interventions"
import { Wrench, User, Calendar, ArrowLeft } from "lucide-react"

interface InterventionData {
  _id: string
  title: string
  type: string
  priority: string
  status: string
  equipment: string
  equipmentId?: {
    model?: string
    serialNumber?: string
    chipNumber?: string
    brand?: {
      name?: string
    }
  }
  assignedTo?: string
  description?: string
  createdDate?: string
  startedDate?: string
  completedDate?: string
  dueDate?: string
}

// Component to display duration that updates in real-time
function InterventionDuration({ startedDate, completedDate, status }: { startedDate?: string, completedDate?: string, status: string }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // Only update if intervention is in progress (not pending, completed or cancelled)
    if (status === 'In Progress') {
      const interval = setInterval(() => {
        setTick(t => t + 1); // Force re-render every second
      }, 1000); // Update every second

      return () => clearInterval(interval);
    }
  }, [status]);

  const duration = useMemo(() => {
    // If not started yet, show "-"
    if (!startedDate) {
      return '-';
    }
    
    const started = new Date(startedDate);
    const end = (status === 'Completed' || status === 'Cancelled') && completedDate
      ? new Date(completedDate)
      : new Date();
    const diffMs = end.getTime() - started.getTime();
    
    // If negative duration (completed before started was recorded), show "-"
    if (diffMs < 0) {
      return '-';
    }
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h`;
    } else if (diffHours > 0) {
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m`;
    }
  }, [startedDate, completedDate, status, tick]);

  return <span>{duration}</span>;
}

export function InterventionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<InterventionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await getInterventionById(id!)
        setData(res.intervention)
      } catch (error) {
        setData(null)
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
          <CardContent className="p-6">Intervention not found.</CardContent>
        </Card>
      </div>
    )
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-500'
      case 'In Progress': return 'bg-blue-500'
      case 'Pending': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const priorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-600'
      case 'High': return 'bg-orange-600'
      case 'Medium': return 'bg-yellow-600'
      case 'Low': return 'bg-green-600'
      default: return 'bg-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4"/>Back</Button>
      <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{data.title}</CardTitle>
            <div className="flex gap-2">
              <Badge className={`${priorityColor(data.priority)} text-white`}>{data.priority}</Badge>
              <Badge className={`${statusColor(data.status)} text-white`}>{data.status}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">Type</p>
              <p className="text-slate-900 flex items-center"><Wrench className="mr-1 h-3 w-3"/>{data.type}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Assigned To</p>
              <p className="text-slate-900 flex items-center"><User className="mr-1 h-3 w-3"/>{data.assignedTo || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Created</p>
              <p className="text-slate-900 flex items-center"><Calendar className="mr-1 h-3 w-3"/>{data.createdDate ? new Date(data.createdDate).toLocaleDateString() : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Duration</p>
              <p className="text-slate-900">
                <InterventionDuration 
                  startedDate={data.startedDate}
                  completedDate={data.completedDate}
                  status={data.status}
                />
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Due Date</p>
              <p className="text-slate-900 flex items-center"><Calendar className="mr-1 h-3 w-3"/>{data.dueDate ? new Date(data.dueDate).toLocaleDateString() : '-'}</p>
            </div>
          </div>

          {/* Equipment Details */}
          {data.equipmentId && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-xs text-slate-500">Model</p>
                <p className="text-sm font-medium text-slate-900">{data.equipmentId.model || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Serial Number</p>
                <p className="text-sm font-medium text-slate-900">{data.equipmentId.serialNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Chip Number</p>
                <p className="text-sm font-medium text-slate-900">{data.equipmentId.chipNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Brand</p>
                <p className="text-sm font-medium text-slate-900">{data.equipmentId.brand?.name || 'N/A'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function InterventionDetailWrapper() {
  return <InterventionDetail />
}



