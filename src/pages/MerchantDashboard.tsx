import { useState, useEffect, useRef, useCallback } from 'react';
import { useMerchantAuth } from '@/hooks/useMerchantAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Store, LogOut, ShoppingCart, Package, History, Plus, Search, Minus, Pencil, Trash2, Users, Shield, User, Settings, ImagePlus, UserPlus, Truck, Copy, CheckCircle, Clock, MapPin } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import MerchantProductForm from '@/components/MerchantProductForm';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

// Gojek standard shipping cost calculation
const calculateGojekShipping = (distanceKm: number): number => {
  if (distanceKm <= 0) return 0;
  if (distanceKm <= 3) return 10000;
  if (distanceKm <= 7) return 15000;
  if (distanceKm <= 12) return 22000;
  return 22000 + Math.ceil(distanceKm - 12) * 3000;
};

const formatShippingCost = (cost: number) => `Rp ${cost.toLocaleString('id-ID')}`;

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

  // New customer registration state
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustWhatsapp, setNewCustWhatsapp] = useState('');
  const [registeringCustomer, setRegisteringCustomer] = useState(false);

  // Product form state
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Employee management state
  const [employees, setEmployees] = useState<any[]>([]);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [newEmployeePassword, setNewEmployeePassword] = useState('');
  const [addingEmployee, setAddingEmployee] = useState(false);

  // Settings state
  const [settingsBusinessName, setSettingsBusinessName] = useState('');
  const [settingsBusinessAddress, setSettingsBusinessAddress] = useState('');
  const [settingsEmail, setSettingsEmail] = useState('');
  const [settingsWhatsapp, setSettingsWhatsapp] = useState('');
  const [settingsLogoUrl, setSettingsLogoUrl] = useState('');
  const [settingsLogoFile, setSettingsLogoFile] = useState<File | null>(null);
  const [settingsLogoPreview, setSettingsLogoPreview] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [merchantData, setMerchantData] = useState<any>(null);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Delivery orders state
  const [deliveryOrders, setDeliveryOrders] = useState<any[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  // Delivery edit/delete state
  const [editingDelivery, setEditingDelivery] = useState<any>(null);
  const [editDeliveryForm, setEditDeliveryForm] = useState({
    delivery_status: '',
    delivery_address: '',
    delivery_notes: '',
    delivery_type: '',
    status: '',
    estimated_distance_km: '',
  });
  const [savingDeliveryEdit, setSavingDeliveryEdit] = useState(false);
  const [deletingDelivery, setDeletingDelivery] = useState<any>(null);

  // Daily stats state
  const [dailyStats, setDailyStats] = useState({ todayRevenue: 0, todayOrders: 0 });

  const isSuperAdmin = merchant?.merchant_role === 'super_admin';

  useEffect(() => {
    fetchProducts();
    fetchTransactions();
    if (isSuperAdmin) {
      fetchEmployees();
    }
    fetchMerchantData();
    fetchDeliveryOrders();
    fetchDailyStats();
  }, [isSuperAdmin]);

  // Realtime subscription for new orders
  useEffect(() => {
    if (!merchant?.id) return;

    const channel = supabase
      .channel(`merchant-orders-${merchant.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `merchant_id=eq.${merchant.id}`,
        },
        (payload) => {
          const order = payload.new as any;
          const deliveryLabel = order.delivery_type === 'external_ojol' ? '🛵 Kirim Ojol' : order.delivery_type === 'pickup' ? '📦 Pickup' : '';
          
          toast({
            title: '🔔 Pesanan Baru Masuk!',
            description: `${deliveryLabel} — ${order.delivery_address || 'Ambil di tempat'}`,
          });

          // Refresh delivery orders and daily stats
          fetchDeliveryOrders();
          fetchDailyStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `merchant_id=eq.${merchant.id}`,
        },
        () => {
          fetchDeliveryOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [merchant?.id]);

  const fetchDailyStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    const { data } = await supabase
      .from('merchant_transactions')
      .select('total')
      .gte('created_at', todayISO);
    const todayRevenue = data?.reduce((sum, t) => sum + Number(t.total || 0), 0) || 0;
    setDailyStats({ todayRevenue, todayOrders: data?.length || 0 });
  };

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
      .limit(10);
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

  const fetchMerchantData = async () => {
    if (!merchant?.id) return;
    const { data } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', merchant.id)
      .single();
    if (data) {
      setMerchantData(data);
      setSettingsBusinessName(data.business_name || '');
      setSettingsBusinessAddress(data.business_address || '');
      setSettingsEmail(data.email || '');
      setSettingsWhatsapp(data.whatsapp || '');
      setSettingsLogoUrl(data.logo_url || '');
      setSettingsLogoPreview(data.logo_url || '');
    }
  };

  const fetchDeliveryOrders = async () => {
    if (!merchant?.id) return;
    setDeliveryLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, customers(name, whatsapp), products(name)')
      .eq('merchant_id', merchant.id)
      .in('delivery_type', ['pickup', 'external_ojol'])
      .order('created_at', { ascending: false })
      .limit(50);
    setDeliveryOrders(data || []);
    setDeliveryLoading(false);
  };

  const handleUpdateDeliveryStatus = async (orderId: string, newStatus: string) => {
    try {
      const updateData: any = { delivery_status: newStatus };
      if (newStatus === 'delivered') {
        updateData.status = 'completed';
        updateData.processed_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);
      if (error) throw error;
      toast({ title: 'Status pengiriman diperbarui' });
      fetchDeliveryOrders();
    } catch (error: any) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    }
  };

  const openEditDelivery = (order: any) => {
    setEditingDelivery(order);
    setEditDeliveryForm({
      delivery_status: order.delivery_status || '',
      delivery_address: order.delivery_address || '',
      delivery_notes: order.delivery_notes || '',
      delivery_type: order.delivery_type || '',
      status: order.status || '',
      estimated_distance_km: order.estimated_distance_km ? String(order.estimated_distance_km) : '',
    });
  };

  const handleSaveDeliveryEdit = async () => {
    if (!editingDelivery) return;
    setSavingDeliveryEdit(true);
    try {
      const distKm = editDeliveryForm.estimated_distance_km ? Number(editDeliveryForm.estimated_distance_km) : null;
      const shippingCost = distKm ? calculateGojekShipping(distKm) : null;
      const { error } = await supabase
        .from('orders')
        .update({
          delivery_status: editDeliveryForm.delivery_status || null,
          delivery_address: editDeliveryForm.delivery_address || null,
          delivery_notes: editDeliveryForm.delivery_notes || null,
          delivery_type: editDeliveryForm.delivery_type,
          status: editDeliveryForm.status,
          estimated_distance_km: distKm,
          estimated_shipping_cost: shippingCost,
        })
        .eq('id', editingDelivery.id);
      if (error) throw error;
      toast({ title: 'Pesanan pengiriman berhasil diperbarui' });
      setEditingDelivery(null);
      fetchDeliveryOrders();
    } catch (error: any) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    }
    setSavingDeliveryEdit(false);
  };

  const handleDeleteDelivery = async () => {
    if (!deletingDelivery) return;
    try {
      const { error } = await supabase.from('orders').delete().eq('id', deletingDelivery.id);
      if (error) throw error;
      toast({ title: 'Pesanan pengiriman berhasil dihapus' });
      setDeletingDelivery(null);
      fetchDeliveryOrders();
    } catch (error: any) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: `${label} disalin!`, description: text });
    }).catch(() => {
      toast({ title: 'Gagal menyalin', variant: 'destructive' });
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSettingsLogoFile(file);
      setSettingsLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveSettings = async () => {
    if (!merchant?.id) return;
    setSavingSettings(true);
    try {
      let logoUrl = settingsLogoUrl;

      if (settingsLogoFile) {
        const ext = settingsLogoFile.name.split('.').pop();
        const filePath = `${merchant.id}/logo.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('merchant-logos')
          .upload(filePath, settingsLogoFile, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('merchant-logos')
          .getPublicUrl(filePath);
        logoUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('merchants')
        .update({
          business_name: settingsBusinessName,
          business_address: settingsBusinessAddress,
          email: settingsEmail,
          whatsapp: settingsWhatsapp || null,
          logo_url: logoUrl,
        })
        .eq('id', merchant.id);

      if (error) throw error;

      setSettingsLogoUrl(logoUrl);
      setSettingsLogoFile(null);
      toast({ title: 'Pengaturan toko berhasil disimpan' });
      fetchMerchantData();
    } catch (error: any) {
      toast({ title: 'Gagal menyimpan', description: error.message, variant: 'destructive' });
    }
    setSavingSettings(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: 'Password minimal 6 karakter', variant: 'destructive' });
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Password berhasil diubah' });
      setNewPassword('');
    } catch (error: any) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    }
    setChangingPassword(false);
  };
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchCustomer = useCallback(async (query?: string) => {
    const q = (query ?? customerSearch).trim();
    if (!q) { setCustomerResults([]); return; }
    setSearchLoading(true);
    const { data } = await supabase
      .from('customers')
      .select('id, name, email, whatsapp, points')
      .or(`name.ilike.%${q}%,email.ilike.%${q}%,whatsapp.ilike.%${q}%`)
      .limit(5);
    setCustomerResults(data || []);
    setSearchLoading(false);
  }, [customerSearch]);

  const handleCustomerSearchChange = (value: string) => {
    setCustomerSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!value.trim()) { setCustomerResults([]); return; }
    searchTimerRef.current = setTimeout(() => searchCustomer(value), 300);
  };

  const handleRegisterNewCustomer = async () => {
    if (!newCustName || !newCustEmail || !newCustWhatsapp) {
      toast({ title: 'Lengkapi data customer', variant: 'destructive' });
      return;
    }
    setRegisteringCustomer(true);
    try {
      const { data, error } = await supabase.functions.invoke('merchant-register-customer', {
        body: { name: newCustName, email: newCustEmail, whatsapp: newCustWhatsapp }
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Gagal mendaftarkan customer');

      setSelectedCustomer(data.customer);
      setShowNewCustomerForm(false);
      setNewCustName('');
      setNewCustEmail('');
      setNewCustWhatsapp('');
      setCustomerResults([]);

      if (data.is_new) {
        toast({ title: 'Customer baru terdaftar!', description: `${data.customer.name} berhasil didaftarkan ke sistem Laryzo. Password: ${data.password}` });
      } else {
        toast({ title: 'Customer ditemukan', description: `${data.customer.name} sudah terdaftar di sistem` });
      }
    } catch (error: any) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    }
    setRegisteringCustomer(false);
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
  const pendingDeliveryCount = deliveryOrders.filter(o => o.delivery_status !== 'delivered' && o.status !== 'completed').length;
  const laryzoFee = Math.round(cartTotal * 0.1);
  const customerPointsEarned = Math.round(laryzoFee * 0.01);

  // Transaction edit state
  const [editingTx, setEditingTx] = useState<any>(null);
  const [editTxProductName, setEditTxProductName] = useState('');
  const [editTxQty, setEditTxQty] = useState(1);
  const [editTxPrice, setEditTxPrice] = useState(0);
  const [editTxNotes, setEditTxNotes] = useState('');
  const [savingTxEdit, setSavingTxEdit] = useState(false);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({ title: 'Keranjang kosong', variant: 'destructive' });
      return;
    }

    setCheckoutLoading(true);
    try {
      const items = cart.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        price: item.product.price,
        qty: item.qty,
        stock: item.product.stock,
        cost_price: item.product.cost_price || 0,
      }));

      const { data, error } = await supabase.functions.invoke('merchant-checkout', {
        body: { items, customer_id: selectedCustomer?.id || null, notes }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Checkout gagal');

      toast({ title: 'Transaksi berhasil!', description: `Total: Rp ${cartTotal.toLocaleString()}` });
      setCart([]);
      setSelectedCustomer(null);
      setCustomerSearch('');
      setNotes('');
      fetchProducts();
      fetchTransactions();
      fetchDailyStats();
    } catch (error: any) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    }
    setCheckoutLoading(false);
  };

  const handleEditTx = (tx: any) => {
    setEditingTx(tx);
    setEditTxProductName(tx.product_name);
    setEditTxQty(tx.qty);
    setEditTxPrice(tx.price);
    setEditTxNotes(tx.notes || '');
  };

  const handleSaveTxEdit = async () => {
    if (!editingTx) return;
    setSavingTxEdit(true);
    try {
      const newTotal = editTxPrice * editTxQty;
      const newFee = Math.round(newTotal * 0.1);
      const { error } = await supabase.from('merchant_transactions').update({
        product_name: editTxProductName,
        qty: editTxQty,
        price: editTxPrice,
        total: newTotal,
        laryzo_fee: newFee,
        notes: editTxNotes,
      }).eq('id', editingTx.id);
      if (error) throw error;
      toast({ title: 'Transaksi berhasil diperbarui' });
      setEditingTx(null);
      fetchTransactions();
    } catch (error: any) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    }
    setSavingTxEdit(false);
  };

  const handleDeleteTx = async (txId: string, productName: string) => {
    try {
      const { error } = await supabase.from('merchant_transactions').delete().eq('id', txId);
      if (error) throw error;
      toast({ title: 'Transaksi berhasil dihapus', description: productName });
      fetchTransactions();
    } catch (error: any) {
      toast({ title: 'Gagal menghapus', description: error.message, variant: 'destructive' });
    }
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
    <div className="p-4 md:p-6 space-y-6">
      {/* Daily Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Pendapatan Hari Ini</p>
            <p className="text-xl font-bold text-primary">Rp {dailyStats.todayRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Order Hari Ini</p>
            <p className="text-xl font-bold">{dailyStats.todayOrders}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              ) : showNewCustomerForm ? (
                <div className="space-y-2 border rounded p-2">
                  <p className="text-xs font-medium text-primary">Daftarkan Customer Baru</p>
                  <Input
                    placeholder="Nama *"
                    value={newCustName}
                    onChange={e => setNewCustName(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Email *"
                    type="email"
                    value={newCustEmail}
                    onChange={e => setNewCustEmail(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="WhatsApp * (contoh: 08123...)"
                    value={newCustWhatsapp}
                    onChange={e => setNewCustWhatsapp(e.target.value)}
                    className="text-sm"
                  />
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => { setShowNewCustomerForm(false); setNewCustName(''); setNewCustEmail(''); setNewCustWhatsapp(''); }}
                    >
                      Batal
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={handleRegisterNewCustomer}
                      disabled={registeringCustomer}
                    >
                      {registeringCustomer ? 'Mendaftar...' : 'Daftarkan'}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <div className="flex gap-1">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Cari nama/email/WA..."
                          value={customerSearch}
                          onChange={e => handleCustomerSearchChange(e.target.value)}
                          className="text-sm pl-8"
                        />
                      </div>
                    </div>
                    {customerResults.length > 0 && !selectedCustomer && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-auto">
                        {customerResults.map(c => (
                          <div
                            key={c.id}
                            className="px-3 py-2 text-sm hover:bg-accent cursor-pointer flex flex-col"
                            onClick={() => { setSelectedCustomer(c); setCustomerResults([]); setCustomerSearch(''); }}
                          >
                            <span className="font-medium">{c.name}</span>
                            <span className="text-xs text-muted-foreground">{c.email || c.whatsapp}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {searchLoading && customerSearch.trim() && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-3 text-sm text-muted-foreground text-center">
                        Mencari...
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setShowNewCustomerForm(true)}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Daftar Customer Baru
                  </Button>
                </>
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
    </div>
  );

  const generateGoogleMapsLink = (address: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  const generateWhatsAppDriverLink = (order: any) => {
    const merchantName = merchantData?.business_name || merchantData?.name || 'Toko';
    const pickupAddr = merchantData?.business_address || '-';
    const destAddr = order.delivery_address || '-';
    const note = order.delivery_notes || '-';
    const ongkir = order.estimated_shipping_cost ? `\nEstimasi Ongkir: ${formatShippingCost(Number(order.estimated_shipping_cost))} (${Number(order.estimated_distance_km)} km)` : '';
    const message = `Halo driver, pickup pesanan Laryzo:\n\nToko: ${merchantName}\nPickup: ${pickupAddr}\nTujuan: ${destAddr}\nCatatan: ${note}${ongkir}`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

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
            <TableHead>Customer</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Fee Laryzo</TableHead>
            <TableHead>Poin Customer</TableHead>
            {isSuperAdmin && <TableHead>Aksi</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map(t => (
            <TableRow key={t.id}>
              <TableCell className="text-sm">{new Date(t.created_at).toLocaleDateString('id-ID')}</TableCell>
              <TableCell className="font-medium">{t.product_name}</TableCell>
              <TableCell className="text-sm">{t.customer_name || '-'}</TableCell>
              <TableCell>{t.qty}</TableCell>
              <TableCell>Rp {Number(t.total).toLocaleString()}</TableCell>
              <TableCell className="text-muted-foreground">Rp {Number(t.laryzo_fee).toLocaleString()}</TableCell>
              <TableCell className="text-green-600">{Number(t.customer_points_earned) > 0 ? `+${t.customer_points_earned}` : '-'}</TableCell>
              {isSuperAdmin && (
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEditTx(t)}>
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
                          <AlertDialogTitle>Hapus Transaksi</AlertDialogTitle>
                          <AlertDialogDescription>
                            Yakin ingin menghapus transaksi "{t.product_name}"? Tindakan ini tidak dapat dibatalkan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteTx(t.id, t.product_name)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
          {transactions.length === 0 && (
            <TableRow>
              <TableCell colSpan={isSuperAdmin ? 8 : 7} className="text-center text-muted-foreground py-8">Belum ada transaksi</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Edit Transaction Dialog */}
      <Dialog open={!!editingTx} onOpenChange={(open) => !open && setEditingTx(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaksi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama Produk</Label>
              <Input value={editTxProductName} onChange={e => setEditTxProductName(e.target.value)} />
            </div>
            <div>
              <Label>Harga</Label>
              <Input type="number" value={editTxPrice} onChange={e => setEditTxPrice(Number(e.target.value))} />
            </div>
            <div>
              <Label>Qty</Label>
              <Input type="number" value={editTxQty} onChange={e => setEditTxQty(Number(e.target.value))} />
            </div>
            <div>
              <Label>Catatan</Label>
              <Textarea value={editTxNotes} onChange={e => setEditTxNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTx(null)}>Batal</Button>
            <Button onClick={handleSaveTxEdit} disabled={savingTxEdit}>
              {savingTxEdit ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

  const renderSettings = () => (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold">Pengaturan Toko</h2>

      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logo Toko</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <label className="relative w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer group overflow-hidden bg-muted">
                {settingsLogoPreview ? (
                  <>
                    <img src={settingsLogoPreview} alt="Logo" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ImagePlus className="h-6 w-6 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Upload</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </label>
              <div className="text-sm text-muted-foreground">
                <p>Klik untuk upload logo toko.</p>
                <p>Format: JPG, PNG. Maks 2MB.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi Bisnis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nama Bisnis</Label>
            <Input
              value={settingsBusinessName}
              onChange={e => setSettingsBusinessName(e.target.value)}
              placeholder="Nama toko / bisnis Anda"
              disabled={!isSuperAdmin}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={settingsEmail}
              onChange={e => setSettingsEmail(e.target.value)}
              placeholder="Email toko / bisnis"
              disabled={!isSuperAdmin}
            />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input
              value={settingsWhatsapp}
              onChange={e => setSettingsWhatsapp(e.target.value)}
              placeholder="Nomor WhatsApp (contoh: 08123...)"
              disabled={!isSuperAdmin}
            />
          </div>
          <div>
            <Label>Alamat Bisnis</Label>
            <Textarea
              value={settingsBusinessAddress}
              onChange={e => setSettingsBusinessAddress(e.target.value)}
              placeholder="Alamat lengkap toko / bisnis"
              rows={3}
              disabled={!isSuperAdmin}
            />
          </div>
        </CardContent>
      </Card>

      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ubah Password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Password Baru</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                minLength={6}
              />
            </div>
            <Button
              variant="outline"
              onClick={handleChangePassword}
              disabled={changingPassword || !newPassword}
            >
              {changingPassword ? 'Mengubah...' : 'Ubah Password'}
            </Button>
          </CardContent>
        </Card>
      )}

      {isSuperAdmin && (
        <Button onClick={handleSaveSettings} disabled={savingSettings} className="w-full sm:w-auto">
          {savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </Button>
      )}
    </div>
  );

  const getDeliveryStatusBadge = (status: string | null) => {
    switch (status) {
      case 'waiting_driver': return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Menunggu Driver</Badge>;
      case 'picked_up': return <Badge className="gap-1 bg-blue-600"><Truck className="h-3 w-3" />Dijemput</Badge>;
      case 'delivered': return <Badge className="gap-1 bg-green-600"><CheckCircle className="h-3 w-3" />Terkirim</Badge>;
      default: return <Badge variant="secondary">-</Badge>;
    }
  };

  const renderDelivery = () => (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Pesanan Pengiriman</h2>
        <Button variant="outline" size="sm" onClick={fetchDeliveryOrders} disabled={deliveryLoading}>
          {deliveryLoading ? 'Memuat...' : 'Refresh'}
        </Button>
      </div>

      {deliveryOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Belum ada pesanan pengiriman</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {deliveryOrders.map((order: any) => (
            <Card key={order.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{order.products?.name || 'Produk'}</p>
                    <p className="text-sm text-muted-foreground">
                      Customer: {order.customers?.name || '-'} {order.customers?.whatsapp ? `(${order.customers.whatsapp})` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={order.delivery_type === 'external_ojol' ? 'default' : 'secondary'}>
                      {order.delivery_type === 'external_ojol' ? '🏍️ Ojol' : '🏬 Pickup'}
                    </Badge>
                    {getDeliveryStatusBadge(order.delivery_status)}
                  </div>
                </div>

                {order.delivery_type === 'external_ojol' && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    {/* Pickup Point - Alamat Toko */}
                    {(() => {
                      const pickupAddr = order.pickup_address || merchantData?.business_address;
                      const merchantName = merchantData?.business_name || merchantData?.name || 'Toko';
                      return (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-muted-foreground mb-1">🏪 Pickup Point — {merchantName}</p>
                            {pickupAddr ? (
                              <p className="text-sm font-medium">{pickupAddr}</p>
                            ) : (
                              <p className="text-sm text-destructive italic">Alamat toko belum diatur. Silakan isi di Pengaturan Toko.</p>
                            )}
                          </div>
                          {pickupAddr && (
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(pickupAddr, 'Alamat Pickup')}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Salin
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <a href={generateGoogleMapsLink(pickupAddr)} target="_blank" rel="noopener noreferrer">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  Maps
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Alamat Pengiriman (Tujuan) */}
                    {order.delivery_address && (
                      <div className="flex items-start justify-between gap-2 pt-2 border-t">
                        <div className="flex-1">
                          <p className="text-xs font-medium text-muted-foreground mb-1">📍 Alamat Pengiriman (Tujuan)</p>
                          <p className="text-sm">{order.delivery_address}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => copyToClipboard(order.delivery_address, 'Alamat Tujuan')}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Salin
                        </Button>
                      </div>
                    )}

                    {order.delivery_notes && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">📝 Catatan Driver</p>
                        <p className="text-sm">{order.delivery_notes}</p>
                      </div>
                    )}

                    {/* Estimasi Ongkir */}
                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-1">🚚 Estimasi Ongkir (Standar Gojek)</p>
                      {order.estimated_shipping_cost ? (
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-primary">{formatShippingCost(Number(order.estimated_shipping_cost))}</p>
                          <span className="text-xs text-muted-foreground">({Number(order.estimated_distance_km)} km)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="Jarak (km)"
                            className="w-28 h-8 text-sm"
                            min={0}
                            step={0.5}
                            onChange={(e) => {
                              const km = Number(e.target.value);
                              if (km > 0) {
                                const cost = calculateGojekShipping(km);
                                const el = e.target.parentElement?.querySelector('.ongkir-preview') as HTMLElement;
                                if (el) el.textContent = formatShippingCost(cost);
                              }
                            }}
                            id={`distance-${order.id}`}
                          />
                          <span className="ongkir-preview text-sm font-medium text-primary">-</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const input = document.getElementById(`distance-${order.id}`) as HTMLInputElement;
                              const km = Number(input?.value);
                              if (!km || km <= 0) {
                                toast({ title: 'Masukkan jarak yang valid', variant: 'destructive' });
                                return;
                              }
                              const cost = calculateGojekShipping(km);
                              const { error } = await supabase.from('orders').update({
                                estimated_distance_km: km,
                                estimated_shipping_cost: cost,
                              }).eq('id', order.id);
                              if (error) {
                                toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
                              } else {
                                toast({ title: 'Estimasi ongkir tersimpan', description: `${km} km = ${formatShippingCost(cost)}` });
                                fetchDeliveryOrders();
                              }
                            }}
                          >
                            Simpan
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2 border-t">
                      {order.delivery_address && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a href={generateGoogleMapsLink(order.delivery_address)} target="_blank" rel="noopener noreferrer">
                            <MapPin className="h-3 w-3 mr-1" />
                            Maps Tujuan
                          </a>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        asChild
                      >
                        <a href={generateWhatsAppDriverLink(order)} target="_blank" rel="noopener noreferrer">
                          📱 Hubungi Driver
                        </a>
                      </Button>
                    </div>
                  </div>
                )}

                {order.delivery_status !== 'delivered' && (
                  <div className="flex gap-2 pt-2">
                    {order.delivery_status === 'waiting_driver' && (
                      <Button size="sm" variant="outline" onClick={() => handleUpdateDeliveryStatus(order.id, 'picked_up')}>
                        <Truck className="h-3 w-3 mr-1" />
                        Driver Sudah Jemput
                      </Button>
                    )}
                    {(order.delivery_status === 'waiting_driver' || order.delivery_status === 'picked_up') && (
                      <Button size="sm" onClick={() => handleUpdateDeliveryStatus(order.id, 'delivered')}>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Sudah Diterima
                      </Button>
                    )}
                  </div>
                )}

                {/* Edit/Delete for super admin */}
                {isSuperAdmin && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" onClick={() => openEditDelivery(order)}>
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeletingDelivery(order)}>
                      <Trash2 className="h-3 w-3 mr-1" />
                      Hapus
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Delivery Dialog */}
      <Dialog open={!!editingDelivery} onOpenChange={(open) => !open && setEditingDelivery(null)}>
        <DialogContent className="max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit Pesanan Pengiriman</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1">
          <div className="space-y-4">
            <div>
              <Label>Status Order</Label>
              <Input value={editDeliveryForm.status} onChange={e => setEditDeliveryForm({...editDeliveryForm, status: e.target.value})} placeholder="pending/completed/failed" />
            </div>
            <div>
              <Label>Tipe Pengiriman</Label>
              <Input value={editDeliveryForm.delivery_type} onChange={e => setEditDeliveryForm({...editDeliveryForm, delivery_type: e.target.value})} placeholder="pickup/external_ojol" />
            </div>
            <div>
              <Label>Status Pengiriman</Label>
              <Input value={editDeliveryForm.delivery_status} onChange={e => setEditDeliveryForm({...editDeliveryForm, delivery_status: e.target.value})} placeholder="waiting_driver/picked_up/delivered" />
            </div>
            <div>
              <Label>Alamat Pengiriman</Label>
              <Textarea value={editDeliveryForm.delivery_address} onChange={e => setEditDeliveryForm({...editDeliveryForm, delivery_address: e.target.value})} rows={2} />
            </div>
            <div>
              <Label>Catatan Driver</Label>
              <Textarea value={editDeliveryForm.delivery_notes} onChange={e => setEditDeliveryForm({...editDeliveryForm, delivery_notes: e.target.value})} rows={2} />
            </div>
            <div>
              <Label>Estimasi Jarak (km)</Label>
              <Input
                type="number"
                value={editDeliveryForm.estimated_distance_km}
                onChange={e => setEditDeliveryForm({...editDeliveryForm, estimated_distance_km: e.target.value})}
                placeholder="Contoh: 5"
                min={0}
                step={0.5}
              />
              {editDeliveryForm.estimated_distance_km && Number(editDeliveryForm.estimated_distance_km) > 0 && (
                <p className="text-sm text-primary font-medium mt-1">
                  Estimasi Ongkir: {formatShippingCost(calculateGojekShipping(Number(editDeliveryForm.estimated_distance_km)))}
                </p>
              )}
            </div>
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDelivery(null)}>Batal</Button>
            <Button onClick={handleSaveDeliveryEdit} disabled={savingDeliveryEdit}>
              {savingDeliveryEdit ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Delivery Confirmation */}
      <AlertDialog open={!!deletingDelivery} onOpenChange={(open) => !open && setDeletingDelivery(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pesanan Pengiriman</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus pesanan pengiriman ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDelivery} className="bg-destructive hover:bg-destructive/90">
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'products': return renderProducts();
      case 'history': return renderHistory();
      case 'delivery': return renderDelivery();
      case 'employees': return isSuperAdmin ? renderEmployees() : renderPOS();
      case 'settings': return renderSettings();
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
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setActiveView('delivery')} className={activeView === 'delivery' ? 'bg-accent' : ''}>
                      <Truck className="h-4 w-4" />
                      <span>Pengiriman</span>
                      {pendingDeliveryCount > 0 && (
                        <Badge variant="destructive" className="ml-auto h-5 min-w-[20px] px-1.5 text-xs">
                          {pendingDeliveryCount}
                        </Badge>
                      )}
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
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setActiveView('settings')} className={activeView === 'settings' ? 'bg-accent' : ''}>
                      <Settings className="h-4 w-4" />
                      <span>Pengaturan Toko</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
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
              {activeView === 'products' ? 'Produk Saya' : activeView === 'history' ? 'Riwayat Transaksi' : activeView === 'delivery' ? 'Pengiriman' : activeView === 'employees' ? 'Kelola Karyawan' : activeView === 'settings' ? 'Pengaturan Toko' : 'POS / Kasir'}
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
