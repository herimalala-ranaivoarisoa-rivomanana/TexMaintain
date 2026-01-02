import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateProductionLine } from "@/api/productionLines"
import { useToast } from "@/hooks/useToast"
import { Loader2 } from "lucide-react"

interface ProductionStats {
    targetOutput: number
    actualOutput: number
    defectCount: number
    shiftDuration: number
}

interface UpdateStatsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    lineId: string
    currentStats?: ProductionStats
    onSuccess: () => void
}

export function UpdateStatsDialog({ open, onOpenChange, lineId, currentStats, onSuccess }: UpdateStatsDialogProps) {
    const [stats, setStats] = useState<ProductionStats>({
        targetOutput: 0,
        actualOutput: 0,
        defectCount: 0,
        shiftDuration: 480
    })
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        if (currentStats) {
            setStats({
                targetOutput: currentStats.targetOutput || 0,
                actualOutput: currentStats.actualOutput || 0,
                defectCount: currentStats.defectCount || 0,
                shiftDuration: currentStats.shiftDuration || 480
            })
        }
    }, [currentStats, open])

    const handleChange = (field: keyof ProductionStats, value: string) => {
        const numValue = parseInt(value) || 0
        setStats(prev => ({ ...prev, [field]: numValue }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await updateProductionLine(lineId, { stats })
            toast({
                title: "Success",
                description: "Production statistics updated successfully",
            })
            onSuccess()
            onOpenChange(false)
        } catch (error) {
            console.error('Error updating stats:', error)
            toast({
                title: "Error",
                description: "Failed to update statistics",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Update Production Statistics</DialogTitle>
                    <DialogDescription>
                        Enter the daily production figures for this line. These values are used to calculate OEE.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="target" className="text-right">
                            Target Output
                        </Label>
                        <Input
                            id="target"
                            type="number"
                            value={stats.targetOutput}
                            onChange={(e) => handleChange('targetOutput', e.target.value)}
                            className="col-span-3"
                            min="0"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="actual" className="text-right">
                            Actual Output
                        </Label>
                        <Input
                            id="actual"
                            type="number"
                            value={stats.actualOutput}
                            onChange={(e) => handleChange('actualOutput', e.target.value)}
                            className="col-span-3"
                            min="0"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="defects" className="text-right">
                            Defects
                        </Label>
                        <Input
                            id="defects"
                            type="number"
                            value={stats.defectCount}
                            onChange={(e) => handleChange('defectCount', e.target.value)}
                            className="col-span-3"
                            min="0"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="duration" className="text-right">
                            Shift (min)
                        </Label>
                        <Input
                            id="duration"
                            type="number"
                            value={stats.shiftDuration}
                            onChange={(e) => handleChange('shiftDuration', e.target.value)}
                            className="col-span-3"
                            min="0"
                        />
                    </div>
                </form>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="submit" onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
