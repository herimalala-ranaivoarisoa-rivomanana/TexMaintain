import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, Settings, CheckCircle, Clock, XCircle, Wrench } from "lucide-react"
import { changeEquipmentStatus, getAvailableStatuses } from "@/api/equipment"
import { useToast } from "@/hooks/useToast"

interface EquipmentStatusChangerProps {
  equipmentId: string
  currentStatus: string
  onStatusChanged: () => void
}

interface InterventionFormData {
  title: string
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  description: string
  assignedTo: string
}

interface ServiceReportData {
  reason: string
  notes: string
  recommendations: string
}

const statusConfig = {
  online: { color: "bg-green-500", icon: CheckCircle, label: "Online" },
  breakdown: { color: "bg-red-500", icon: AlertTriangle, label: "Breakdown" },
  offline: { color: "bg-gray-500", icon: Clock, label: "Offline" },
  maintenance: { color: "bg-yellow-500", icon: Wrench, label: "Maintenance" },
  scrapped: { color: "bg-black", icon: XCircle, label: "Scrapped" }
}

const statusLabels = {
  online: "Online",
  breakdown: "Breakdown", 
  offline: "Offline",
  maintenance: "Maintenance",
  scrapped: "Scrapped"
}

export function EquipmentStatusChanger({ equipmentId, currentStatus, onStatusChanged }: EquipmentStatusChangerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  // Formulaire d'intervention (pour breakdown)
  const [showInterventionForm, setShowInterventionForm] = useState(false)
  const [interventionData, setInterventionData] = useState<InterventionFormData>({
    title: "",
    priority: "High",
    description: "",
    assignedTo: ""
  })
  
  // Formulaire de rapport de service (pour maintenance -> offline/scrapped)
  const [showServiceReport, setShowServiceReport] = useState(false)
  const [serviceReport, setServiceReport] = useState<ServiceReportData>({
    reason: "",
    notes: "",
    recommendations: ""
  })

  const { toast } = useToast()

  const loadAvailableStatuses = async () => {
    try {
      const response = await getAvailableStatuses(equipmentId)
      setAvailableStatuses(response.availableStatuses)
    } catch (error) {
      console.error('Error loading available statuses:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les statuts disponibles",
        variant: "destructive"
      })
    }
  }

  useEffect(() => {
    if (isDialogOpen) {
      loadAvailableStatuses()
    }
  }, [isDialogOpen, equipmentId])

  const handleStatusClick = () => {
    setIsDialogOpen(true)
    setSelectedStatus("")
    setReason("")
    setNotes("")
    setShowInterventionForm(false)
    setShowServiceReport(false)
  }

  const handleStatusSelection = (status: string) => {
    setSelectedStatus(status)
    
    // Afficher le formulaire d'intervention pour breakdown
    if (status === 'breakdown') {
      setShowInterventionForm(true)
      setInterventionData({
        title: `Panne - Équipement ${equipmentId}`,
        priority: "High",
        description: "",
        assignedTo: ""
      })
    } else {
      setShowInterventionForm(false)
    }
    
    // Afficher le formulaire de rapport pour maintenance -> offline/scrapped
    if (currentStatus === 'maintenance' && (status === 'offline' || status === 'scrapped')) {
      setShowServiceReport(true)
      setServiceReport({
        reason: "",
        notes: "",
        recommendations: ""
      })
    } else {
      setShowServiceReport(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedStatus) return

    setIsLoading(true)
    
    try {
      const requestData: any = {
        newStatus: selectedStatus,
        reason,
        notes
      }

      // Add intervention data if needed
      if (showInterventionForm) {
        requestData.interventionData = interventionData
      }

      // Add service report data if needed
      if (showServiceReport) {
        requestData.reason = serviceReport.reason
        requestData.notes = `${serviceReport.notes}\n\nRecommendations: ${serviceReport.recommendations}`
      }

      await changeEquipmentStatus(equipmentId, requestData)
      
      toast({
        title: "Status Updated",
        description: `Equipment is now ${statusLabels[selectedStatus as keyof typeof statusLabels]}`,
      })
      
      setIsDialogOpen(false)
      onStatusChanged()
      
    } catch (error: any) {
      console.error('Error changing status:', error)
      toast({
        title: "Error",
        description: error.response?.data?.message || "Unable to change status",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const config = statusConfig[currentStatus as keyof typeof statusConfig]
  const Icon = config?.icon || Settings

  return (
    <>
      <Badge 
        className={`${config?.color} text-white cursor-pointer hover:opacity-80 transition-opacity`}
        onClick={handleStatusClick}
      >
        <Icon className="w-3 h-3 mr-1" />
        {config?.label || currentStatus}
      </Badge>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Change Equipment Status</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Current Status</Label>
              <div className="mt-1">
                <Badge className={`${config?.color} text-white`}>
                  <Icon className="w-3 h-3 mr-1" />
                  {config?.label}
                </Badge>
              </div>
            </div>

            <div>
              <Label htmlFor="newStatus">New Status</Label>
              <Select value={selectedStatus} onValueChange={handleStatusSelection}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {availableStatuses.map((status) => {
                    const statusConf = statusConfig[status as keyof typeof statusConfig]
                    const StatusIcon = statusConf?.icon || Settings
                    return (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center">
                          <StatusIcon className="w-4 h-4 mr-2" />
                          {statusLabels[status as keyof typeof statusLabels]}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Intervention form for breakdown */}
            {showInterventionForm && (
              <div className="border rounded-lg p-4 bg-red-50">
                <h4 className="font-semibold text-red-800 mb-3">Intervention Request</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="interventionTitle">Intervention Title</Label>
                    <Input
                      id="interventionTitle"
                      value={interventionData.title}
                      onChange={(e) => setInterventionData(prev => ({ ...prev, title: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="interventionPriority">Priority</Label>
                    <Select 
                      value={interventionData.priority} 
                      onValueChange={(value: 'Low' | 'Medium' | 'High' | 'Critical') => 
                        setInterventionData(prev => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="interventionDescription">Breakdown Description</Label>
                    <Textarea
                      id="interventionDescription"
                      value={interventionData.description}
                      onChange={(e) => setInterventionData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the observed breakdown..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="assignedTo">Assign to (optional)</Label>
                    <Input
                      id="assignedTo"
                      value={interventionData.assignedTo}
                      onChange={(e) => setInterventionData(prev => ({ ...prev, assignedTo: e.target.value }))}
                      placeholder="Technician name"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Service report form for maintenance */}
            {showServiceReport && (
              <div className="border rounded-lg p-4 bg-yellow-50">
                <h4 className="font-semibold text-yellow-800 mb-3">Maintenance Report</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="serviceReason">Reason for status change</Label>
                    <Input
                      id="serviceReason"
                      value={serviceReport.reason}
                      onChange={(e) => setServiceReport(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="e.g. Preventive maintenance completed"
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="serviceNotes">Service Notes</Label>
                    <Textarea
                      id="serviceNotes"
                      value={serviceReport.notes}
                      onChange={(e) => setServiceReport(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Details of operations performed..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="recommendations">Recommendations</Label>
                    <Textarea
                      id="recommendations"
                      value={serviceReport.recommendations}
                      onChange={(e) => setServiceReport(prev => ({ ...prev, recommendations: e.target.value }))}
                      placeholder="Recommendations for future use..."
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}

            {!showInterventionForm && !showServiceReport && (
              <>
                <div>
                  <Label htmlFor="reason">Raison du changement (optionnel)</Label>
                  <Input
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Raison du changement de statut"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes (optionnel)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes additionnelles..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!selectedStatus || isLoading || (showServiceReport && !serviceReport.reason)}
            >
              {isLoading ? "Changing..." : "Confirm Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
