import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateProductionSection } from "@/api/productionSections"
import { useToast } from "@/hooks/useToast"
import { Loader2 } from "lucide-react"

interface SectionData {
    name: string
    code: string
}

interface UpdateSectionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    sectionId: string
    currentData?: SectionData
    onSuccess: () => void
}

export function UpdateSectionDialog({ open, onOpenChange, sectionId, currentData, onSuccess }: UpdateSectionDialogProps) {
    const [data, setData] = useState<SectionData>({
        name: "",
        code: ""
    })
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        if (currentData) {
            setData({
                name: currentData.name || "",
                code: currentData.code || ""
            })
        }
    }, [currentData, open])

    const handleChange = (field: keyof SectionData, value: string) => {
        setData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await updateProductionSection(sectionId, data)
            toast({
                title: "Success",
                description: "Section updated successfully",
            })
            onSuccess()
            onOpenChange(false)
        } catch (error) {
            console.error('Error updating section:', error)
            toast({
                title: "Error",
                description: "Failed to update section",
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
                    <DialogTitle>Update Section Details</DialogTitle>
                    <DialogDescription>
                        Update the name and code for this production section.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="code" className="text-right">
                            Code
                        </Label>
                        <Input
                            id="code"
                            value={data.code}
                            onChange={(e) => handleChange('code', e.target.value)}
                            className="col-span-3"
                            required
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
