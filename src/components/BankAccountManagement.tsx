import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const BankAccountManagement = () => {
  const [banks, setBanks] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ bank_name: '', account_number: '', account_holder: '', display_order: 0, is_active: true });

  const load = async () => {
    const { data } = await supabase.from('bank_accounts').select('*').order('display_order');
    setBanks(data || []);
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ bank_name: '', account_number: '', account_holder: '', display_order: banks.length, is_active: true });
    setOpen(true);
  };

  const openEdit = (b: any) => {
    setEditing(b);
    setForm({ bank_name: b.bank_name, account_number: b.account_number, account_holder: b.account_holder, display_order: b.display_order, is_active: b.is_active });
    setOpen(true);
  };

  const save = async () => {
    if (!form.bank_name || !form.account_number || !form.account_holder) return toast.error('Lengkapi data');
    if (editing) {
      const { error } = await supabase.from('bank_accounts').update(form).eq('id', editing.id);
      if (error) return toast.error(error.message);
      toast.success('Tersimpan');
    } else {
      const { error } = await supabase.from('bank_accounts').insert(form);
      if (error) return toast.error(error.message);
      toast.success('Ditambahkan');
    }
    setOpen(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Hapus rekening ini?')) return;
    const { error } = await supabase.from('bank_accounts').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Dihapus');
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Rekening Bank Top Up</CardTitle>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Tambah</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {banks.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Belum ada rekening</p>}
        {banks.map((b) => (
          <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">{b.bank_name} {!b.is_active && <span className="text-xs text-red-500">(non-aktif)</span>}</p>
              <p className="text-sm font-mono">{b.account_number}</p>
              <p className="text-xs text-muted-foreground">a.n. {b.account_holder}</p>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => del(b.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Rekening' : 'Tambah Rekening'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nama Bank</Label>
              <Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="BCA / Mandiri / BRI" />
            </div>
            <div className="space-y-1">
              <Label>Nomor Rekening</Label>
              <Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Atas Nama</Label>
              <Input value={form.account_holder} onChange={(e) => setForm({ ...form, account_holder: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Urutan</Label>
              <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default BankAccountManagement;
