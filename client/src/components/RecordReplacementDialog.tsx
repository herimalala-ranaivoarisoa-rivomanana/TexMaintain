import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/useToast'
import { recordReplacement, type EquipmentPart } from '@/api/equipmentParts'
import { AlertCircle } from 'lucide-react'

interface RecordReplacementDialogProps {
  equipmentPart: EquipmentPart
  onClose: () => void
  onSuccess: () => void
}

export function RecordReplacementDialog({
  equipmentPart,
  onClose,
  onSuccess
}: RecordReplacementDialogProps) {
  const [quantityUsed, setQuantityUsed] = useState(equipmentPart.quantityPerMachine)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const currentStock = equipmentPart.part.currentStock
  const newStock = currentStock - quantityUsed
  const isStockInsufficient = newStock < 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (quantityUsed <= 0) {
      toast({
        title: 'Erreur',
        description: 'La quantité doit être supérieure à 0',
        variant: 'destructive'
      })
      return
    }

    if (isStockInsufficient) {
      const confirmed = confirm(
        `⚠️ ATTENTION: Le stock actuel (${currentStock}) est insuffisant.\n\n` +
        `Le stock deviendra négatif (${newStock}).\n\n` +
        `Voulez-vous continuer quand même ?`
      )
      if (!confirmed) return
    }

    try {
      setSaving(true)
      await recordReplacement(equipmentPart._id, {
        quantityUsed,
        notes
      })

      toast({
        title: 'Enregistré',
        description: `Remplacement enregistré avec succès. Stock mis à jour: ${newStock}`
      })

      onSuccess()
    } catch (error: any) {
      console.error('Error recording replacement:', error)
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Impossible d\'enregistrer le remplacement',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enregistrer un remplacement</DialogTitle>
          <DialogDescription>
            {equipmentPart.part.name} ({equipmentPart.part.partNumber})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Informations de la pièce */}
          <div className="border rounded-lg p-3 bg-slate-50 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Équipement:</span>
              <span className="font-medium">{equipmentPart.equipment.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Stock actuel:</span>
              <span className="font-medium">{currentStock} pièce(s)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Quantité habituelle:</span>
              <span className="font-medium">{equipmentPart.quantityPerMachine} pièce(s)</span>
            </div>
          </div>

          {/* Quantité utilisée */}
          <div className="space-y-2">
            <Label htmlFor="quantityUsed">
              Quantité utilisée <span className="text-red-500">*</span>
            </Label>
            <Input
              id="quantityUsed"
              type="number"
              step="0.1"
              min="0.1"
              value={quantityUsed}
              onChange={(e) => setQuantityUsed(parseFloat(e.target.value) || 0)}
              required
              autoFocus
            />
          </div>

          {/* Aperçu du nouveau stock */}
          <div className={`border rounded-lg p-3 ${isStockInsufficient ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {isStockInsufficient && <AlertCircle className="inline h-4 w-4 mr-1 text-red-600" />}
                Nouveau stock:
              </span>
              <span className={`text-lg font-bold ${isStockInsufficient ? 'text-red-600' : 'text-green-600'}`}>
                {newStock} pièce(s)
              </span>
            </div>
            {isStockInsufficient && (
              <p className="text-xs text-red-600 mt-1">
                ⚠️ Stock insuffisant ! Le stock deviendra négatif.
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Raison du remplacement, observations..."
              rows={3}
            />
          </div>

          {/* Informations supplémentaires */}
          <div className="text-xs text-slate-500 space-y-1">
            <p>• La date du remplacement sera enregistrée automatiquement</p>
            <p>• La prochaine date de remplacement sera calculée</p>
            <p>• Le stock de la pièce sera décrémenté</p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
