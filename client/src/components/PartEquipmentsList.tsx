import { useState, useEffect } from 'react'
import { Settings, TrendingUp, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/useToast'
import {
  getEquipmentPartsByPart,
  type EquipmentPart,
  getCriticalityLabel,
  getCriticalityColor,
  getCriticalityIcon,
  formatReplacementFrequency,
  formatConsumption
} from '@/api/equipmentParts'
import { Link } from 'react-router-dom'

interface PartEquipmentsListProps {
  partId: string
}

export function PartEquipmentsList({ partId }: PartEquipmentsListProps) {
  const [associations, setAssociations] = useState<EquipmentPart[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'importance' | 'criticality' | 'consumption'>('importance')
  const { toast } = useToast()

  useEffect(() => {
    fetchAssociations()
  }, [partId])

  const fetchAssociations = async () => {
    try {
      setLoading(true)
      const response = await getEquipmentPartsByPart(partId)
      setAssociations(response.associations || [])
    } catch (error: any) {
      console.error('Error fetching part equipment:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les équipements',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const sortedAssociations = [...associations].sort((a, b) => {
    switch (sortBy) {
      case 'importance':
        return b.machineImportance - a.machineImportance
      case 'criticality':
        return b.criticalityScore - a.criticalityScore
      case 'consumption':
        return b.annualConsumption - a.annualConsumption
      default:
        return 0
    }
  }).filter(assoc => assoc && assoc.equipment)

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      in_production: 'bg-green-100 text-green-800',
      breakdown: 'bg-red-100 text-red-800',
      under_repair: 'bg-orange-100 text-orange-800',
      scheduled_maintenance: 'bg-blue-100 text-blue-800',
      offline: 'bg-gray-100 text-gray-800',
      stored: 'bg-slate-100 text-slate-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      in_production: 'In production',
      breakdown: 'Breakdown',
      under_repair: 'Under repair',
      scheduled_maintenance: 'Maintenance',
      offline: 'Offline',
      stored: 'Stored'
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Equipment using this part
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Equipment using this part
            {associations.length > 0 && (
              <Badge variant="secondary">{associations.length}</Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={sortBy === 'importance' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('importance')}
            >
              Importance
            </Button>
            <Button
              variant={sortBy === 'criticality' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('criticality')}
            >
              Criticality
            </Button>
            <Button
              variant={sortBy === 'consumption' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('consumption')}
            >
              Consumption
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {associations.length === 0 ? (
          <div className="text-center py-8">
            <Settings className="h-12 w-12 mx-auto text-slate-400 mb-3" />
            <p className="text-sm text-slate-600">
              This part is not associated with any equipment
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedAssociations.map((assoc) => {
              const criticalityColor = getCriticalityColor(assoc.criticality)
              const criticalityIcon = getCriticalityIcon(assoc.criticality)
              const statusColor = getStatusColor(assoc.equipment.status)

              return (
                <div
                  key={assoc._id}
                  className="border rounded-lg p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900">
                          {assoc.equipment.model}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {assoc.equipment.serialNumber}
                        </Badge>
                        <Badge className={statusColor}>
                          {getStatusLabel(assoc.equipment.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">
                        📍 {assoc.equipment.location}
                      </p>
                    </div>
                    <Link to={`/equipment?id=${assoc.equipment._id}`}>
                      <Button variant="ghost" size="sm">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Importance</p>
                      <div className="flex items-center gap-1">
                        <div className="flex-1 bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${assoc.machineImportance}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {assoc.machineImportance}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Criticality</p>
                      <Badge className={criticalityColor}>
                        {criticalityIcon} {getCriticalityLabel(assoc.criticality)}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Quantity</p>
                      <p className="text-sm font-medium">
                        {assoc.quantityPerMachine} piece(s)
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Frequency</p>
                      <p className="text-sm font-medium">
                        {formatReplacementFrequency(assoc.replacementFrequencyPerYear)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Annual consumption</p>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-blue-600" />
                        <p className="text-sm font-medium text-blue-600">
                          {formatConsumption(assoc.annualConsumption)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {assoc.notes && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-slate-500 mb-1">Notes</p>
                      <p className="text-sm text-slate-700">{assoc.notes}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
