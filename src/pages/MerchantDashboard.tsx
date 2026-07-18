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
import MapLocationPicker from '@/components/MapLocationPicker';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import MerchantProductForm from '@/components/MerchantProductForm';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { getAppFeePercent, computeSellingPrice, estimateCostFromPrice } from '@/lib/app-fee';

const formatShippingCost = (cost: number) => `Rp ${cost.toLocaleString('id-ID')}`;

const MerchantDashboard = () => {
  const { merchant, logout } = useMerchantAuth();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState(() => sessionStorage.getItem('laryzo_merchant_view') || 'pos');

  useEffect(() => {
    sessionStorage.setItem('laryzo_merchant_view', activeView);
  }, [activeView]);
  const [products, setProducts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [cart, setCart] = useState<{ product: any; qty: number; priceOverride?: number; nameOverride?: string }[]>([]);
  // Qty input modal (services + manual override)
  const [qtyModalIndex, setQtyModalIndex] = useState<number | null>(null);
  const [qtyModalQty, setQtyModalQty] = useState('1');
  const [qtyModalPrice, setQtyModalPrice] = useState('');
  // Quick ad-hoc item modal
  const [quickItemOpen, setQuickItemOpen] = useState(false);
  const [quickItem, setQuickItem] = useState({ name: '', price: '', qty: '1', unit: 'pcs', isService: false });
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [feePercent, setFeePercent] = useState<number>(5);
  useEffect(() => { getAppFeePercent().then(setFeePercent); }, []);

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
  const [settingsLatitude, setSettingsLatitude] = useState('');
  const [settingsLongitude, setSettingsLongitude] = useState('');

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
    
  });
  const [savingDeliveryEdit, setSavingDeliveryEdit] = useState(false);
  const [deletingDelivery, setDeletingDelivery] = useState<any>(null);

  // Merchant customers state
  const [merchantCustomers, setMerchantCustomers] = useState<any[]>([]);
  const [merchantCustomersLoading, setMerchantCustomersLoading] = useState(false);

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
    fetchMerchantCustomers();
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

  const fetchMerchantCustomers = async () => {
    setMerchantCustomersLoading(true);
    try {
      // Fetch from POS transactions (merchant_transactions)
      const { data: txData } = await supabase
        .from('merchant_transactions')
        .select('customer_id, customer_name, created_at, total, qty')
        .not('customer_id', 'is', null)
        .order('created_at', { ascending: false });

      // Fetch from online orders (orders table) for this merchant
      // Only fetch orders that belong to THIS merchant (exclude company PPOB/physical orders)
      const { data: orderData } = await supabase
        .from('orders')
        .select('customer_id, product_name, created_at, points_used')
        .eq('merchant_id', merchant!.id)
        .not('customer_id', 'is', null)
        .order('created_at', { ascending: false });

      // Fetch customer names for orders
      const orderCustomerIds = [...new Set((orderData || []).map(o => o.customer_id))];
      let customerNames = new Map<string, string>();
      if (orderCustomerIds.length > 0) {
        // Use safe RPC that only returns id + name (no PII exposure).
        const { data: customers } = await supabase
          .rpc('merchant_get_customer_names', { ids: orderCustomerIds });
        (customers || []).forEach((c: { id: string; name: string | null }) =>
          customerNames.set(c.id, c.name || 'Customer'));
      }


      // Group by customer_id from both sources
      const customerMap = new Map<string, { id: string; name: string; totalSpent: number; totalQty: number; totalOrders: number; lastOrder: string }>();

      const addEntry = (customerId: string, name: string, amount: number, qty: number, createdAt: string) => {
        const existing = customerMap.get(customerId);
        if (existing) {
          existing.totalSpent += amount;
          existing.totalQty += qty;
          existing.totalOrders += 1;
          if (createdAt > existing.lastOrder) existing.lastOrder = createdAt;
        } else {
          customerMap.set(customerId, {
            id: customerId,
            name,
            totalSpent: amount,
            totalQty: qty,
            totalOrders: 1,
            lastOrder: createdAt,
          });
        }
      };

      // Add POS transactions
      (txData || []).forEach(t => {
        if (!t.customer_id) return;
        addEntry(t.customer_id, t.customer_name || 'Customer', Number(t.total || 0), Number(t.qty || 0), t.created_at);
      });

      // Add online orders
      (orderData || []).forEach(o => {
        if (!o.customer_id) return;
        addEntry(o.customer_id, customerNames.get(o.customer_id) || 'Customer', Number(o.points_used || 0), 1, o.created_at);
      });

      setMerchantCustomers(Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent));
    } catch (error) {
      console.error('Error fetching merchant customers:', error);
    }
    setMerchantCustomersLoading(false);
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
      .select('*, merchant_products(cost_price)')
      .order('created_at', { ascending: false })
      .limit(50);
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
