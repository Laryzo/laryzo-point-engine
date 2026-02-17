import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';

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
      // Create merchant record
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

      // Create auth via edge function pattern - hash password server side
      const { data, error } = await supabase.functions.invoke('merchant-create', {
        body: {
          merchant_id: merchant.id,
          email: form.email,
          password: form.password,
        }
      });

      if (error || !data?.success) {
        // Rollback merchant
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
          <DialogContent>
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
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>{m.business_name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={m.is_active ? 'default' : 'secondary'}>
                      {m.is_active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(m.id, m.is_active)}
                    >
                      {m.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </Button>
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
    </div>
  );
};

export default MerchantManagement;
