import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/useToast"
import { updateProcessArea } from "@/api/processAreas"

interface UpdateProcessAreaStatsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    processArea: any
    onSuccess: () => void
}

export function UpdateProcessAreaStatsDialog({
    open,
    onOpenChange,
    processArea,
    onSuccess,
}: UpdateProcessAreaStatsDialogProps) {
    const { toast } = useToast()
    const [targetOutput, setTargetOutput] = useState("")
    const [actualOutput, setActualOutput] = useState("")
    const [defectCount, setDefectCount] = useState("")
    const [shiftDuration, setShiftDuration] = useState("")
    const [plannedDowntime, setPlannedDowntime] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (processArea?.stats) {
            setTargetOutput(processArea.stats.targetOutput?.toString() || "0")
            setActualOutput(processArea.stats.actualOutput?.toString() || "0")
            setDefectCount(processArea.stats.defectCount?.toString() || "0")
            setShiftDuration(processArea.stats.shiftDuration?.toString() || "480")
            setPlannedDowntime(processArea.stats.plannedDowntime?.toString() || "0")
        }
    }, [processArea])

    const handleSubmit = async () => {
        try {
            setLoading(true)
            await updateProcessArea(processArea._id, {
                stats: {
                    targetOutput: Number(targetOutput),
                    actualOutput: Number(actualOutput),
                    defectCount: Number(defectCount),
                    shiftDuration: Number(shiftDuration),
                    plannedDowntime: Number(plannedDowntime),
                    lastUpdated: new Date().toISOString(),
                }
            })
            toast({
                title: "Success",
                description: "Statistics updated successfully",
            })
            onSuccess()
            onOpenChange(false)
        } catch (error) {
            console.error(error)
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
                    <DialogTitle>Update Area Statistics</DialogTitle>
                    <DialogDescription>
                        Update KPI targets and actual values for this process area.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="targetOutput">Target Output</Label>
                            <Input
                                id="targetOutput"
                                type="number"
                                value={targetOutput}
                                onChange={(e) => setTargetOutput(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="actualOutput">Actual Output</Label>
                            <Input
                                id="actualOutput"
                                type="number"
                                value={actualOutput}
                                onChange={(e) => setActualOutput(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="defectCount">Defect Count</Label>
                            <Input
                                id="defectCount"
                                type="number"
                                value={defectCount}
                                onChange={(e) => setDefectCount(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="shiftDuration">Shift Duration (min)</Label>
                            <Input
                                id="shiftDuration"
                                type="number"
                                value={shiftDuration}
                                onChange={(e) => setShiftDuration(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="plannedDowntime">Planned Downtime (min)</Label>
                        <Input
                            id="plannedDowntime"
                            type="number"
                            value={plannedDowntime}
                            onChange={(e) => setPlannedDowntime(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        Save changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
