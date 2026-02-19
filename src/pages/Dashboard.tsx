
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, ShoppingCart, Award, LogOut, Plus, Settings, Home, TreePine, List, Receipt, Satellite, Package, ClipboardList, Cog, Store, CalendarDays, BarChart3 } from 'lucide-react';
import { CustomerTree } from '@/components/CustomerTree';
import { CustomerForm } from '@/components/CustomerForm';
import { TransactionForm } from '@/components/TransactionForm';
import { CustomerList } from '@/components/CustomerList';
import { CustomerListEnhanced } from '@/components/CustomerListEnhanced';
import { TransactionList } from '@/components/TransactionList';
import { TransactionListEnhanced } from '@/components/TransactionListEnhanced';
import AdminManagement from '@/components/AdminManagement';
import SatelliteApiInfo from '@/components/SatelliteApiInfo';
import ProductManagement from '@/pages/ProductManagement';
import OrderManagement from '@/pages/OrderManagement';
import SystemSettings from '@/pages/SystemSettings';
import MerchantManagement from '@/components/MerchantManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const Dashboard = () => {
  const { admin, logout } = useAuth();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    todayOrders: 0,
    todayPpob: 0,
    todayUmkm: 0,
    activeMerchants: 0,
  });
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const [
        customersRes,
        transactionsRes,
        ordersCountRes,
        pendingRes,
        completedRes,
        todayOrdersRes,
        todayPpobRes,
        todayUmkmRes,
        merchantsRes,
      ] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('transactions').select('margin, qty'),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['pending', 'processing']),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', todayISO),
        supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', todayISO).eq('order_type', 'ppob'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', todayISO).in('order_type', ['food', 'product']),
        supabase.from('merchants').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      const totalRevenue = transactionsRes.data?.reduce((sum, t) => sum + (Number(t.margin) || 0) * (t.qty || 0), 0) || 0;

      setStats({
        totalCustomers: customersRes.count || 0,
        totalTransactions: transactionsRes.data?.length || 0,
        totalRevenue,
        totalOrders: ordersCountRes.count || 0,
        pendingOrders: pendingRes.count || 0,
        completedOrders: completedRes.count || 0,
        todayOrders: todayOrdersRes.count || 0,
        todayPpob: todayPpobRes.count || 0,
        todayUmkm: todayUmkmRes.count || 0,
        activeMerchants: merchantsRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'merchants':
        return <MerchantManagement />;
      case 'admin':
        return <AdminManagement />;
      case 'satellite-api':
        return <SatelliteApiInfo />;
      case 'products':
        return <ProductManagement isSuperAdmin={isSuperAdmin} />;
      case 'orders':
        return <OrderManagement isSuperAdmin={isSuperAdmin} />;
      case 'settings':
        return isSuperAdmin ? <SystemSettings /> : null;
      case 'tree':
        return (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Customer Tree</h2>
                <p className="text-muted-foreground">Visual representation of your customer network</p>
              </div>
              <div className="space-x-2">
                <Button onClick={() => setShowCustomerForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Customer
                </Button>
              </div>
            </div>
            <Card>
              <CardContent className="p-0">
                <CustomerTree onStatsUpdate={fetchStats} />
              </CardContent>
            </Card>
          </div>
        );
      case 'customers':
        return (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Customers</h2>
                <p className="text-muted-foreground">Manage your customer database</p>
              </div>
              <Button onClick={() => setShowCustomerForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            </div>
            <CustomerListEnhanced isSuperAdmin={isSuperAdmin} />
          </div>
        );
      case 'transactions':
        return (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Transactions</h2>
                <p className="text-muted-foreground">Track all customer transactions</p>
              </div>
              <Button onClick={() => setShowTransactionForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            </div>
            <TransactionListEnhanced isSuperAdmin={isSuperAdmin} />
          </div>
        );
      default:
        return (
          <div className="p-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalCustomers}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTransactions}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Rp {stats.totalRevenue.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalOrders}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.completedOrders}</div>
                </CardContent>
              </Card>
            </div>

            {/* Daily Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Order Hari Ini</CardTitle>
                  <CalendarDays className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{stats.todayOrders}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">PPOB Hari Ini</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.todayPpob}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">UMKM Hari Ini</CardTitle>
                  <Store className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.todayUmkm}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Merchant Aktif</CardTitle>
                  <Store className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeMerchants}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
    }
  };

  const isSuperAdmin = admin?.role === 'super_admin';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Sidebar */}
        <Sidebar className="w-64">
          <SidebarContent>
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Laryzo Point Engine</h2>
              <p className="text-sm text-muted-foreground">{admin?.name || admin?.email}</p>
            </div>
            
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setActiveView('dashboard')}
                      className={activeView === 'dashboard' ? 'bg-accent' : ''}
                    >
                      <Home className="h-4 w-4" />
                      <span>Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {isSuperAdmin && (
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        onClick={() => setActiveView('admin')}
                        className={activeView === 'admin' ? 'bg-accent' : ''}
                      >
                        <Settings className="h-4 w-4" />
                        <span>Admin Management</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {isSuperAdmin && (
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        onClick={() => setActiveView('satellite-api')}
                        className={activeView === 'satellite-api' ? 'bg-accent' : ''}
                      >
                        <Satellite className="h-4 w-4" />
                        <span>Satellite API</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {isSuperAdmin && (
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        onClick={() => setActiveView('tree')}
                        className={activeView === 'tree' ? 'bg-accent' : ''}
                      >
                        <TreePine className="h-4 w-4" />
                        <span>Customer Tree</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setActiveView('customers')}
                      className={activeView === 'customers' ? 'bg-accent' : ''}
                    >
                      <List className="h-4 w-4" />
                      <span>Customers</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setActiveView('transactions')}
                      className={activeView === 'transactions' ? 'bg-accent' : ''}
                    >
                      <Receipt className="h-4 w-4" />
                      <span>Transactions</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setActiveView('products')}
                      className={activeView === 'products' ? 'bg-accent' : ''}
                    >
                      <Package className="h-4 w-4" />
                      <span>Products</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {isSuperAdmin && (
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        onClick={() => setActiveView('merchants')}
                        className={activeView === 'merchants' ? 'bg-accent' : ''}
                      >
                        <Store className="h-4 w-4" />
                        <span>Mitra</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setActiveView('orders')}
                      className={activeView === 'orders' ? 'bg-accent' : ''}
                    >
                      <ClipboardList className="h-4 w-4" />
                      <span>Orders</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {isSuperAdmin && (
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        onClick={() => setActiveView('settings')}
                        className={activeView === 'settings' ? 'bg-accent' : ''}
                      >
                        <Cog className="h-4 w-4" />
                        <span>Settings</span>
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

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b bg-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h1 className="text-xl font-semibold">
                {activeView === 'admin' ? 'Admin Management' : 
                 activeView === 'satellite-api' ? 'Satellite API' :
                 activeView === 'tree' ? 'Customer Tree' :
                 activeView === 'customers' ? 'Customers' :
                 activeView === 'transactions' ? 'Transactions' :
                 activeView === 'products' ? 'Products' :
                 activeView === 'orders' ? 'Orders' :
                 activeView === 'merchants' ? 'Mitra' :
                 activeView === 'settings' ? 'Settings' :
                 'Dashboard'}
              </h1>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-auto">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>

      {/* Forms */}
      {showCustomerForm && (
        <CustomerForm 
          onClose={() => setShowCustomerForm(false)}
          onSuccess={() => {
            setShowCustomerForm(false);
            fetchStats();
          }}
        />
      )}

      {showTransactionForm && (
        <TransactionForm 
          onClose={() => setShowTransactionForm(false)}
          onSuccess={() => {
            setShowTransactionForm(false);
            fetchStats();
          }}
        />
      )}
    </SidebarProvider>
  );
};

export default Dashboard;
