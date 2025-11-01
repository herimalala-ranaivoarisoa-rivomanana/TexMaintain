import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertCircle, 
  CheckCircle, 
  Wrench, 
  Package, 
  Search,
  ClipboardCheck,
  Archive,
  Power,
  Trash,
  Play,
  Settings,
  Pause,
  RefreshCw,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { changeEquipmentStatus, getAllowedTransitions } from '@/api/equipment';
import { getMachinists } from '@/api/machinists';
import { getMechanics } from '@/api/mechanics';
import { getElectricians } from '@/api/electricians';
import { getMaintenanceWorkers } from '@/api/maintenanceWorkers';
import { useToast } from '@/hooks/useToast';
import type { EquipmentStatus, StatusTransition } from '@/types/equipment';
import { getStatusColor, getStatusLabel } from '@/types/equipment';

interface EquipmentStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string;
  currentStatus: EquipmentStatus;
  equipmentName: string;
  onStatusChanged?: () => void;
}

const statusIcons: Record<string, any> = {
  in_production: Play,
  setup_adjustment: Settings,
  paused_by_operator: Pause,
  changeover: RefreshCw,
  scheduled_maintenance: Calendar,
  breakdown: AlertTriangle,
  under_repair: Wrench,
  in_workshop: Wrench,
  waiting_spare_parts: Package,
  testing_after_repair: CheckCircle,
  under_inspection: Search,
  pending_validation: ClipboardCheck,
  stored: Archive,
  offline: Power,
  scrapped: Trash
};

