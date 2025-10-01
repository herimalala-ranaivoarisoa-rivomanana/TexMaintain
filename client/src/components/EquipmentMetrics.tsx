import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { 
  Clock, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Timer, 
  BarChart3,
  RefreshCw,
  Factory,
  Gauge
} from "lucide-react"
import { getEquipmentMetrics } from "@/api/equipment"
import { useToast } from "@/hooks/useToast"

interface EquipmentMetricsProps {
  equipmentId: string
  refreshTrigger?: number
}

export function EquipmentMetrics({ equipmentId, refreshTrigger = 0 }: EquipmentMetricsProps) {
  const [metrics, setMetrics] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const { toast } = useToast()

  const loadMetrics = async () => {
    setIsLoading(true)
    try {
      const data = await getEquipmentMetrics(equipmentId)
      

      
      setMetrics(data)
    } catch (error: any) {
      console.error('Error loading metrics:', error)
      toast({
        title: "Error",
        description: "Unable to load metrics",
        variant: "destructive"
      })
      setMetrics(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMetrics()
  }, [equipmentId, refreshTrigger])

  // Timer pour l'auto-incrémentation en temps réel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000) // Met à jour toutes les secondes

    return () => clearInterval(timer)
  }, [])

  // Calcul des temps en temps réel
  const calculateRealTimeMetrics = () => {
    if (!metrics) return metrics

    const now = currentTime.getTime()
    
    // Calcul du temps depuis acquisition (basé sur installationDate, createdAt, ou insertedAt comme fallback)
    let timeSinceAcquisitionHours = 0
    let acquisitionDate = null
    
    if (metrics.installationDate && metrics.installationDate !== 'Not set') {
      acquisitionDate = new Date(metrics.installationDate)
    } else if (metrics.createdAt) {
      acquisitionDate = new Date(metrics.createdAt)
    } else if (metrics.productionMetrics?.insertedAt) {
      // Fallback: utiliser insertedAt si aucune autre date n'est disponible
      acquisitionDate = new Date(metrics.productionMetrics.insertedAt)
    }
    
    if (acquisitionDate && !isNaN(acquisitionDate.getTime())) {
      timeSinceAcquisitionHours = (now - acquisitionDate.getTime()) / (1000 * 60 * 60)
    }

    // Calcul du temps depuis insertion dans la section de production
    let timeSinceInsertionHours = 0
    if (metrics.productionMetrics?.insertedAt) {
      const insertedAt = new Date(metrics.productionMetrics.insertedAt)
      if (!isNaN(insertedAt.getTime())) {
        timeSinceInsertionHours = (now - insertedAt.getTime()) / (1000 * 60 * 60)
      }
    }

    // S'assurer que timeSinceAcquisition >= timeSinceInsertion
    if (timeSinceInsertionHours > timeSinceAcquisitionHours && timeSinceInsertionHours > 0) {
      timeSinceAcquisitionHours = timeSinceInsertionHours
    }

    // Calcul du temps d'opération en temps réel (global et section)
    let realTimeOperatingHours = metrics.totalOperatingHours || 0
    let realTimeSectionOperatingHours = metrics.productionMetrics?.operatingHours || 0
    
    if (metrics.productionMetrics?.isOperating && metrics.productionMetrics?.lastOperatingStart) {
      const lastStartTime = new Date(metrics.productionMetrics.lastOperatingStart)
      if (!isNaN(lastStartTime.getTime())) {
        const operatingTimeSinceStart = (now - lastStartTime.getTime()) / (1000 * 60 * 60)
        
        // Vérifier que le temps calculé est valide
        if (operatingTimeSinceStart >= 0 && operatingTimeSinceStart < 24 * 365) { // Max 1 an
          realTimeOperatingHours += operatingTimeSinceStart
          realTimeSectionOperatingHours += operatingTimeSinceStart
        }
      }
    }

    // Validation des valeurs pour éviter NaN
    const safeNumber = (value: number) => (isNaN(value) || !isFinite(value)) ? 0 : value

    return {
      ...metrics,
      // Métriques globales en temps réel
      timeSinceAcquisition: safeNumber(timeSinceAcquisitionHours),
      realTimeTotalOperatingHours: safeNumber(realTimeOperatingHours),
      // Métriques de production en temps réel
      timeSinceInsertion: safeNumber(timeSinceInsertionHours),
      productionMetrics: metrics.productionMetrics ? {
        ...metrics.productionMetrics,
        realTimeOperatingHours: safeNumber(realTimeSectionOperatingHours)
      } : null
    }
  }

  const formatHours = (hours: number): string => {
    // Gérer les valeurs invalides
    if (isNaN(hours) || !isFinite(hours) || hours < 0) {
      return "0min"
    }
    
    if (hours < 1) {
      return `${Math.round(hours * 60)}min`
    } else if (hours < 24) {
      return `${hours.toFixed(1)}h`
    } else {
      const days = Math.floor(hours / 24)
      const remainingHours = Math.round(hours % 24)
      return `${days}d ${remainingHours}h`
    }
  }



  const formatTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp).toLocaleString('en-US')
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Loading metrics...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!metrics) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Loading Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Unable to load equipment metrics.</p>
          <Button onClick={loadMetrics} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Utiliser les métriques en temps réel
  const realTimeMetrics = calculateRealTimeMetrics()

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Operating Metrics</h3>
        <Button variant="outline" size="sm" onClick={loadMetrics} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Global metrics */}
      <div>
        <h4 className="text-md font-medium mb-3 flex items-center">
          <BarChart3 className="w-4 h-4 mr-2" />
          Global Metrics
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                Time Since Acquisition
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatHours(realTimeMetrics.timeSinceAcquisition || 0)}
              </div>
              <p className="text-xs text-gray-500">Since equipment acquisition</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                Global MTBF
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatHours(realTimeMetrics.mtbf)}
              </div>
              <p className="text-xs text-gray-500">Mean time between failures</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Timer className="w-4 h-4 mr-1" />
                Global MTTR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatHours(realTimeMetrics.mttr)}
              </div>
              <p className="text-xs text-gray-500">Mean time to repair</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Activity className="w-4 h-4 mr-1" />
                Total Operating Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatHours(realTimeMetrics.realTimeTotalOperatingHours || realTimeMetrics.totalOperatingHours)}
              </div>
              <p className="text-xs text-gray-500">Total operating time (real-time)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Total Downtime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatHours(realTimeMetrics.downtimeHours)}
              </div>
              <p className="text-xs text-gray-500">Total downtime</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Gauge className="w-4 h-4 mr-1" />
                Global Availability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">
                {(metrics.globalAvailability || 0).toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500">Overall availability rate</p>
            </CardContent>
          </Card>
        </div>
      </div>



      {/* Production metrics (current section) */}
      {realTimeMetrics.productionMetrics?.insertedAt && (
        <div>
          <h4 className="text-md font-medium mb-3 flex items-center">
            <Factory className="w-4 h-4 mr-2" />
            Production Metrics (Current Section)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Time Since Insertion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatHours(realTimeMetrics.timeSinceInsertion)}
                </div>
                <p className="text-xs text-gray-500">
                  Inserted on {formatTimestamp(realTimeMetrics.productionMetrics.insertedAt)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Activity className="w-4 h-4 mr-1" />
                  Operating Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatHours(realTimeMetrics.productionMetrics.realTimeOperatingHours || realTimeMetrics.productionMetrics.operatingHours)}
                </div>
                <p className="text-xs text-gray-500">
                  {realTimeMetrics.productionMetrics.isOperating ? "Operating" : "Stopped"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Downtime
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatHours(metrics.productionMetrics.sectionDowntimeHours)}
                </div>
                <p className="text-xs text-gray-500">
                  {metrics.productionMetrics.breakdownCount} breakdown(s)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Section MTBF
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatHours(metrics.sectionMTBF)}
                </div>
                <p className="text-xs text-gray-500">Mean time between failures</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Timer className="w-4 h-4 mr-1" />
                  Section MTTR
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatHours(metrics.sectionMTTR)}
                </div>
                <p className="text-xs text-gray-500">Mean time to repair</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Gauge className="w-4 h-4 mr-1" />
                  Availability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">
                  {metrics.availability.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500">Availability rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Last activities information */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h5 className="font-medium text-sm text-gray-700 mb-2">Recent Activities</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Last startup:</span>
                <span className="ml-2 font-medium">
                  {formatTimestamp(metrics.productionMetrics.lastOperatingStart)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Last breakdown:</span>
                <span className="ml-2 font-medium">
                  {formatTimestamp(metrics.productionMetrics.lastBreakdownStart)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!metrics.productionMetrics.insertedAt && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <Factory className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>This equipment is not yet assigned to a production section.</p>
              <p className="text-sm">Production metrics will be available after assignment.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
