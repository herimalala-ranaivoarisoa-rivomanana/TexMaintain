import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Calendar, DollarSign, Plus, Loader2, TrendingUp, AlertTriangle } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getProjectDetails, getProjectExpenses, createProjectExpense, consumeProjectPart, ProjectDetails, ProjectExpense, CreateExpenseData } from "@/api/projects"
import { getInventory, Part } from "@/api/inventory"
import { toast } from "sonner"
import { format } from "date-fns"

export function ProjectDetailsPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [details, setDetails] = useState<ProjectDetails | null>(null)
    const [expenses, setExpenses] = useState<ProjectExpense[]>([])
    const [parts, setParts] = useState<Part[]>([])

    // Expense Form State
    const [isExpenseOpen, setIsExpenseOpen] = useState(false)
    const [expenseData, setExpenseData] = useState<CreateExpenseData>({
        description: '',
        category: 'Material',
        amount: 0,
        date: format(new Date(), 'yyyy-MM-dd')
    })

    // Part Consumption State
    const [isPartOpen, setIsPartOpen] = useState(false)
    const [selectedPartId, setSelectedPartId] = useState<string>('')
    const [partQuantity, setPartQuantity] = useState<number>(1)
    const [partDate, setPartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))

    const fetchData = async () => {
        if (!id) return
        try {
            const [detailsData, expensesData, inventoryData] = await Promise.all([
                getProjectDetails(id),
                getProjectExpenses(id),
                getInventory({ limit: 1000 }) // Fetch all parts for selection
            ])
            setDetails(detailsData)
            setExpenses(expensesData)
            setParts(inventoryData.parts)
        } catch (error) {
            console.error("Error fetching project details:", error)
            toast.error("Failed to load project details")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [id])

    const handleAddExpense = async () => {
        if (!id) return
        try {
            await createProjectExpense(id, expenseData)
            toast.success("Expense added successfully")
            setIsExpenseOpen(false)
            setExpenseData({
                description: '',
                category: 'Material',
                amount: 0,
                date: format(new Date(), 'yyyy-MM-dd')
            })
            fetchData()
        } catch (error) {
            toast.error("Failed to add expense")
        }
    }

    const handleConsumePart = async () => {
        if (!id || !selectedPartId) return
        try {
            await consumeProjectPart(id, {
                partId: selectedPartId,
                quantity: partQuantity,
                date: partDate
            })
            toast.success("Part consumed successfully")
            setIsPartOpen(false)
            setSelectedPartId('')
            setPartQuantity(1)
            fetchData()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to consume part")
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!details) {
        return <div>Project not found</div>
    }

    const { project, totalSpent } = details
    const budgetUsage = (totalSpent / project.budget) * 100
    const isOverBudget = totalSpent > project.budget
    const selectedPart = parts.find(p => p._id === selectedPartId)

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{project.title}</h1>
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <Badge variant="outline">{project.status}</Badge>
                        <span>•</span>
                        <span>{format(new Date(project.startDate), 'MMM d, yyyy')} - {format(new Date(project.endDate), 'MMM d, yyyy')}</span>
                    </div>
                </div>
            </div>

            {/* Budget Overview */}
            <Card className={isOverBudget ? "border-red-200 bg-red-50/30" : "border-slate-200"}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center justify-between">
                        <span>Budget Overview</span>
                        <span className={isOverBudget ? "text-red-600" : "text-green-600"}>
                            {budgetUsage.toFixed(1)}% Used
                        </span>
                    </CardTitle>
                    <CardDescription>
                        Total Budget: ${project.budget.toLocaleString()}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                            <span>Spent: ${totalSpent.toLocaleString()}</span>
                            <span>Remaining: ${(project.budget - totalSpent).toLocaleString()}</span>
                        </div>
                        <Progress
                            value={Math.min(budgetUsage, 100)}
                            className={`h-3 ${isOverBudget ? "bg-red-100" : "bg-slate-100"}`}
                            indicatorClassName={isOverBudget ? "bg-red-600" : "bg-green-600"}
                        />
                        {isOverBudget && (
                            <div className="flex items-center text-red-600 text-sm mt-2">
                                <AlertTriangle className="h-4 w-4 mr-1" />
                                Budget exceeded by ${(totalSpent - project.budget).toLocaleString()}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="expenses" className="w-full">
                <TabsList>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                    <TabsTrigger value="parts">Parts</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="expenses" className="space-y-4">
                    <div className="flex justify-end">
                        <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Expense
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add Project Expense</DialogTitle>
                                    <DialogDescription>Record a new cost for this project.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Input
                                            id="description"
                                            value={expenseData.description}
                                            onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}
                                            placeholder="e.g., Electrical wiring"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="amount">Amount ($)</Label>
                                            <Input
                                                id="amount"
                                                type="number"
                                                min="0"
                                                value={expenseData.amount}
                                                onChange={(e) => setExpenseData({ ...expenseData, amount: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="category">Category</Label>
                                            <Select
                                                value={expenseData.category}
                                                onValueChange={(val) => setExpenseData({ ...expenseData, category: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Material">Material</SelectItem>
                                                    <SelectItem value="Labor">Labor</SelectItem>
                                                    <SelectItem value="Service">Service</SelectItem>
                                                    <SelectItem value="Other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="date">Date</Label>
                                        <Input
                                            id="date"
                                            type="date"
                                            value={expenseData.date}
                                            onChange={(e) => setExpenseData({ ...expenseData, date: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsExpenseOpen(false)}>Cancel</Button>
                                    <Button onClick={handleAddExpense}>Add Expense</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Added By</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expenses.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                                No expenses recorded yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        expenses.map((expense) => (
                                            <TableRow key={expense._id}>
                                                <TableCell>{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                                                <TableCell className="font-medium">{expense.description}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{expense.category}</Badge>
                                                </TableCell>
                                                <TableCell className="text-slate-500">
                                                    {expense.createdBy?.firstName} {expense.createdBy?.lastName}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    ${expense.amount.toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="parts" className="space-y-4">
                    <div className="flex justify-end">
                        <Dialog open={isPartOpen} onOpenChange={setIsPartOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-gradient-to-r from-emerald-600 to-teal-600">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Use Part from Stock
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Consume Part</DialogTitle>
                                    <DialogDescription>Use a part from inventory for this project.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="part">Select Part</Label>
                                        <Select value={selectedPartId} onValueChange={setSelectedPartId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a part..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {parts.map((part) => (
                                                    <SelectItem key={part._id} value={part._id}>
                                                        {part.name} ({part.currentStock} in stock) - ${part.unitPrice}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {selectedPart && (
                                        <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-md">
                                            <p><strong>Available Stock:</strong> {selectedPart.currentStock}</p>
                                            <p><strong>Unit Price:</strong> ${selectedPart.unitPrice}</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="quantity">Quantity</Label>
                                            <Input
                                                id="quantity"
                                                type="number"
                                                min="1"
                                                max={selectedPart?.currentStock || 1}
                                                value={partQuantity}
                                                onChange={(e) => setPartQuantity(Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="partDate">Date</Label>
                                            <Input
                                                id="partDate"
                                                type="date"
                                                value={partDate}
                                                onChange={(e) => setPartDate(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {selectedPart && (
                                        <div className="text-right font-medium text-slate-900">
                                            Total Cost: ${(partQuantity * selectedPart.unitPrice).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsPartOpen(false)}>Cancel</Button>
                                    <Button onClick={handleConsumePart} disabled={!selectedPartId || !selectedPart || partQuantity > selectedPart.currentStock}>
                                        Confirm Usage
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Part</TableHead>
                                        <TableHead className="text-right">Quantity</TableHead>
                                        <TableHead className="text-right">Unit Cost</TableHead>
                                        <TableHead className="text-right">Total Cost</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expenses.filter(e => e.category === 'Material' && e.description.startsWith('Used')).length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                                No parts consumed yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        expenses
                                            .filter(e => e.category === 'Material' && e.description.startsWith('Used'))
                                            .map((expense) => (
                                                <TableRow key={expense._id}>
                                                    <TableCell>{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                                                    <TableCell className="font-medium">{expense.description}</TableCell>
                                                    <TableCell className="text-right">
                                                        {/* Extract quantity from description if possible, or just show '-' */}
                                                        -
                                                    </TableCell>
                                                    <TableCell className="text-right text-slate-500">
                                                        -
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        ${expense.amount.toLocaleString()}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history">
                    <Card>
                        <CardContent className="p-6 text-center text-slate-500">
                            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>Project history tracking coming soon.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
