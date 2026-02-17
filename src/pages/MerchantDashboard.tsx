import { useState, useEffect } from 'react';
import { useMerchantAuth } from '@/hooks/useMerchantAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Store, LogOut, ShoppingCart, Package, History, Plus, Search, Minus, Pencil, Trash2, Users, Shield, User } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import MerchantProductForm from '@/components/MerchantProductForm';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

const MerchantDashboard = () => {
  const { merchant, logout } = useMerchantAuth();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState('pos');
  const [products, setProducts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [cart, setCart] = useState<{ product: any; qty: number }[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Product form state
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Employee management state
  const [employees, setEmployees] = useState<any[]>([]);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [newEmployeePassword, setNewEmployeePassword] = useState('');
  const [addingEmployee, setAddingEmployee] = useState(false);

  const isSuperAdmin = merchant?.merchant_role === 'super_admin';

  useEffect(() => {
    fetchProducts();
    fetchTransactions();
    if (isSuperAdmin) {
      fetchEmployees();
    }
  }, [isSuperAdmin]);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('merchant_products')
      .select('*')
      .order('created_at', { ascending: false });
    setProducts(data || []);
  };

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from('merchant_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setTransactions(data || []);
  };

  const fetchEmployees = async () => {
    const { data, error } = await supabase.functions.invoke('merchant-employee', {
      body: { action: 'list' }
    });
    if (data?.employees) {
      setEmployees(data.employees);
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployeeEmail || !newEmployeePassword) return;
    setAddingEmployee(true);
    try {
      const { data, error } = await supabase.functions.invoke('merchant-employee', {
        body: { action: 'create', email: newEmployeeEmail, password: newEmployeePassword }
      });
      if (error || !data?.success) {
        toast({ title: 'Gagal', description: data?.error || error?.message || 'Gagal menambah karyawan', variant: 'destructive' });
      } else {
        toast({ title: 'Karyawan berhasil ditambahkan' });
        setShowAddEmployee(false);
        setNewEmployeeEmail('');
        setNewEmployeePassword('');
        fetchEmployees();
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setAddingEmployee(false);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('merchant-employee', {
        body: { action: 'delete', employee_id: employeeId }
      });
      if (error || !data?.success) {
        toast({ title: 'Gagal', description: data?.error || 'Gagal menghapus karyawan', variant: 'destructive' });
      } else {
        toast({ title: 'Karyawan berhasil dihapus' });
        fetchEmployees();
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const searchCustomer = async () => {
    if (!customerSearch.trim()) return;
    setSearchLoading(true);
    const { data } = await supabase
      .from('customers')
      .select('id, name, email, whatsapp, points')
      .or(`name.ilike.%${customerSearch}%,email.ilike.%${customerSearch}%,whatsapp.ilike.%${customerSearch}%`)
      .limit(5);
    setCustomerResults(data || []);
    setSearchLoading(false);
  };

  const addToCart = (product: any) => {
    const existing = cart.find(c => c.product.id === product.id);
    if (existing) {
      setCart(cart.map(c => c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { product, qty: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(c => c.product.id !== productId));
  };

  const updateCartQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(c => c.product.id === productId ? { ...c, qty } : c));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.product.price * c.qty, 0);
  const laryzoFee = Math.round(cartTotal * 0.1);
  const customerPointsEarned = Math.round(laryzoFee * 0.01);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({ title: 'Keranjang kosong', variant: 'destructive' });
      return;
    }

    setCheckoutLoading(true);
    try {
      const merchantId = merchant?.id;
      
      for (const item of cart) {
        const total = item.product.price * item.qty;
        const fee = Math.round(total * 0.1);
        const points = selectedCustomer ? Math.round(fee * 0.01) : 0;

        const { error } = await supabase.from('merchant_transactions').insert({
          merchant_id: merchantId,
          product_id: item.product.id,
          customer_id: selectedCustomer?.id || null,
          product_name: item.product.name,
          price: item.product.price,
          qty: item.qty,
          total,
          laryzo_fee: fee,
          customer_points_earned: points,
          notes,
        });

        if (error) throw error;

        if (selectedCustomer && points > 0) {
          await supabase.from('point_history').insert({
            from_customer: null,
            to_customer: selectedCustomer.id,
            points,
            level: 0,
            product_code: `MITRA-${item.product.name.substring(0, 20)}`,
          });
        }

        if (item.product.stock >= 0) {
          await supabase.from('merchant_products')
            .update({ stock: item.product.stock - item.qty })
            .eq('id', item.product.id);
        }
      }

      toast({ title: 'Transaksi berhasil!', description: `Total: Rp ${cartTotal.toLocaleString()}` });
      setCart([]);
      setSelectedCustomer(null);
      setCustomerSearch('');
      setNotes('');
      fetchProducts();
      fetchTransactions();
    } catch (error: any) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    }
    setCheckoutLoading(false);
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase.from('merchant_products').delete().eq('id', productId);
      if (error) throw error;
      toast({ title: 'Produk berhasil dihapus' });
      fetchProducts();
    } catch (error: any) {
      toast({ title: 'Gagal menghapus', description: error.message, variant: 'destructive' });
    }
  };

  const renderPOS = () => (
    <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Product Grid */}
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-xl font-bold">Pilih Produk</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {products.filter(p => p.is_active).map(product => (
            <Card
              key={product.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => addToCart(product)}
            >
              <CardContent className="p-3 text-center">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="h-16 w-16 mx-auto mb-2 rounded object-cover" />
                ) : (
                  <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                )}
                <p className="font-medium text-sm truncate">{product.name}</p>
                <p className="text-sm text-primary font-bold">Rp {Number(product.price).toLocaleString()}</p>
                {product.stock >= 0 && (
                  <Badge variant="outline" className="text-xs mt-1">Stok: {product.stock}</Badge>
                )}
              </CardContent>
            </Card>
          ))}
          {products.filter(p => p.is_active).length === 0 && (
            <p className="col-span-full text-muted-foreground text-center py-8">
              Belum ada produk. Tambahkan produk terlebih dahulu.
            </p>
          )}
        </div>
      </div>

      {/* Cart */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Keranjang
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cart.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Keranjang kosong</p>
            ) : (
              <>
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate flex-1">{item.product.name}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateCartQty(item.product.id, item.qty - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center">{item.qty}</span>
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateCartQty(item.product.id, item.qty + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="font-medium w-24 text-right">Rp {(item.product.price * item.qty).toLocaleString()}</span>
                  </div>
                ))}
                <div className="border-t pt-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span className="font-bold">Rp {cartTotal.toLocaleString()}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Potongan Laryzo (10%)</span><span>Rp {laryzoFee.toLocaleString()}</span></div>
                  {selectedCustomer && customerPointsEarned > 0 && (
                    <div className="flex justify-between text-green-600"><span>Poin Customer</span><span>+{customerPointsEarned} poin</span></div>
                  )}
                </div>
              </>
            )}

            {/* Customer search */}
            <div className="border-t pt-3 space-y-2">
              <Label className="text-sm">Customer (opsional)</Label>
              {selectedCustomer ? (
                <div className="flex items-center justify-between bg-muted p-2 rounded text-sm">
                  <span>{selectedCustomer.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>×</Button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <Input
                    placeholder="Cari nama/email..."
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchCustomer()}
                    className="text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={searchCustomer} disabled={searchLoading}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {customerResults.length > 0 && !selectedCustomer && (
                <div className="border rounded space-y-1 max-h-32 overflow-auto">
                  {customerResults.map(c => (
                    <div
                      key={c.id}
                      className="p-2 text-sm hover:bg-muted cursor-pointer"
                      onClick={() => { setSelectedCustomer(c); setCustomerResults([]); }}
                    >
                      {c.name} - {c.email || c.whatsapp}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Textarea
              placeholder="Catatan transaksi..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="text-sm"
              rows={2}
            />

            <Button
              className="w-full bg-orange-600 hover:bg-orange-700"
              disabled={cart.length === 0 || checkoutLoading}
              onClick={handleCheckout}
            >
              {checkoutLoading ? 'Memproses...' : `Bayar Rp ${cartTotal.toLocaleString()}`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderProducts = () => (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Produk Saya</h2>
        {isSuperAdmin && (
          <Button onClick={() => { setEditingProduct(null); setShowProductForm(true); }}><Plus className="h-4 w-4 mr-2" />Tambah Produk</Button>
        )}
      </div>

      {isSuperAdmin && (
        <MerchantProductForm
          open={showProductForm}
          onOpenChange={setShowProductForm}
          merchantId={merchant?.id || ''}
          product={editingProduct}
          onSuccess={fetchProducts}
        />
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Foto</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead>Harga</TableHead>
            <TableHead>Stok</TableHead>
            <TableHead>Status</TableHead>
            {isSuperAdmin && <TableHead>Aksi</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map(p => (
            <TableRow key={p.id}>
              <TableCell>
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded object-cover" />
                ) : (
                  <Package className="h-6 w-6 text-muted-foreground" />
                )}
              </TableCell>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell>Rp {Number(p.price).toLocaleString()}</TableCell>
              <TableCell>{p.stock < 0 ? '∞' : p.stock}</TableCell>
              <TableCell>
                <Badge variant={p.is_active ? 'default' : 'secondary'}>
                  {p.is_active ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </TableCell>
              {isSuperAdmin && (
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingProduct(p); setShowProductForm(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Produk</AlertDialogTitle>
                          <AlertDialogDescription>
                            Yakin ingin menghapus produk "{p.name}"? Tindakan ini tidak dapat dibatalkan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteProduct(p.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
    </div>
  );

  const renderHistory = () => (
    <div className="p-4 md:p-6 space-y-4">
      <h2 className="text-xl font-bold">Riwayat Transaksi</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tanggal</TableHead>
            <TableHead>Produk</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Fee Laryzo</TableHead>
            <TableHead>Poin Customer</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map(t => (
            <TableRow key={t.id}>
              <TableCell className="text-sm">{new Date(t.created_at).toLocaleDateString('id-ID')}</TableCell>
              <TableCell className="font-medium">{t.product_name}</TableCell>
              <TableCell>{t.qty}</TableCell>
              <TableCell>Rp {Number(t.total).toLocaleString()}</TableCell>
              <TableCell className="text-muted-foreground">Rp {Number(t.laryzo_fee).toLocaleString()}</TableCell>
              <TableCell className="text-green-600">{Number(t.customer_points_earned) > 0 ? `+${t.customer_points_earned}` : '-'}</TableCell>
            </TableRow>
          ))}
          {transactions.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Belum ada transaksi</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  const renderEmployees = () => (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Kelola Karyawan</h2>
        <Button onClick={() => setShowAddEmployee(true)}><Plus className="h-4 w-4 mr-2" />Tambah Karyawan</Button>
      </div>

      <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Karyawan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@karyawan.com"
                value={newEmployeeEmail}
                onChange={e => setNewEmployeeEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Minimal 6 karakter"
                value={newEmployeePassword}
                onChange={e => setNewEmployeePassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEmployee(false)}>Batal</Button>
            <Button onClick={handleAddEmployee} disabled={addingEmployee || !newEmployeeEmail || !newEmployeePassword}>
              {addingEmployee ? 'Menambahkan...' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Login Terakhir</TableHead>
            <TableHead>Terdaftar</TableHead>
            <TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map(emp => (
            <TableRow key={emp.id}>
              <TableCell className="font-medium">{emp.email}</TableCell>
              <TableCell>
                <Badge variant={emp.role === 'super_admin' ? 'default' : 'secondary'} className="gap-1">
                  {emp.role === 'super_admin' ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                  {emp.role === 'super_admin' ? 'Pemilik' : 'Karyawan'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {emp.last_login ? new Date(emp.last_login).toLocaleDateString('id-ID') : '-'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(emp.created_at).toLocaleDateString('id-ID')}
              </TableCell>
              <TableCell>
                {emp.role !== 'super_admin' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Karyawan</AlertDialogTitle>
                        <AlertDialogDescription>
                          Yakin ingin menghapus akses karyawan "{emp.email}"? Mereka tidak bisa login lagi setelah dihapus.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteEmployee(emp.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </TableCell>
            </TableRow>
          ))}
          {employees.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Belum ada karyawan</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'products': return renderProducts();
      case 'history': return renderHistory();
      case 'employees': return isSuperAdmin ? renderEmployees() : renderPOS();
      default: return renderPOS();
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="w-64">
          <SidebarContent>
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-orange-600" />
                <h2 className="text-lg font-semibold">Laryzo Mitra</h2>
              </div>
              <p className="text-sm text-muted-foreground">{merchant?.business_name || merchant?.name}</p>
              <Badge variant="outline" className="mt-1 text-xs gap-1">
                {isSuperAdmin ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                {isSuperAdmin ? 'Pemilik' : 'Karyawan'}
              </Badge>
            </div>

            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setActiveView('pos')} className={activeView === 'pos' ? 'bg-accent' : ''}>
                      <ShoppingCart className="h-4 w-4" />
                      <span>POS / Kasir</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setActiveView('products')} className={activeView === 'products' ? 'bg-accent' : ''}>
                      <Package className="h-4 w-4" />
                      <span>Produk Saya</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setActiveView('history')} className={activeView === 'history' ? 'bg-accent' : ''}>
                      <History className="h-4 w-4" />
                      <span>Riwayat</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {isSuperAdmin && (
                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => setActiveView('employees')} className={activeView === 'employees' ? 'bg-accent' : ''}>
                        <Users className="h-4 w-4" />
                        <span>Karyawan</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <div className="mt-auto p-4 border-t">
              <Button variant="outline" onClick={logout} className="w-full">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <div className="border-b bg-card p-4 flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-xl font-semibold">
              {activeView === 'products' ? 'Produk Saya' : activeView === 'history' ? 'Riwayat Transaksi' : activeView === 'employees' ? 'Kelola Karyawan' : 'POS / Kasir'}
            </h1>
          </div>
          <div className="flex-1 overflow-auto">
            {renderContent()}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default MerchantDashboard;