export function EquipmentStatusDialog({
  open,
  onOpenChange,
  equipmentId,
  currentStatus,
  equipmentName,
  onStatusChanged
}: EquipmentStatusDialogProps) {
  const [allowedTransitions, setAllowedTransitions] = useState<StatusTransition[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<EquipmentStatus | ''>('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTransitions, setLoadingTransitions] = useState(false);
  
  // Machinist for production
  const [machinists, setMachinists] = useState<any[]>([]);
  const [selectedMachinist, setSelectedMachinist] = useState('');
  
  // Maintenance personnel
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [electricians, setElectricians] = useState<any[]>([]);
  const [maintenanceWorkers, setMaintenanceWorkers] = useState<any[]>([]);
  const [selectedMechanic, setSelectedMechanic] = useState('');
  const [selectedElectrician, setSelectedElectrician] = useState('');
  const [selectedMaintenanceWorker, setSelectedMaintenanceWorker] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    if (open && equipmentId) {
      fetchAllowedTransitions();
      fetchMachinists();
      fetchMaintenancePersonnel();
    }
  }, [open, equipmentId]);

  // Debug: Log when selectedStatus changes
  useEffect(() => {
    const maintenanceStatuses = ['under_repair', 'under_inspection', 'scheduled_maintenance'];
    const isRequired = maintenanceStatuses.includes(selectedStatus);
    console.log('Selected Status:', selectedStatus);
    console.log('Is Maintenance Personnel Required:', isRequired);
    console.log('Mechanics:', mechanics.length);
    console.log('Electricians:', electricians.length);
    console.log('Maintenance Workers:', maintenanceWorkers.length);
  }, [selectedStatus, mechanics, electricians, maintenanceWorkers]);

  const fetchAllowedTransitions = async () => {
    try {
      setLoadingTransitions(true);
      const response = await getAllowedTransitions(equipmentId);
      setAllowedTransitions(response.transitions || []);
    } catch (error) {
      console.error('Error fetching allowed transitions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load available status transitions',
        variant: 'destructive'
      });
    } finally {
      setLoadingTransitions(false);
    }
  };

  const fetchMachinists = async () => {
    try {
      const response = await getMachinists({ isActive: true, limit: 100 });
      setMachinists(response.machinists || []);
    } catch (error) {
      console.error('Error fetching machinists:', error);
    }
  };

  const fetchMaintenancePersonnel = async () => {
    try {
      const [mechanicsRes, electriciansRes, workersRes] = await Promise.all([
        getMechanics({ isActive: true }),
        getElectricians({ isActive: true }),
        getMaintenanceWorkers({ isActive: true })
      ]);
      console.log('Fetched Mechanics:', mechanicsRes);
      console.log('Fetched Electricians:', electriciansRes);
      console.log('Fetched Workers:', workersRes);
      
      setMechanics(mechanicsRes.mechanics || []);
      setElectricians(electriciansRes.electricians || []);
      setMaintenanceWorkers(workersRes.workers || []);
      
      console.log('Set Mechanics:', mechanicsRes.mechanics?.length || 0);
      console.log('Set Electricians:', electriciansRes.electricians?.length || 0);
      console.log('Set Workers:', workersRes.workers?.length || 0);
    } catch (error) {
      console.error('Error fetching maintenance personnel:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedStatus) {
      toast({
        title: 'Validation Error',
        description: 'Please select a new status',
        variant: 'destructive'
      });
      return;
    }

    // Validate machinist for "In Production" status (same as ProductionLines)
    if (selectedStatus === 'in_production' && !selectedMachinist) {
      toast({
        title: 'Machinist Required',
        description: 'Please select a machinist for production',
        variant: 'destructive'
      });
      return;
    }

    // Validate maintenance personnel for maintenance statuses
    const maintenanceStatuses = ['under_repair', 'under_inspection', 'scheduled_maintenance'];
    if (maintenanceStatuses.includes(selectedStatus)) {
      if (!selectedMechanic && !selectedElectrician && !selectedMaintenanceWorker) {
        toast({
          title: 'Validation Error',
          description: 'Please select at least one maintenance personnel (Mechanic, Electrician, or Maintenance Worker)',
          variant: 'destructive'
        });
        return;
      }
    }

    try {
      setLoading(true);
      await changeEquipmentStatus(equipmentId, {
        status: selectedStatus as EquipmentStatus,
        reason,
        notes,
        machinistId: selectedMachinist || undefined,
        mechanicId: selectedMechanic || undefined,
        electricianId: selectedElectrician || undefined,
        maintenanceWorkerId: selectedMaintenanceWorker || undefined
      });

      toast({
        title: 'Success',
        description: `Equipment status changed to ${getStatusLabel(selectedStatus as EquipmentStatus)}`
      });

      // Reset form
      setSelectedStatus('');
      setReason('');
      setNotes('');
      setSelectedMachinist('');
      setSelectedMechanic('');
      setSelectedElectrician('');
      setSelectedMaintenanceWorker('');
      
      // Close dialog and notify parent
      onOpenChange(false);
      if (onStatusChanged) {
        onStatusChanged();
      }
    } catch (error: any) {
      console.error('Error changing status:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to change equipment status',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    const Icon = statusIcons[status] || AlertCircle;
    return <Icon className="h-4 w-4" />;
  };

  const selectedTransition = allowedTransitions.find(t => t.status === selectedStatus);

  // Check if maintenance personnel is required (same logic as in_production with machinist)
  const maintenanceStatuses = ['under_repair', 'under_inspection', 'scheduled_maintenance'];
  const requiresMaintenancePersonnel = maintenanceStatuses.includes(selectedStatus);
  const hasMaintenancePersonnel = !!(selectedMechanic || selectedElectrician || selectedMaintenanceWorker);
  
  // Debug logs
  console.log('Selected Status:', selectedStatus);
  console.log('Requires Maintenance Personnel:', requiresMaintenancePersonnel);
  console.log('Selected Mechanic:', selectedMechanic);
  console.log('Selected Electrician:', selectedElectrician);
  console.log('Selected Maintenance Worker:', selectedMaintenanceWorker);
  console.log('Has Maintenance Personnel:', hasMaintenancePersonnel);
  
  // Disable button if: loading, no status selected, transitions loading, in_production without machinist, or maintenance status without personnel
  const isSubmitDisabled = loading || !selectedStatus || loadingTransitions || 
    (selectedStatus === 'in_production' && !selectedMachinist) ||
    (requiresMaintenancePersonnel && !hasMaintenancePersonnel);
  
  console.log('Is Submit Disabled:', isSubmitDisabled);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white">
        <DialogHeader>
          <DialogTitle>Change Equipment Status</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Status */}
          <div className="space-y-2">
            <Label>Equipment</Label>
            <div className="text-sm font-medium">{equipmentName}</div>
          </div>

          <div className="space-y-2">
            <Label>Current Status</Label>
            <Badge className={`${getStatusColor(currentStatus)} text-white flex items-center gap-2 w-fit`}>
              {getStatusIcon(currentStatus)}
              {getStatusLabel(currentStatus)}
            </Badge>
          </div>

          {/* New Status Selection */}
          <div className="space-y-2">
            <Label htmlFor="newStatus">New Status *</Label>
            {loadingTransitions ? (
              <div className="text-sm text-muted-foreground">Loading available transitions...</div>
            ) : allowedTransitions.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No status transitions available from the current status.
                </AlertDescription>
              </Alert>
            ) : (
              <Select value={selectedStatus} onValueChange={(value) => {
                console.log('STATUS CHANGED TO:', value);
                setSelectedStatus(value as EquipmentStatus);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {allowedTransitions.map((transition) => (
                    <SelectItem key={transition.status} value={transition.status}>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(transition.status)}
                        <span>{transition.metadata.label}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {transition.metadata.category}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Status Description */}
          {selectedTransition && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {selectedTransition.metadata.description}
              </AlertDescription>
            </Alert>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for status change (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">
              {reason.length}/500
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Enter any additional notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={1000}
            />
            <div className="text-xs text-muted-foreground text-right">
              {notes.length}/1000
            </div>
          </div>

          {/* Machinist Selection - Only show when status is "In Production" (same as ProductionLines) */}
          {selectedStatus === 'in_production' && (
            <div className="grid gap-2">
              <Label htmlFor="machinist">Machinist <span className="text-red-500">*</span></Label>
              <Select value={selectedMachinist} onValueChange={setSelectedMachinist}>
                <SelectTrigger>
                  <SelectValue placeholder="Select machinist" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {machinists && machinists.length > 0 ? (
                    machinists.map((machinist) => (
                      <SelectItem key={machinist._id} value={machinist._id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{machinist.fullName}</span>
                          <span className="text-xs text-slate-500">Matricule: {machinist.matricule}</span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-4 text-sm text-slate-500 text-center">
                      No active machinists found
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Maintenance Personnel Selection - Only show when status requires maintenance personnel (same as machinist for in_production) */}
          {requiresMaintenancePersonnel && (
            <div className={`space-y-4 p-4 border rounded-lg ${!hasMaintenancePersonnel ? 'bg-red-50 border-red-300' : 'bg-orange-50'}`}>
              <div className="flex items-center gap-2">
                <Wrench className={`h-5 w-5 ${!hasMaintenancePersonnel ? 'text-red-600' : 'text-orange-600'}`} />
                <Label className={`text-base font-semibold ${!hasMaintenancePersonnel ? 'text-red-900' : 'text-orange-900'}`}>
                  Maintenance Personnel *
                </Label>
              </div>
              <p className={`text-sm ${!hasMaintenancePersonnel ? 'text-red-700 font-medium' : 'text-orange-700'}`}>
                {!hasMaintenancePersonnel ? '⚠️ Please select at least one maintenance personnel to continue' : 'Select at least one maintenance personnel who will perform the maintenance work'}
              </p>
              
              {/* Mechanic */}
              <div className="space-y-2">
                <Label htmlFor="mechanic">Mechanic</Label>
                <Select value={selectedMechanic} onValueChange={(val) => setSelectedMechanic(val === 'none' ? '' : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mechanic (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {mechanics.map((mechanic) => (
                      <SelectItem key={mechanic._id} value={mechanic._id}>
                        {mechanic.fullName} ({mechanic.matricule})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Electrician */}
              <div className="space-y-2">
                <Label htmlFor="electrician">Electrician</Label>
                <Select value={selectedElectrician} onValueChange={(val) => setSelectedElectrician(val === 'none' ? '' : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select electrician (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {electricians.map((electrician) => (
                      <SelectItem key={electrician._id} value={electrician._id}>
                        {electrician.fullName} ({electrician.matricule})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Maintenance Worker */}
              <div className="space-y-2">
                <Label htmlFor="maintenanceWorker">Maintenance Worker</Label>
                <Select value={selectedMaintenanceWorker} onValueChange={(val) => setSelectedMaintenanceWorker(val === 'none' ? '' : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select maintenance worker (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {maintenanceWorkers.map((worker) => (
                      <SelectItem key={worker._id} value={worker._id}>
                        {worker.fullName} ({worker.matricule})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            {loading ? 'Changing...' : 'Change Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}