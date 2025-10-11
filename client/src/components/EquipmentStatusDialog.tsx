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
  Clock, 
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
  AlertTriangle,
  Tool
} from 'lucide-react';
import { changeEquipmentStatus, getAllowedTransitions } from '@/api/equipment';
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
  in_workshop: Tool,
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
  const { toast } = useToast();

  useEffect(() => {
    if (open && equipmentId) {
      fetchAllowedTransitions();
    }
  }, [open, equipmentId]);

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

  const handleSubmit = async () => {
    if (!selectedStatus) {
      toast({
        title: 'Validation Error',
        description: 'Please select a new status',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      await changeEquipmentStatus(equipmentId, {
        status: selectedStatus as EquipmentStatus,
        reason,
        notes
      });

      toast({
        title: 'Success',
        description: `Equipment status changed to ${getStatusLabel(selectedStatus as EquipmentStatus)}`
      });

      // Reset form
      setSelectedStatus('');
      setReason('');
      setNotes('');
      
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
              <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as EquipmentStatus)}>
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
            disabled={loading || !selectedStatus || loadingTransitions}
            className="bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            {loading ? 'Changing...' : 'Change Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}