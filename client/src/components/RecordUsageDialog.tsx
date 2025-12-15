import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/useToast'
import { recordUsage, type EquipmentPart } from '@/api/equipmentParts'

import { BeforeAfterMediaUpload } from './BeforeAfterMediaUpload'

interface RecordUsageDialogProps {
  equipmentPart: EquipmentPart
  onClose: () => void
  onSuccess: () => void
}

export function RecordUsageDialog({ equipmentPart, onClose, onSuccess }: RecordUsageDialogProps) {
  const [quantity, setQuantity] = useState(equipmentPart.quantityPerMachine)
  const [notes, setNotes] = useState('')
  const [mediaBefore, setMediaBefore] = useState<string[]>([])
  const [mediaAfter, setMediaAfter] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const currentStock = equipmentPart.part.currentStock || 0
  const newStock = Math.max(0, currentStock - quantity)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (quantity <= 0) {
      toast({
        title: 'Erreur',
        description: 'La quantité doit être supérieure à 0',
        variant: 'destructive'
      })
      return
    }

    if (quantity > currentStock) {
      toast({
        title: 'Erreur',
        description: 'La quantité utilisée ne peut pas dépasser le stock actuel',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsSubmitting(true)
      await recordUsage(equipmentPart._id, {
        quantityUsed: quantity,
        notes: notes.trim() || undefined,
        mediaBefore,
        mediaAfter
      })

      toast({
        title: 'Utilisation enregistrée',
        description: `${quantity} unité(s) de ${equipmentPart.part.name} enregistrée(s)`
      })

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error recording usage:', error)
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Impossible d\'enregistrer l\'utilisation',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>📝 Record usage</DialogTitle>
          <DialogDescription>
            {equipmentPart.part.name} ({equipmentPart.part.partNumber})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Informations sur l'équipement */}
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Équipement</p>
              <p className="font-medium">{equipmentPart.equipment.model}</p>
            </div>

            {/* Stock actuel et quantité habituelle */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-600">Stock actuel</Label>
                <p className="text-2xl font-bold text-slate-900">
                  {currentStock}
                </p>
                <p className="text-xs text-slate-500">
                  {equipmentPart.part.type === 'consumable' ? 'unit(s)' : 'piece(s)'}
                </p>
              </div>
              <div>
                <Label className="text-slate-600">Quantité habituelle</Label>
                <p className="text-2xl font-bold text-blue-600">
                  {equipmentPart.quantityPerMachine}
                </p>
                <p className="text-xs text-slate-500">
                  {equipmentPart.part.type === 'consumable' ? 'unit(s)' : 'piece(s)'}
                </p>
              </div>
            </div>

            {/* Quantité utilisée */}
            <div>
              <Label htmlFor="quantity">
                Quantité utilisée <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                step="0.1"
                min="0.1"
                max={currentStock}
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                required
                className="mt-1"
              />
            </div>

            {/* Nouveau stock */}
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <Label className="text-slate-600">Nouveau stock</Label>
              <p className="text-2xl font-bold text-green-700">
                {newStock.toFixed(1)}
              </p>
              <p className="text-xs text-slate-500">
                {equipmentPart.part.type === 'consumable' ? 'unité(s)' : 'pièce(s)'}
              </p>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Lubrification mensuelle, maintenance préventive..."
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Informations automatiques */}
            <Alert>
              <AlertDescription className="text-sm space-y-1">
                <p>• La date d'utilisation sera enregistrée automatiquement</p>
                <p>• La consommation sera tracée dans l'historique</p>
                <p>• Le stock du consommable sera décrémenté</p>
              </AlertDescription>
            </Alert>

            {/* Media Upload */}
            <div className="pt-2 border-t">
              <Label className="mb-2 block">Photos/Vidéos (Avant/Après)</Label>
              <BeforeAfterMediaUpload
                mediaBefore={mediaBefore}
                mediaAfter={mediaAfter}
                onMediaBeforeChange={setMediaBefore}
                onMediaAfterChange={setMediaAfter}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
