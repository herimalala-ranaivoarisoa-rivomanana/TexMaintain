import { useEffect, useState } from 'react';
import { listAssetClasses, createAssetClass, updateAssetClass, deleteAssetClass, AssetClass } from '@/api/assetClasses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function AssetClassesPage() {
  const [items, setItems] = useState<AssetClass[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<AssetClass | null>(null);
  const [form, setForm] = useState<Partial<AssetClass>>({ name: '', code: 'PRD', description: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    const res = await listAssetClasses();
    setItems(res.assetClasses || []);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', code: 'PRD', description: '' }); setOpen(true); };
  const openEdit = (ac: AssetClass) => { setEditing(ac); setForm({ name: ac.name, code: ac.code, description: ac.description }); setOpen(true); };

  const onSave = async () => {
    if (!form.name || !form.code) return;
    try {
      setSaving(true);
      if (editing) await updateAssetClass(editing._id, { ...form } as any);
      else await createAssetClass(form as any);
      setOpen(false);
      await fetchData();
    } finally { setSaving(false); }
  };

  const onDelete = async (id: string) => {
    try { setDeletingId(id); await deleteAssetClass(id); await fetchData(); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Asset Classes</h1>
        <Button onClick={openCreate}>Add</Button>
      </div>
      <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
        <CardHeader>
          <CardTitle>List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {items.length === 0 ? (
              <div className="text-sm text-slate-500">No asset classes</div>
            ) : items.map((it) => (
              <div key={it._id} className="flex items-center justify-between p-3 border rounded">
                <div className="space-y-0.5">
                  <div className="font-medium">{it.name} <span className="text-xs text-slate-500">({it.code})</span></div>
                  {it.description ? <div className="text-xs text-slate-500">{it.description}</div> : null}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(it)}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => onDelete(it._id)} disabled={deletingId === it._id}>{deletingId === it._id ? 'Deleting...' : 'Delete'}</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px] bg-white">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Asset Class' : 'Add Asset Class'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="code">Code *</Label>
              <Input id="code" value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value as any })} placeholder="PRD/UTL/FAC/INF/SAF/MHE" />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={onSave} disabled={saving || !form.name || !form.code}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
