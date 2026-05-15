import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useCustomerNotifications } from '@/hooks/useCustomerNotifications';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, ShoppingBag, History, LogOut, Package, Clock, User, Wallet } from 'lucide-react';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { customer, logout, refreshCustomer } = useCustomerAuth();
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentPoints, setRecentPoints] = useState<any[]>([]);

  const fetchRecentData = async () => {
    if (!customer) return;

    // Fetch recent orders using secure view
    const { data: orders } = await supabase
      .from('orders_customer_view')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(3);

    if (orders) setRecentOrders(orders);

    // Fetch recent point history (simplified - all shown as "Poin dari Laryzo")
    const { data: points } = await supabase
      .from('point_history')
      .select('*')
      .eq('to_customer', customer.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (points) setRecentPoints(points);
  };

  // Realtime notifications
  useCustomerNotifications({
    customerId: customer?.id || null,
    onPointsUpdate: () => {
      refreshCustomer();
      fetchRecentData();
    },
    onOrderUpdate: fetchRecentData,
  });

  useEffect(() => {
    if (customer) {
      fetchRecentData();
    }
  }, [customer?.id]);

  const handleLogout = () => {
    logout();
    navigate('/portal/login');
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      delivered: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Laryzo Point</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Keluar
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome & Points */}
        <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-6">
            <p className="text-primary-foreground/80 mb-1">Selamat datang,</p>
            <h1 className="text-2xl font-bold mb-4">{customer?.name}</h1>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-foreground/20 rounded-full">
                <Coins className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm text-primary-foreground/80">Total Poin Anda</p>
                <p className="text-3xl font-bold">{formatNumber(customer?.points || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-4">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/portal/shop')}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="p-3 bg-primary/10 rounded-full mb-2">
                <ShoppingBag className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-medium">Belanja</span>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/portal/orders')}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="p-3 bg-primary/10 rounded-full mb-2">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-medium">Pesanan</span>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/portal/points')}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="p-3 bg-primary/10 rounded-full mb-2">
                <History className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-medium">Riwayat Poin</span>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/portal/profile')}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="p-3 bg-primary/10 rounded-full mb-2">
                <User className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-medium">Profil</span>
            </CardContent>
          </Card>
        </div>

        {/* Recent Points - Simplified View */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Poin Terbaru</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/portal/points')}>
                Lihat Semua
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPoints.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                Belum ada riwayat poin
              </p>
            ) : (
              recentPoints.map((point) => (
                <div key={point.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Coins className={`h-4 w-4 ${Number(point.points) < 0 ? 'text-red-600' : 'text-green-600'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{point.description || (Number(point.points) < 0 ? 'Penukaran Poin' : 'Poin dari Laryzo')}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(point.created_at)}</p>
                    </div>
                  </div>
                  <span className={`font-semibold ${Number(point.points) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {Number(point.points) < 0 ? '' : '+'}{formatNumber(Number(point.points))}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Pesanan Terbaru</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/portal/orders')}>
                Lihat Semua
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentOrders.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                Belum ada pesanan
              </p>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-full">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{order.product_name || 'Produk'}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CustomerDashboard;
