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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/useToast"
import { updateProcessDepartment } from "@/api/processDepartments"

interface UpdateDepartmentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    department: any
    onSuccess: () => void
}

export function UpdateDepartmentDialog({
    open,
    onOpenChange,
    department,
    onSuccess,
}: UpdateDepartmentDialogProps) {
    const { toast } = useToast()
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (department) {
            setName(department.name || "")
            setDescription(department.description || "")
        }
    }, [department])

    const handleSubmit = async () => {
        try {
            setLoading(true)
            await updateProcessDepartment(department._id, {
                name,
                description,
            })
            toast({
                title: "Success",
                description: "Department updated successfully",
            })
            onSuccess()
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "Failed to update department",
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
                    <DialogTitle>Edit Department</DialogTitle>
                    <DialogDescription>
                        Make changes to the department details here.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
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
