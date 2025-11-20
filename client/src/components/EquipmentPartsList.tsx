import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Package, AlertCircle, CheckCircle, Clock, ExternalLink, ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/useToast'
import {
  getEquipmentPartsByEquipment,
  deleteEquipmentPart,
  type EquipmentPart,
  getCriticalityLabel,
  getCriticalityColor,
  getCriticalityIcon,
  formatReplacementFrequency,
  formatConsumption,
  getDaysUntilReplacement,
  isReplacementOverdue,
  isReplacementDueSoon
} from '@/api/equipmentParts'
import { EquipmentPartFormDialog } from './EquipmentPartFormDialog'
import { RecordReplacementDialog } from './RecordReplacementDialog'
import { RecordUsageDialog } from './RecordUsageDialog'

interface EquipmentPartsListProps {
  equipmentId: string
  type?: 'part' | 'consumable' // Filtre par type
}

// Fonction pour calculer le statut du stock
const getStockStatus = (currentStock: number, minStock: number, maxStock: number) => {
  if (currentStock <= minStock * 0.5) {
    return {
      status: 'critical',
      label: 'Critical',
      color: 'bg-red-100 text-red-800 border-red-300',
      icon: '🔴',
      needsOrder: true
    }
  }
  if (currentStock <= minStock) {
    return {
      status: 'low',
      label: 'Low',
      color: 'bg-orange-100 text-orange-800 border-orange-300',
      icon: '🟠',
      needsOrder: true
    }
  }
  if (currentStock >= maxStock * 0.9 && maxStock > 0) {
    return {
      status: 'high',
      label: 'High',
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: '🔵',
      needsOrder: false
    }
  }
  return {
    status: 'normal',
    label: 'Normal',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: '🟢',
    needsOrder: false
  }
}

