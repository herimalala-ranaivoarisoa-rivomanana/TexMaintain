import { useState, useEffect } from 'react'
import { AlertTriangle, Package, ShoppingCart, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/useToast'
import { getReorderAlerts, type ReorderAlert } from '@/api/equipmentParts'
import { Link } from 'react-router-dom'

interface ReorderAlertsWidgetProps {
  maxItems?: number
  showViewAll?: boolean
}

export function ReorderAlertsWidget({ maxItems = 5, showViewAll = true }: ReorderAlertsWidgetProps) {
  const [alerts, setAlerts] = useState<ReorderAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  const fetchAlerts = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const response = await getReorderAlerts()
      setAlerts(response.alerts || [])
    } catch (error: any) {
      console.error('Error fetching reorder alerts:', error)
      if (!isRefresh) {
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les alertes',
          variant: 'destructive'
        })
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
    
    // Rafraîchir toutes les 5 minutes
    const interval = setInterval(() => fetchAlerts(true), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const displayedAlerts = alerts.slice(0, maxItems)
  const criticalCount = alerts.filter(a => a.urgency === 'critical').length
  const warningCount = alerts.filter(a => a.urgency === 'warning').length

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertes de Réapprovisionnement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">Chargement...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertes de Réapprovisionnement
            {alerts.length > 0 && (
              <Badge variant="destructive">{alerts.length}</Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchAlerts(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {alerts.length > 0 && (
          <div className="flex gap-2 mt-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                🔴 {criticalCount} critique{criticalCount > 1 ? 's' : ''}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-orange-100 text-orange-800 text-xs">
                🟠 {warningCount} warning{warningCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-green-400 mb-3" />
            <p className="text-sm text-slate-600 font-medium text-green-700">
              ✅ Aucune alerte
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Tous les stocks sont au niveau requis
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedAlerts.map((alert) => (
              <div
                key={alert.part._id}
                className={`border rounded-lg p-3 ${
                  alert.urgency === 'critical'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-orange-50 border-orange-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">
                        {alert.urgency === 'critical' ? '🔴' : '🟠'}
                      </span>
                      <h4 className="font-semibold text-sm">
                        {alert.part.name}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600">
                      {alert.part.partNumber}
                    </p>
                  </div>
                  <Badge
                    variant={alert.urgency === 'critical' ? 'destructive' : 'default'}
                    className={alert.urgency === 'warning' ? 'bg-orange-500' : ''}
                  >
                    {alert.urgency === 'critical' ? 'CRITIQUE' : 'WARNING'}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                  <div>
                    <p className="text-slate-500">Stock actuel</p>
                    <p className="font-bold text-red-600">{alert.currentStock}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Requis</p>
                    <p className="font-bold">{alert.reorderPoint}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Déficit</p>
                    <p className="font-bold text-red-600">-{alert.deficit}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <p className="text-xs text-slate-600">
                    Utilisé sur {alert.equipmentCount} équipement{alert.equipmentCount > 1 ? 's' : ''}
                  </p>
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    Commander
                  </Button>
                </div>
              </div>
            ))}

            {alerts.length > maxItems && showViewAll && (
              <div className="pt-2 border-t">
                <Link to="/reorder-alerts">
                  <Button variant="outline" className="w-full" size="sm">
                    Voir toutes les alertes ({alerts.length})
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
