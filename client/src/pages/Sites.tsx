import { useEffect, useState } from 'react';
import { listSites, createSite, updateSite, deleteSite, Site } from '@/api/sites';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function SitesPage() {
  const [items, setItems] = useState<Site[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);
  const [form, setForm] = useState<Partial<Site>>({ name: '', code: '', country: '', city: '', address: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    const res = await listSites();
    setItems(res.sites || []);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', code: '', country: '', city: '', address: '' }); setOpen(true); };
  const openEdit = (site: Site) => { setEditing(site); setForm({ name: site.name, code: site.code, country: site.country, city: site.city, address: site.address }); setOpen(true); };

  const onSave = async () => {
    if (!form.name || !form.code) return;
    try {
      setSaving(true);
      if (editing) await updateSite(editing._id, { ...form } as any);
      else await createSite(form as any);
      setOpen(false);
      await fetchData();
    } finally { setSaving(false); }
  };

  const onDelete = async (id: string) => {
    try { setDeletingId(id); await deleteSite(id); await fetchData(); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sites / Factories</h1>
        <Button onClick={openCreate}>Add</Button>
      </div>
      <Card className="bg-white/60 backdrop-blur-sm border-slate-200/60">
        <CardHeader>
          <CardTitle>List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {items.length === 0 ? (
              <div className="text-sm text-slate-500">No sites</div>
            ) : items.map((it) => (
              <div key={it._id} className="flex items-center justify-between p-3 border rounded">
                <div className="space-y-0.5">
                  <div className="font-medium">{it.name} <span className="text-xs text-slate-500">({it.code})</span></div>
                  <div className="text-xs text-slate-500">{[it.address, it.city, it.country].filter(Boolean).join(' • ') || '-'}</div>
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
            <DialogTitle>{editing ? 'Edit Site' : 'Add Site'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="code">Code *</Label>
              <Input id="code" value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g., TANA" />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={form.country || ''} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
