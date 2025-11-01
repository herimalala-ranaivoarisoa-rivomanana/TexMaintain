import { useState, useEffect } from 'react'
import { Package, TrendingUp, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/useToast'
import {
  calculateGlobalStock,
  type GlobalStockResponse,
  getCriticalityLabel,
  getCriticalityIcon,
  formatConsumption
} from '@/api/equipmentParts'

interface GlobalStockCardProps {
  partId: string
}

export function GlobalStockCard({ partId }: GlobalStockCardProps) {
  const [data, setData] = useState<GlobalStockResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchGlobalStock()
  }, [partId])

  const fetchGlobalStock = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const response = await calculateGlobalStock(partId)
      setData(response)
    } catch (error: any) {
      console.error('Error calculating global stock:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de calculer le stock global',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getStatusConfig = (status: 'ok' | 'warning' | 'critical') => {
    const configs = {
      ok: {
        icon: <CheckCircle className="h-6 w-6" />,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        label: '✅ Stock OK',
        description: 'Le stock est au niveau requis'
      },
      warning: {
        icon: <AlertTriangle className="h-6 w-6" />,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        label: '⚠️ Attention',
        description: 'Le stock approche du point de réapprovisionnement'
      },
      critical: {
        icon: <AlertTriangle className="h-6 w-6" />,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: '🔴 Critique',
        description: 'Le stock est en dessous du niveau de sécurité'
      }
    }
    return configs[status]
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock Global
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">Calcul en cours...</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  const statusConfig = getStatusConfig(data.status)
  const deficit = data.globalStock.globalReorderPoint - data.part.currentStock
  const criticalityIcon = getCriticalityIcon(data.globalStock.weightedCriticalityLabel)

  return (
    <Card className={`${statusConfig.borderColor} border-2`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock Global
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchGlobalStock(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statut principal */}
        <div className={`${statusConfig.bgColor} ${statusConfig.borderColor} border rounded-lg p-4`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={statusConfig.color}>
              {statusConfig.icon}
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold ${statusConfig.color}`}>
                {statusConfig.label}
              </h3>
              <p className="text-sm text-slate-600">
                {statusConfig.description}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Stock actuel</p>
              <p className={`text-2xl font-bold ${statusConfig.color}`}>
                {data.part.currentStock}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Point de réappro</p>
              <p className="text-2xl font-bold text-slate-900">
                {data.globalStock.globalReorderPoint}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">
                {deficit > 0 ? 'Déficit' : 'Excédent'}
              </p>
              <p className={`text-2xl font-bold ${deficit > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {deficit > 0 ? `-${deficit}` : `+${Math.abs(deficit)}`}
              </p>
            </div>
          </div>
        </div>

        {/* Consommation */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Consommation
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500">Annuelle</p>
              <p className="text-sm font-medium">
                {formatConsumption(data.globalStock.totalAnnualConsumption)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Mensuelle</p>
              <p className="text-sm font-medium">
                {formatConsumption(data.globalStock.totalAnnualConsumption / 12)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Hebdomadaire</p>
              <p className="text-sm font-medium">
                {formatConsumption(data.globalStock.totalAnnualConsumption / 52)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Journalière</p>
              <p className="text-sm font-medium">
                {formatConsumption(data.globalStock.totalDailyConsumption)}
              </p>
            </div>
          </div>
        </div>

        {/* Stocks calculés */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3">📊 Stocks calculés</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Stock de sécurité</span>
              <span className="text-sm font-medium">
                {data.globalStock.globalSafetyStock} pièce(s)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Point de réapprovisionnement</span>
              <span className="text-sm font-medium">
                {data.globalStock.globalReorderPoint} pièce(s)
              </span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-sm font-semibold text-slate-900">
                Stock initial recommandé
              </span>
              <span className="text-lg font-bold text-blue-600">
                {data.globalStock.recommendedInitialStock} pièce(s)
              </span>
            </div>
          </div>
        </div>

        {/* Criticité moyenne */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3">⚖️ Criticité moyenne pondérée</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{criticalityIcon}</span>
              <div>
                <p className="font-semibold">
                  {getCriticalityLabel(data.globalStock.weightedCriticalityLabel)}
                </p>
                <p className="text-xs text-slate-500">
                  Score: {data.globalStock.weightedCriticality.toFixed(2)} / 4
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Équipements</p>
              <p className="text-lg font-bold">
                {data.globalStock.equipmentCount}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex-1 bg-slate-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-red-500 h-2 rounded-full"
                style={{ width: `${(data.globalStock.weightedCriticality / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Répartition par équipement */}
        {data.globalStock.details.length > 0 && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-sm mb-3">
              🏭 Répartition par équipement ({data.globalStock.details.length})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {data.globalStock.details.map((detail, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm p-2 hover:bg-slate-50 rounded"
                >
                  <div className="flex-1">
                    <p className="font-medium">{detail.equipment.model}</p>
                    <p className="text-xs text-slate-500">
                      {detail.equipment.serialNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-blue-600">
                      {formatConsumption(detail.annualConsumption)}/an
                    </p>
                    <p className="text-xs text-slate-500">
                      Importance: {detail.machineImportance}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {data.status !== 'ok' && (
          <div className="pt-4 border-t">
            <Button className="w-full" size="lg">
              🛒 Commander {deficit > 0 ? deficit : data.globalStock.recommendedInitialStock} pièce(s)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
