import { useState } from 'react'
import { Calendar, Package, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/useToast'
import { createOrder } from '@/api/inventory'

interface CreateOrderDialogProps {
  partId: string
  partName: string
  suggestedQuantity?: number
  defaultSupplier?: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateOrderDialog({
  partId,
  partName,
  suggestedQuantity = 0,
  defaultSupplier = '',
  open,
  onClose,
  onSuccess
}: CreateOrderDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    quantity: suggestedQuantity || 1,
    expectedDate: '',
    supplier: defaultSupplier,
    orderNumber: '',
    notes: ''
  })
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.quantity <= 0) {
      toast({
        title: 'Erreur',
        description: 'La quantité doit être supérieure à 0',
        variant: 'destructive'
      })
      return
    }

    try {
      setLoading(true)
      await createOrder(partId, {
        quantity: formData.quantity,
        expectedDate: formData.expectedDate || undefined,
        supplier: formData.supplier || undefined,
        orderNumber: formData.orderNumber || undefined,
        notes: formData.notes || undefined
      })

      toast({
        title: 'Order created',
        description: `Order for ${formData.quantity} piece(s) created successfully`
      })

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error creating order:', error)
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Impossible de créer la commande',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Créer une commande
          </DialogTitle>
          <DialogDescription>
            Commande pour: <strong>{partName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Quantité */}
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Quantité <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                required
              />
              {suggestedQuantity > 0 && (
                <p className="text-xs text-slate-500">
                  💡 Suggested quantity: {suggestedQuantity} piece(s)
                </p>
              )}
            </div>

            {/* Date attendue */}
            <div className="space-y-2">
              <Label htmlFor="expectedDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date de livraison attendue
              </Label>
              <Input
                id="expectedDate"
                type="date"
                value={formData.expectedDate}
                onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
              />
            </div>

            {/* Fournisseur */}
            <div className="space-y-2">
              <Label htmlFor="supplier">Fournisseur</Label>
              <Input
                id="supplier"
                type="text"
                placeholder="Nom du fournisseur"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              />
            </div>

            {/* Numéro de commande */}
            <div className="space-y-2">
              <Label htmlFor="orderNumber">Numéro de commande</Label>
              <Input
                id="orderNumber"
                type="text"
                placeholder="Ex: CMD-2025-001"
                value={formData.orderNumber}
                onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Notes additionnelles..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Création...' : 'Créer la commande'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
