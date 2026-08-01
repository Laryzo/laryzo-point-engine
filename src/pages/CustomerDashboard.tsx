import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useCustomerNotifications } from '@/hooks/useCustomerNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Coins, ShoppingBag, History, LogOut, Package, User, Wallet } from 'lucide-react';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { customer, logout, refreshCustomer } = useCustomerAuth();

  // Realtime notifications
  useCustomerNotifications({
    customerId: customer?.id || null,
    onPointsUpdate: () => {
      refreshCustomer();
    },
    onOrderUpdate: () => {},
  });

  const handleLogout = () => {
    logout();
    navigate('/portal/login');
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
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
          <Button size="sm" onClick={handleLogout} className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 hover:from-red-600 hover:to-red-700 shadow-md shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-300 font-medium">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary-foreground/20 rounded-full">
                  <Coins className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs text-primary-foreground/80">Total Poin</p>
                  <p className="text-2xl font-bold">{formatNumber(customer?.points || 0)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary-foreground/20 rounded-full">
                  <Wallet className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs text-primary-foreground/80">Saldo</p>
                  <p className="text-2xl font-bold">Rp {formatNumber(Number(customer?.balance || 0))}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/portal/wallet')}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="p-3 bg-primary/10 rounded-full mb-2">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-medium">Saldo</span>
            </CardContent>
          </Card>
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
              <span className="text-sm font-medium">Riwayat</span>
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
      </main>
    </div>
  );
};

export default CustomerDashboard;
