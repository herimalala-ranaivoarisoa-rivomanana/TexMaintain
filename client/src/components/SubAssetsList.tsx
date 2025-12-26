import { useEffect, useState } from 'react';
import { listSubAssets, createSubAsset, updateSubAsset, deleteSubAsset, SubAsset } from '@/api/subAssets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export function SubAssetsList({ equipmentId }: { equipmentId: string }) {
  const [items, setItems] = useState<SubAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubAsset | null>(null);
  const [form, setForm] = useState<Partial<SubAsset>>({ name: '', code: '', type: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await listSubAssets(equipmentId);
      setItems(res.subAssets || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (equipmentId) fetchData(); }, [equipmentId]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', code: '', type: '' });
    setOpen(true);
  };

  const openEdit = (sa: SubAsset) => {
    setEditing(sa);
    setForm({ name: sa.name, code: sa.code, type: sa.type, manufacturer: sa.manufacturer, model: sa.model, serialNumber: sa.serialNumber, criticality: sa.criticality, notes: sa.notes });
    setOpen(true);
  };

  const onSave = async () => {
    if (!form.name || !form.name.trim()) return;
    try {
      setSaving(true);
      if (editing) {
        await updateSubAsset(editing._id, { ...form });
      } else {
        await createSubAsset({ equipment: equipmentId, name: String(form.name), code: form.code, type: form.type, manufacturer: form.manufacturer, model: form.model, serialNumber: form.serialNumber, criticality: form.criticality as any, notes: form.notes });
      }
      setOpen(false);
      await fetchData();
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await deleteSubAsset(id);
      await fetchData();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Sub-assets (Components)</CardTitle>
        <Button onClick={openCreate}>Add Sub-asset</Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-slate-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-slate-500">No sub-assets found</div>
        ) : (
          <div className="grid gap-3">
            {items.map((sa) => (
              <div key={sa._id} className="flex items-center justify-between p-3 border rounded">
                <div className="space-y-0.5">
                  <div className="font-medium">{sa.name} {sa.code ? <span className="text-xs text-slate-500">({sa.code})</span> : null}</div>
                  <div className="text-xs text-slate-500">{sa.type || '-'} {sa.manufacturer ? `• ${sa.manufacturer}` : ''} {sa.model ? `• ${sa.model}` : ''}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(sa)}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => onDelete(sa._id)} disabled={deletingId === sa._id}>{deletingId === sa._id ? 'Deleting...' : 'Delete'}</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Sub-asset' : 'Add Sub-asset'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Motor" />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="code">Code</Label>
              <Input id="code" value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Optional code" />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="type">Type</Label>
              <Input id="type" value={form.type || ''} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="Component type" />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input id="manufacturer" value={form.manufacturer || ''} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} placeholder="Optional" />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="model">Model</Label>
              <Input id="model" value={form.model || ''} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Optional" />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input id="serialNumber" value={form.serialNumber || ''} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={onSave} disabled={saving || !form.name || !String(form.name).trim()}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
