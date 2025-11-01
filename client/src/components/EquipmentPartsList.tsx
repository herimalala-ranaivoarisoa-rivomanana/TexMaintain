import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Package, AlertCircle, CheckCircle, Clock } from 'lucide-react'
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

interface EquipmentPartsListProps {
  equipmentId: string
  type?: 'part' | 'consumable' // Filtre par type
}

export function EquipmentPartsList({ equipmentId, type = 'part' }: EquipmentPartsListProps) {
  const [parts, setParts] = useState<EquipmentPart[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPart, setEditingPart] = useState<EquipmentPart | null>(null)
  const [recordingReplacementFor, setRecordingReplacementFor] = useState<EquipmentPart | null>(null)
  const { toast } = useToast()

  // Labels selon le type
  const typeLabel = type === 'part' ? 'Pièces de Rechange' : 'Consommables'
  const typeLabelSingular = type === 'part' ? 'pièce' : 'consommable'

  const fetchParts = async () => {
    try {
      setLoading(true)
      const response = await getEquipmentPartsByEquipment(equipmentId)
      // Filtrer par type (part ou consumable)
      const allParts = response.associations || []
      const filteredParts = allParts.filter((assoc: EquipmentPart) => assoc.part.type === type)
      setParts(filteredParts)
    } catch (error: any) {
      console.error('Error fetching equipment parts:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les pièces',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchParts()
  }, [equipmentId])

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

  const handleReplacementRecorded = () => {
    setRecordingReplacementFor(null)
    fetchParts()
  }

  const getReplacementStatus = (part: EquipmentPart) => {
    if (!part.nextReplacementDate) return null

    const days = getDaysUntilReplacement(part.nextReplacementDate)
    if (days === null) return null

    if (days < 0) {
      return {
        label: `En retard de ${Math.abs(days)} jour(s)`,
        color: 'text-red-600 bg-red-50',
        icon: <AlertCircle className="h-4 w-4" />
      }
    }

    if (days <= 7) {
      return {
        label: `Dans ${days} jour(s)`,
        color: 'text-orange-600 bg-orange-50',
        icon: <Clock className="h-4 w-4" />
      }
    }

    return {
      label: `Dans ${days} jour(s)`,
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
          <p className="text-sm text-slate-500">Chargement...</p>
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
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {parts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-slate-400 mb-3" />
              <p className="text-sm text-slate-600 mb-4">
                Aucun {typeLabelSingular} associé à cet équipement
              </p>
              <Button onClick={handleAdd} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un {typeLabelSingular}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {parts.map((part) => {
                const replacementStatus = getReplacementStatus(part)
                const criticalityColor = getCriticalityColor(part.criticality)
                const criticalityIcon = getCriticalityIcon(part.criticality)

                return (
                  <div
                    key={part._id}
                    className="border rounded-lg p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-slate-900">
                            {part.part.name}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {part.part.partNumber}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">
                          {part.part.category}
                        </p>
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

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <div>
                        <p className="text-xs text-slate-500">Quantité</p>
                        <p className="text-sm font-medium">
                          {part.quantityPerMachine} pièce(s)
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Fréquence</p>
                        <p className="text-sm font-medium">
                          {formatReplacementFrequency(part.replacementFrequencyPerYear)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Criticité</p>
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
                        <p className="text-xs text-slate-500">Conso. annuelle</p>
                        <p className="text-sm font-medium">
                          {formatConsumption(part.annualConsumption)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Conso. journalière</p>
                        <p className="text-sm font-medium">
                          {formatConsumption(part.dailyConsumption)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Stock sécurité</p>
                        <p className="text-sm font-medium">
                          {part.safetyStock} pièce(s)
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Point réappro</p>
                        <p className="text-sm font-medium">
                          {part.reorderPoint} pièce(s)
                        </p>
                      </div>
                    </div>

                    {part.lastReplacementDate && (
                      <div className="pt-3 border-t">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">
                              Dernier remplacement
                            </p>
                            <p className="text-sm">
                              {new Date(part.lastReplacementDate).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          {replacementStatus && (
                            <div>
                              <p className="text-xs text-slate-500 mb-1">
                                Prochain remplacement
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
                        onClick={() => handleRecordReplacement(part)}
                        className="w-full"
                      >
                        📝 Enregistrer un remplacement
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
    </>
  )
}
