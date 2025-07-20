
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, ShoppingCart, Award, LogOut, Plus, Settings, Home } from 'lucide-react';
import { CustomerTree } from '@/components/CustomerTree';
import { CustomerForm } from '@/components/CustomerForm';
import { TransactionForm } from '@/components/TransactionForm';
import { CustomerList } from '@/components/CustomerList';
import { TransactionList } from '@/components/TransactionList';
import AdminManagement from '@/components/AdminManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const Dashboard = () => {
  const { admin, logout } = useAuth();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalTransactions: 0,
    totalPoints: 0,
    totalRevenue: 0,
  });
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [customersRes, transactionsRes, pointsRes] = await Promise.all([
        supabase.from('customers').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('point_history').select('points'),
      ]);

      const totalPoints = pointsRes.data?.reduce((sum, p) => sum + (Number(p.points) || 0), 0) || 0;
      const totalRevenue = transactionsRes.data?.reduce((sum, t) => sum + (Number(t.margin) || 0) * (t.qty || 0), 0) || 0;

      setStats({
        totalCustomers: customersRes.data?.length || 0,
        totalTransactions: transactionsRes.data?.length || 0,
        totalPoints,
        totalRevenue,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'admin':
        return <AdminManagement />;
      default:
        return (
          <div className="p-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
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
                  <CardTitle className="text-sm font-medium">Total Points</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalPoints.toFixed(2)}</div>
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
            </div>

            {/* Main Content */}
            <Tabs defaultValue="tree" className="space-y-4">
              <div className="flex justify-between items-center">
                <TabsList>
                  <TabsTrigger value="tree">Customer Tree</TabsTrigger>
                  <TabsTrigger value="customers">Customers</TabsTrigger>
                  <TabsTrigger value="transactions">Transactions</TabsTrigger>
                </TabsList>
                <div className="space-x-2">
                  <Button onClick={() => setShowCustomerForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Customer
                  </Button>
                  <Button onClick={() => setShowTransactionForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Transaction
                  </Button>
                </div>
              </div>

              <TabsContent value="tree">
                <Card>
                  <CardHeader>
                    <CardTitle>Binary Tree Structure</CardTitle>
                    <CardDescription>Visual representation of your customer network</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CustomerTree onStatsUpdate={fetchStats} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="customers">
                <CustomerList />
              </TabsContent>

              <TabsContent value="transactions">
                <TransactionList />
              </TabsContent>
            </Tabs>
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
                {activeView === 'admin' ? 'Admin Management' : 'Dashboard'}
              </h1>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {renderContent()}
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
