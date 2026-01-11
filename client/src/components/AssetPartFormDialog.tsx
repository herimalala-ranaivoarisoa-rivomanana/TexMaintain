import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/useToast'
import {
  createAssetPart,
  updateAssetPart,
  type AssetPart,
  type Criticality,
  getCriticalityLabel,
  formatConsumption
} from '@/api/assetParts'
import api from '@/api/api'

interface AssetPartFormDialogProps {
  assetId?: string
  editingPart: AssetPart | null
  onClose: (success?: boolean) => void
  type?: 'part' | 'consumable' // Type de pièce à afficher
}

interface Part {
  _id: string
  name: string
  partNumber: string
  category: string
  currentStock: number
}

export function AssetPartFormDialog({
  assetId,
  editingPart,
  onClose,
  type = 'part'
}: AssetPartFormDialogProps) {
  const id = assetId || '';
  const [parts, setParts] = useState<Part[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const [form, setForm] = useState({
    part: editingPart?.part._id || '',
    quantityPerMachine: editingPart?.quantityPerMachine || 1,
    replacementFrequencyPerYear: editingPart?.replacementFrequencyPerYear || 1,
    criticality: (editingPart?.criticality || 'medium') as Criticality,
    machineImportance: editingPart?.machineImportance || 50,
    leadTimeDays: editingPart?.leadTimeDays || 15,
    safetyCoefficient: editingPart?.safetyCoefficient || 1.4,
    isStandardPart: editingPart?.isStandardPart ?? true,
    notes: editingPart?.notes || '',
    duplicateToSameType: true // Par défaut activé pour création
  })

  // Calculs en temps réel
  const annualConsumption = form.quantityPerMachine * form.replacementFrequencyPerYear
  const dailyConsumption = annualConsumption / 365
  const safetyStock = Math.ceil(dailyConsumption * form.leadTimeDays * form.safetyCoefficient)
  const reorderPoint = Math.ceil(safetyStock + dailyConsumption * form.leadTimeDays)

  useEffect(() => {
    fetchParts()
  }, [])

  const fetchParts = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/inventory')
      // Filtrer par type (part ou consumable)
      const allParts = response.data.parts || []
      const filteredParts = allParts.filter((p: any) => p.type === type)
      setParts(filteredParts)
    } catch (error) {
      console.error('Error fetching parts:', error)
      toast({
        title: 'Erreur',
        description: 'Unable to load parts',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.part) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une pièce',
        variant: 'destructive'
      })
      return
    }

    try {
      setSaving(true)

      if (editingPart) {
        // Mise à jour
        const result = await updateAssetPart(editingPart._id, {
          quantityPerMachine: form.quantityPerMachine,
          replacementFrequencyPerYear: form.replacementFrequencyPerYear,
          criticality: form.criticality,
          machineImportance: form.machineImportance,
          leadTimeDays: form.leadTimeDays,
          safetyCoefficient: form.safetyCoefficient,
          isStandardPart: form.isStandardPart,
          notes: form.notes
        })

        const recalculatedMinMax = result.recalculatedMinMax
        const propagatedCount = result.propagatedCount || 0

        let description = 'Association updated successfully.'

        if (propagatedCount > 0) {
          description += ` Propagated to ${propagatedCount} asset(s) of the same sub-category.`
        }

        if (recalculatedMinMax) {
          description += ` Min/Max recalculated: ${recalculatedMinMax.minStock}/${recalculatedMinMax.maxStock}`
        }

        toast({
          title: 'Updated',
          description
        })
      } else {
        // Création
        if (!id) {
          toast({
            title: 'Erreur',
            description: 'Asset ID is required',
            variant: 'destructive'
          })
          return
        }

        const result = await createAssetPart({
          asset: id,
          part: form.part,
          quantityPerMachine: form.quantityPerMachine,
          replacementFrequencyPerYear: form.replacementFrequencyPerYear,
          criticality: form.criticality,
          machineImportance: form.machineImportance,
          leadTimeDays: form.leadTimeDays,
          safetyCoefficient: form.safetyCoefficient,
          isStandardPart: form.isStandardPart,
          notes: form.notes,
          duplicateToSameType: form.duplicateToSameType
        })

        const duplicatedCount = result.duplicatedCount || 0
        const recalculatedMinMax = result.recalculatedMinMax

        let description = duplicatedCount > 0
          ? `Association created and duplicated to ${duplicatedCount} asset(s) of the same sub-category.`
          : 'Association created successfully.'

        if (recalculatedMinMax) {
          description += ` Min/Max recalculated: ${recalculatedMinMax.minStock}/${recalculatedMinMax.maxStock}`
        }

        toast({
          title: 'Created',
          description
        })
      }

      onClose(true)
    } catch (error: any) {
      console.error('Error saving asset part:', error)
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Impossible de sauvegarder',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingPart
              ? `Modifier ${type === 'part' ? 'la pièce' : 'le consommable'}`
              : `Ajouter ${type === 'part' ? 'une pièce' : 'un consommable'}`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sélection de la pièce */}
          <div className="space-y-2">
            <Label htmlFor="part">
              {type === 'part' ? 'Pièce' : 'Consommable'} <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.part}
              onValueChange={(value) => setForm({ ...form, part: value })}
              disabled={!!editingPart || loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une pièce" />
              </SelectTrigger>
              <SelectContent>
                {parts.map((part) => (
                  <SelectItem key={part._id} value={part._id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{part.name}</span>
                      <span className="text-xs text-slate-500">
                        {part.partNumber} - Stock: {part.currentStock}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Paramètres de consommation */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-sm">Paramètres de consommation</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantityPerMachine">
                  Quantité par remplacement <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="quantityPerMachine"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={form.quantityPerMachine}
                  onChange={(e) => setForm({ ...form, quantityPerMachine: parseFloat(e.target.value) || 0 })}
                  required
                />
                <p className="text-xs text-slate-500">
                  Number of pieces used during a replacement
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="replacementFrequencyPerYear">
                  Fréquence par an <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="replacementFrequencyPerYear"
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.replacementFrequencyPerYear}
                  onChange={(e) => setForm({ ...form, replacementFrequencyPerYear: parseFloat(e.target.value) || 0 })}
                  required
                />
                <p className="text-xs text-slate-500">
                  Ex: 2 = 2 times/year, 0.5 = every 2 years
                </p>
              </div>
            </div>
          </div>

          {/* Criticité et importance */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-sm">Criticité et importance</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="criticality">
                  Criticité <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.criticality}
                  onValueChange={(value: Criticality) => setForm({ ...form, criticality: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🔵 {getCriticalityLabel('low')}</SelectItem>
                    <SelectItem value="medium">🟡 {getCriticalityLabel('medium')}</SelectItem>
                    <SelectItem value="high">🟠 {getCriticalityLabel('high')}</SelectItem>
                    <SelectItem value="critical">🔴 {getCriticalityLabel('critical')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="machineImportance">
                  Importance machine (1-100) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="machineImportance"
                  type="number"
                  min="1"
                  max="100"
                  value={form.machineImportance}
                  onChange={(e) => setForm({ ...form, machineImportance: parseInt(e.target.value) || 50 })}
                  required
                />
                <p className="text-xs text-slate-500">
                  Poids de cet équipement dans la production
                </p>
              </div>
            </div>
          </div>

          {/* Délais et sécurité */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-sm">Délais et sécurité</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leadTimeDays">
                  Délai d'appro (jours)
                </Label>
                <Input
                  id="leadTimeDays"
                  type="number"
                  min="0"
                  value={form.leadTimeDays}
                  onChange={(e) => setForm({ ...form, leadTimeDays: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="safetyCoefficient">
                  Coefficient de sécurité
                </Label>
                <Input
                  id="safetyCoefficient"
                  type="number"
                  step="0.1"
                  min="1"
                  max="3"
                  value={form.safetyCoefficient}
                  onChange={(e) => setForm({ ...form, safetyCoefficient: parseFloat(e.target.value) || 1 })}
                />
                <p className="text-xs text-slate-500">
                  1.2 = +20%, 1.4 = +40%, 1.5 = +50%
                </p>
              </div>
            </div>
          </div>

          {/* Calculs en temps réel */}
          <div className="border rounded-lg p-4 bg-blue-50 space-y-2">
            <h3 className="font-semibold text-sm text-blue-900">📊 Calculs automatiques</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-600">Consommation annuelle</p>
                <p className="font-semibold text-blue-900">
                  {formatConsumption(annualConsumption)}
                </p>
              </div>
              <div>
                <p className="text-slate-600">Consommation journalière</p>
                <p className="font-semibold text-blue-900">
                  {formatConsumption(dailyConsumption)}
                </p>
              </div>
              <div>
                <p className="text-slate-600">Stock de sécurité</p>
                <p className="font-semibold text-blue-900">
                  {safetyStock} pièce(s)
                </p>
              </div>
              <div>
                <p className="text-slate-600">Point de réappro</p>
                <p className="font-semibold text-blue-900">
                  {reorderPoint} pièce(s)
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notes et observations..."
              rows={3}
            />
          </div>

          {/* Option de duplication (uniquement en création) */}
          {!editingPart && (
            <Alert>
              <AlertDescription>
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="duplicateToSameType"
                    checked={form.duplicateToSameType}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, duplicateToSameType: checked as boolean })
                    }
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor="duplicateToSameType"
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      Duplicate to all assets of the same sub-category
                    </Label>
                    <p className="text-sm text-slate-500">
                      This association will be automatically created for all existing
                      and future assets of the same sub-category with the same parameters.
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose()}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : editingPart ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
