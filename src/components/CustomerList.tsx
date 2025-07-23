import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2, Users, Mail, Phone, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  parent_id: string | null;
  position: string | null;
  created_at: string;
  totalPoints?: number;
}

export const CustomerList = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editParentId, setEditParentId] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const { admin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
      // Fetch customers and their total points
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (customersError) throw customersError;

      // Fetch points for each customer
      const customersWithPoints = await Promise.all(
        (customersData || []).map(async (customer) => {
          const { data: pointsData } = await supabase
            .from('point_history')
            .select('points')
            .eq('to_customer', customer.id);

          const totalPoints = pointsData?.reduce((sum, p) => sum + (Number(p.points) || 0), 0) || 0;
          
          return {
            ...customer,
            totalPoints
          };
        })
      );

      setCustomers(customersWithPoints);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data customer",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditName(customer.name);
    setEditEmail(customer.email || '');
    setEditWhatsapp(customer.whatsapp || '');
    setEditParentId(customer.parent_id || '');
    setEditPosition(customer.position || '');
  };

  const handleSaveEdit = async () => {
    if (!editingCustomer) return;

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: editName,
          email: editEmail || null,
          whatsapp: editWhatsapp || null,
          parent_id: editParentId || null,
          position: editPosition || null,
        })
        .eq('id', editingCustomer.id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Data customer berhasil diperbarui",
      });

      setEditingCustomer(null);
      fetchCustomers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memperbarui data customer",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    // Only super admin can delete
    if (admin?.role !== 'super_admin') {
      toast({
        title: "Error",
        description: "Hanya Super Admin yang dapat menghapus customer",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Hapus customer ${name}? Data ini tidak dapat dikembalikan.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: `Customer ${name} berhasil dihapus`,
      });

      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus customer",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daftar Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Memuat data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (customers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daftar Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Belum ada customer</h3>
            <p className="text-muted-foreground">Tambahkan customer pertama Anda</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar Customer ({customers.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Posisi</TableHead>
              <TableHead>Total Points</TableHead>
              <TableHead>Tanggal Dibuat</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => {
              const parent = customers.find(c => c.id === customer.parent_id);
              return (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-primary" />
                      <span>{customer.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {customer.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        <span>{customer.email}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {customer.whatsapp && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <span>{customer.whatsapp}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {parent ? parent.name : '-'}
                  </TableCell>
                  <TableCell>
                    {customer.position ? (
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        customer.position === 'left' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {customer.position.toUpperCase()}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Award className="w-3 h-3 text-primary" />
                      <span className="font-medium">{customer.totalPoints?.toFixed(2) || '0.00'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(customer.created_at).toLocaleDateString('id-ID')}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {(admin?.role === 'admin' || admin?.role === 'super_admin') && (
                        <Dialog open={editingCustomer?.id === customer.id} onOpenChange={(open) => !open && setEditingCustomer(null)}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEdit(customer)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Customer</DialogTitle>
                              <DialogDescription>
                                Perbarui informasi customer
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="edit-name">Nama</Label>
                                <Input
                                  id="edit-name"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-email">Email</Label>
                                <Input
                                  id="edit-email"
                                  value={editEmail}
                                  onChange={(e) => setEditEmail(e.target.value)}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-whatsapp">WhatsApp</Label>
                                <Input
                                  id="edit-whatsapp"
                                  value={editWhatsapp}
                                  onChange={(e) => setEditWhatsapp(e.target.value)}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-parent">Parent</Label>
                                <Select value={editParentId} onValueChange={setEditParentId}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Pilih parent" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">Tidak ada parent</SelectItem>
                                    {customers.filter(c => c.id !== editingCustomer?.id).map((c) => (
                                      <SelectItem key={c.id} value={c.id}>
                                        {c.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="edit-position">Posisi</Label>
                                <Select value={editPosition} onValueChange={setEditPosition}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Pilih posisi" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">Tidak ada posisi</SelectItem>
                                    <SelectItem value="left">LEFT</SelectItem>
                                    <SelectItem value="right">RIGHT</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button onClick={handleSaveEdit}>Simpan</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                      {admin?.role === 'super_admin' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDelete(customer.id, customer.name)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};