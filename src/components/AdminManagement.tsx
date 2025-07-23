import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, ArrowUp, RotateCcw, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

const AdminManagement = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('admin');
  const { admin: currentAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat data admin",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAddAdmin = async () => {
    if (!newAdminName || !newAdminEmail || !newAdminPassword) {
      toast({
        title: "Error",
        description: "Semua field harus diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('admins')
        .insert({
          name: newAdminName,
          email: newAdminEmail,
          password_hash: newAdminPassword,
          role: newAdminRole,
        });

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Admin baru berhasil ditambahkan",
      });

      setShowAddDialog(false);
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminRole('admin');
      fetchAdmins();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menambahkan admin",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (admin: Admin) => {
    setEditingAdmin(admin);
    setEditName(admin.name);
    setEditEmail(admin.email);
  };

  const handleSaveEdit = async () => {
    if (!editingAdmin) return;

    try {
      const { error } = await supabase
        .from('admins')
        .update({
          name: editName,
          email: editEmail,
        })
        .eq('id', editingAdmin.id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Data admin berhasil diperbarui",
      });

      setEditingAdmin(null);
      fetchAdmins();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memperbarui data admin",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (adminId: string) => {
    if (adminId === currentAdmin?.id) {
      toast({
        title: "Error",
        description: "Tidak dapat menghapus diri sendiri",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('admins')
        .delete()
        .eq('id', adminId);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Admin berhasil dihapus",
      });

      fetchAdmins();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus admin",
        variant: "destructive",
      });
    }
  };

  const handlePromote = async (adminId: string) => {
    try {
      const { error } = await supabase
        .from('admins')
        .update({ role: 'super_admin' })
        .eq('id', adminId);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Admin berhasil dipromosikan menjadi Super Admin",
      });

      fetchAdmins();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mempromosikan admin",
        variant: "destructive",
      });
    }
  };

  const handleResetSystem = async () => {
    if (resetConfirmText !== 'RESET') {
      toast({
        title: "Error",
        description: "Ketik 'RESET' untuk konfirmasi",
        variant: "destructive",
      });
      return;
    }

    try {
      // Delete in order: point_history, transactions, customers, admins
      await supabase.from('point_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('admins').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      toast({
        title: "Berhasil",
        description: "Sistem di-reset",
      });

      // Redirect to admin register
      navigate('/');
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mereset sistem",
        variant: "destructive",
      });
    }
  };

  const isSuperAdmin = currentAdmin?.role === 'super_admin';

  if (loading) {
    return <div className="p-6">Memuat...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Admin Management</CardTitle>
            <CardDescription>Kelola admin sistem Laryzo Point Engine</CardDescription>
          </div>
          {isSuperAdmin && (
            <div className="flex space-x-2">
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button variant="default" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Admin
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tambah Admin Baru</DialogTitle>
                    <DialogDescription>
                      Tambahkan admin baru ke sistem
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="new-name">Nama</Label>
                      <Input
                        id="new-name"
                        value={newAdminName}
                        onChange={(e) => setNewAdminName(e.target.value)}
                        placeholder="Masukkan nama admin"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-email">Email</Label>
                      <Input
                        id="new-email"
                        type="email"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="Masukkan email admin"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-password">Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        placeholder="Masukkan password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-role">Role</Label>
                      <Select value={newAdminRole} onValueChange={setNewAdminRole}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Batal
                    </Button>
                    <Button onClick={handleAddAdmin}>Tambah</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset System
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Sistem</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ini akan menghapus SEMUA data termasuk customers, transactions, point history, dan admins.
                      Ketik "RESET" untuk konfirmasi.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Input
                    placeholder="Ketik RESET"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setResetConfirmText('')}>
                      Batal
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetSystem}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Reset System
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created At</TableHead>
                {isSuperAdmin && <TableHead>Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell>{admin.name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    <Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'}>
                      {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(admin.created_at).toLocaleDateString('id-ID')}
                  </TableCell>
                  {isSuperAdmin && (
                    <TableCell>
                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(admin)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Admin</DialogTitle>
                              <DialogDescription>
                                Perbarui informasi admin
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
                            </div>
                            <DialogFooter>
                              <Button onClick={handleSaveEdit}>Simpan</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        {admin.role === 'admin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePromote(admin.id)}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                        )}

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={admin.id === currentAdmin?.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Admin</AlertDialogTitle>
                              <AlertDialogDescription>
                                Yakin ingin menghapus admin {admin.name}?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(admin.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminManagement;