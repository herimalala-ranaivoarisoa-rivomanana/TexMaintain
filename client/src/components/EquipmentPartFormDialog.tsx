import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { useToast } from '@/hooks/useToast'
import {
  createEquipmentPart,
  updateEquipmentPart,
  type EquipmentPart,
  type Criticality,
  getCriticalityLabel,
  formatConsumption
} from '@/api/equipmentParts'
import api from '@/api/api'

interface EquipmentPartFormDialogProps {
  equipmentId: string
  editingPart: EquipmentPart | null
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

export function EquipmentPartFormDialog({
  equipmentId,
  editingPart,
  onClose,
  type = 'part'
}: EquipmentPartFormDialogProps) {
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
    notes: editingPart?.notes || ''
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
        description: 'Impossible de charger les pièces',
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
        await updateEquipmentPart(editingPart._id, {
          quantityPerMachine: form.quantityPerMachine,
          replacementFrequencyPerYear: form.replacementFrequencyPerYear,
          criticality: form.criticality,
          machineImportance: form.machineImportance,
          leadTimeDays: form.leadTimeDays,
          safetyCoefficient: form.safetyCoefficient,
          isStandardPart: form.isStandardPart,
          notes: form.notes
        })
        toast({
          title: 'Modifié',
          description: 'Association modifiée avec succès'
        })
      } else {
        // Création
        await createEquipmentPart({
          equipment: equipmentId,
          part: form.part,
          quantityPerMachine: form.quantityPerMachine,
          replacementFrequencyPerYear: form.replacementFrequencyPerYear,
          criticality: form.criticality,
          machineImportance: form.machineImportance,
          leadTimeDays: form.leadTimeDays,
          safetyCoefficient: form.safetyCoefficient,
          isStandardPart: form.isStandardPart,
          notes: form.notes
        })
        toast({
          title: 'Créé',
          description: 'Association créée avec succès'
        })
      }

      onClose(true)
    } catch (error: any) {
      console.error('Error saving equipment part:', error)
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
                  Nombre de pièces utilisées lors d'un remplacement
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
                  Ex: 2 = 2 fois/an, 0.5 = tous les 2 ans
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
