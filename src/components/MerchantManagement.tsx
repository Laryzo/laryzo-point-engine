import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Pencil, Eye } from 'lucide-react';

const MerchantManagement = () => {
  const { toast } = useToast();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    whatsapp: '',
    business_name: '',
    business_address: '',
  });

  // Detail dialog state
  const [detailMerchant, setDetailMerchant] = useState<any>(null);

  // Edit dialog state
  const [editMerchant, setEditMerchant] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    whatsapp: '',
    business_name: '',
    business_address: '',
  });
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('merchants')
      .select('*')
      .order('created_at', { ascending: false });
    setMerchants(data || []);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .insert({
          name: form.name,
          email: form.email,
          whatsapp: form.whatsapp || null,
          business_name: form.business_name || null,
          business_address: form.business_address || null,
        })
        .select()
        .single();

      if (merchantError) throw merchantError;

      const { data, error } = await supabase.functions.invoke('merchant-create', {
        body: {
          merchant_id: merchant.id,
          email: form.email,
          password: form.password,
        }
      });

      if (error || !data?.success) {
        await supabase.from('merchants').delete().eq('id', merchant.id);
        throw new Error(data?.error || error?.message || 'Gagal membuat akun mitra');
      }

      toast({ title: 'Mitra berhasil ditambahkan!' });
      setShowForm(false);
      setForm({ name: '', email: '', password: '', whatsapp: '', business_name: '', business_address: '' });
      fetchMerchants();
    } catch (error: any) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    }
    setFormLoading(false);
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('merchants')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    if (error) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    } else {
      fetchMerchants();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus mitra "${name}"? Data transaksi mitra ini juga akan terhapus.`)) return;

    try {
      const { error: authErr } = await supabase.from('merchant_auth').delete().eq('merchant_id', id);
      if (authErr) throw authErr;

      const { error } = await supabase.from('merchants').delete().eq('id', id);
      if (error) throw error;

      toast({ title: 'Mitra berhasil dihapus' });
      fetchMerchants();
    } catch (error: any) {
      toast({ title: 'Gagal menghapus', description: error.message, variant: 'destructive' });
    }
  };

  const handleEdit = (m: any) => {
    setEditMerchant(m);
    setEditForm({
      name: m.name || '',
      email: m.email || '',
      whatsapp: m.whatsapp || '',
      business_name: m.business_name || '',
      business_address: m.business_address || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editMerchant) return;
    setEditLoading(true);
    try {
      const { error } = await supabase
        .from('merchants')
        .update({
          name: editForm.name,
          email: editForm.email,
          whatsapp: editForm.whatsapp || null,
          business_name: editForm.business_name || null,
          business_address: editForm.business_address || null,
        })
        .eq('id', editMerchant.id);
      if (error) throw error;
      toast({ title: 'Data mitra berhasil diperbarui' });
      setEditMerchant(null);
      fetchMerchants();
    } catch (error: any) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    }
    setEditLoading(false);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Manajemen Mitra</h2>
          <p className="text-muted-foreground">Kelola akun mitra UMKM</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Tambah Mitra</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tambah Mitra Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Nama</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nama Bisnis</Label>
                <Input value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Alamat Bisnis</Label>
                <Input value={form.business_address} onChange={e => setForm({ ...form, business_address: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={formLoading}>
                {formLoading ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Bisnis</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merchants.map(m => (
                <TableRow key={m.id}>
                  <TableCell
                    className="font-medium cursor-pointer text-primary hover:underline"
                    onClick={() => setDetailMerchant(m)}
                  >
                    {m.name}
                  </TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>{m.business_name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={m.is_active ? 'default' : 'secondary'}>
                      {m.is_active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActive(m.id, m.is_active)}
                      >
                        {m.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(m)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDelete(m.id, m.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {merchants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Belum ada mitra terdaftar
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailMerchant} onOpenChange={(open) => !open && setDetailMerchant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Mitra</DialogTitle>
          </DialogHeader>
          {detailMerchant && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Nama Mitra:</span>
                <span className="font-medium">{detailMerchant.name}</span>
                <span className="text-muted-foreground">Nama Toko:</span>
                <span className="font-medium">{detailMerchant.business_name || '-'}</span>
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{detailMerchant.email || '-'}</span>
                <span className="text-muted-foreground">WhatsApp:</span>
                <span className="font-medium">{detailMerchant.whatsapp || '-'}</span>
                <span className="text-muted-foreground">Alamat Toko:</span>
                <span className="font-medium">{detailMerchant.business_address || '-'}</span>
                <span className="text-muted-foreground">Status:</span>
                <span>
                  <Badge variant={detailMerchant.is_active ? 'default' : 'secondary'}>
                    {detailMerchant.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </span>
                <span className="text-muted-foreground">Terdaftar:</span>
                <span className="font-medium">{new Date(detailMerchant.created_at).toLocaleDateString('id-ID')}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editMerchant} onOpenChange={(open) => !open && setEditMerchant(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Mitra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input value={editForm.whatsapp} onChange={e => setEditForm({ ...editForm, whatsapp: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Nama Bisnis</Label>
              <Input value={editForm.business_name} onChange={e => setEditForm({ ...editForm, business_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Alamat Bisnis</Label>
              <Textarea value={editForm.business_address} onChange={e => setEditForm({ ...editForm, business_address: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMerchant(null)}>Batal</Button>
            <Button onClick={handleSaveEdit} disabled={editLoading}>
              {editLoading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantManagement;