export function EquipmentPartsList({ equipmentId, type = 'part' }: EquipmentPartsListProps) {
  const [parts, setParts] = useState<EquipmentPart[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPart, setEditingPart] = useState<EquipmentPart | null>(null)
  const [recordingReplacementFor, setRecordingReplacementFor] = useState<EquipmentPart | null>(null)
  const [recordingUsageFor, setRecordingUsageFor] = useState<EquipmentPart | null>(null)
  const { toast } = useToast()

  // Labels selon le type
  const typeLabel = type === 'part' ? 'Spare Parts' : 'Consumables'
  const typeLabelSingular = type === 'part' ? 'part' : 'consumable'
  const actionLabel = type === 'part' ? '📝 Record a replacement' : '📝 Record usage'

  const fetchParts = async () => {
    try {
      setLoading(true)
      const response = await getEquipmentPartsByEquipment(equipmentId)
      console.log('📦 Response from API:', response)
      
      // Filtrer par type (part ou consumable)
      const allParts = response.associations || []
      console.log('📦 All parts before filter:', allParts.length)
      console.log('📦 Filtering by type:', type)
      
      const filteredParts = allParts.filter((assoc: EquipmentPart) => {
        console.log('📦 Part type:', assoc.part?.type, 'Expected:', type)
        return assoc.part?.type === type
      })
      
      console.log('📦 Filtered parts:', filteredParts.length)
      setParts(filteredParts)
    } catch (error: any) {
      console.error('❌ Error fetching equipment parts:', error)
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Unable to load parts',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchParts()
  }, [equipmentId, type])

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette association ?')) return

    try {
      await deleteEquipmentPart(id)
      toast({
        title: 'Supprimé',
        description: 'Association supprimée avec succès'
      })
      fetchParts()
    } catch (error: any) {
      console.error('Error deleting equipment part:', error)
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Impossible de supprimer',
        variant: 'destructive'
      })
    }
  }

  const handleEdit = (part: EquipmentPart) => {
    setEditingPart(part)
    setIsFormOpen(true)
  }

  const handleAdd = () => {
    setEditingPart(null)
    setIsFormOpen(true)
  }

  const handleFormClose = (success?: boolean) => {
    setIsFormOpen(false)
    setEditingPart(null)
    if (success) {
      fetchParts()
    }
  }

  const handleRecordReplacement = (part: EquipmentPart) => {
    setRecordingReplacementFor(part)
  }

  const handleRecordUsage = (part: EquipmentPart) => {
    setRecordingUsageFor(part)
  }

  const handleReplacementRecorded = () => {
    setRecordingReplacementFor(null)
    fetchParts()
  }

  const handleUsageRecorded = () => {
    setRecordingUsageFor(null)
    fetchParts()
  }

  const getReplacementStatus = (part: EquipmentPart) => {
    if (!part.nextReplacementDate) return null

    const days = getDaysUntilReplacement(part.nextReplacementDate)
    if (days === null) return null

    if (days < 0) {
      return {
        label: `Overdue by ${Math.abs(days)} day(s)`,
        color: 'text-red-600 bg-red-50',
        icon: <AlertCircle className="h-4 w-4" />
      }
    }

    if (days <= 7) {
      return {
        label: `In ${days} day(s)`,
        color: 'text-orange-600 bg-orange-50',
        icon: <Clock className="h-4 w-4" />
      }
    }

    return {
      label: `In ${days} day(s)`,
      color: 'text-green-600 bg-green-50',
      icon: <CheckCircle className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {typeLabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {typeLabel}
              {parts.length > 0 && (
                <Badge variant="secondary">{parts.length}</Badge>
              )}
            </CardTitle>
            <Button onClick={handleAdd} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {parts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-slate-400 mb-3" />
              <p className="text-sm text-slate-600">
                No {typeLabelSingular} associated with this equipment
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Use the "Add" button above to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {parts.map((part) => {
                const replacementStatus = getReplacementStatus(part)
                const criticalityColor = getCriticalityColor(part.criticality)
                const criticalityIcon = getCriticalityIcon(part.criticality)

                // Calculer le statut du stock
                const stockStatus = getStockStatus(
                  part.part.currentStock || 0,
                  part.part.minStock || 0,
                  part.part.maxStock || 0
                )

                return (
                  <div
                    key={part._id}
                    className="border rounded-lg p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-slate-900">
                            {part.part.name}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {part.part.partNumber}
                          </Badge>
                          <Link to={`/inventory/${part.part._id}`}>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">
                          {part.part.category}
                        </p>
                        {/* Statut du stock */}
                        <div className="flex items-center gap-2">
                          <Badge className={`${stockStatus.color} text-xs`}>
                            {stockStatus.icon} {stockStatus.label}
                          </Badge>
                          <span className="text-sm font-medium">
                            Stock: {part.part.currentStock || 0}
                          </span>
                          {stockStatus.needsOrder && (
                            <Link to={`/inventory/${part.part._id}`}>
                              <Button variant="outline" size="sm" className="h-6 text-xs">
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                Order
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(part)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(part._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Informations de stock */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-xs text-slate-500">Current stock</p>
                        <p className="text-sm font-bold text-slate-900">
                          {part.part.currentStock || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Min stock</p>
                        <p className="text-sm font-medium text-orange-600">
                          {part.part.minStock || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Max stock</p>
                        <p className="text-sm font-medium text-green-600">
                          {part.part.maxStock || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Unit price</p>
                        <p className="text-sm font-medium">
                          {part.part.unitPrice || 0} €
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <div>
                        <p className="text-xs text-slate-500">Quantity</p>
                        <p className="text-sm font-medium">
                          {part.quantityPerMachine} piece(s)
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Frequency</p>
                        <p className="text-sm font-medium">
                          {formatReplacementFrequency(part.replacementFrequencyPerYear)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Criticality</p>
                        <Badge className={criticalityColor}>
                          {criticalityIcon} {getCriticalityLabel(part.criticality)}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Importance</p>
                        <p className="text-sm font-medium">
                          {part.machineImportance}/100
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 pt-3 border-t">
                      <div>
                        <p className="text-xs text-slate-500">Annual consumption</p>
                        <p className="text-sm font-medium">
                          {formatConsumption(part.annualConsumption)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Daily consumption</p>
                        <p className="text-sm font-medium">
                          {formatConsumption(part.dailyConsumption)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Safety stock</p>
                        <p className="text-sm font-medium">
                          {part.safetyStock} piece(s)
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Reorder point</p>
                        <p className="text-sm font-medium">
                          {part.reorderPoint} piece(s)
                        </p>
                      </div>
                    </div>

                    {part.lastReplacementDate && (
                      <div className="pt-3 border-t">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">
                              Last replacement
                            </p>
                            <p className="text-sm">
                              {new Date(part.lastReplacementDate).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          {replacementStatus && (
                            <div>
                              <p className="text-xs text-slate-500 mb-1">
                                Next replacement
                              </p>
                              <Badge className={replacementStatus.color}>
                                {replacementStatus.icon}
                                <span className="ml-1">{replacementStatus.label}</span>
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (type === 'part') {
                            handleRecordReplacement(part)
                          } else {
                            handleRecordUsage(part)
                          }
                        }}
                        className="w-full"
                      >
                        {actionLabel}
                      </Button>
                    </div>

                    {part.notes && (
                      <div className="pt-3 border-t mt-3">
                        <p className="text-xs text-slate-500 mb-1">Notes</p>
                        <p className="text-sm text-slate-700">{part.notes}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {isFormOpen && (
        <EquipmentPartFormDialog
          equipmentId={equipmentId}
          editingPart={editingPart}
          onClose={handleFormClose}
          type={type}
        />
      )}

      {recordingReplacementFor && (
        <RecordReplacementDialog
          equipmentPart={recordingReplacementFor}
          onClose={() => setRecordingReplacementFor(null)}
          onSuccess={handleReplacementRecorded}
        />
      )}

      {recordingUsageFor && (
        <RecordUsageDialog
          equipmentPart={recordingUsageFor}
          onClose={() => setRecordingUsageFor(null)}
          onSuccess={handleUsageRecorded}
        />
      )}
    </>
  )
}
