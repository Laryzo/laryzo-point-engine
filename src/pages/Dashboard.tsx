
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, ShoppingCart, Award, LogOut, Plus } from 'lucide-react';
import { CustomerTree } from '@/components/CustomerTree';
import { CustomerForm } from '@/components/CustomerForm';
import { TransactionForm } from '@/components/TransactionForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Laryzo Point Engine</h1>
            <p className="text-muted-foreground">Welcome back, {admin?.email}</p>
          </div>
          <Button variant="outline" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
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
            <Card>
              <CardHeader>
                <CardTitle>Customer Management</CardTitle>
                <CardDescription>Manage your customer database</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-muted-foreground">Customer list will be implemented here</div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>View all transactions and point distributions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-muted-foreground">Transaction list will be implemented here</div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
    </div>
  );
};

export default Dashboard;
