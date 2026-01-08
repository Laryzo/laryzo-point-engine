import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Coins, TrendingUp } from 'lucide-react';

interface PointHistory {
  id: string;
  points: number;
  created_at: string;
  product_code: string;
}

const CustomerPointHistory = () => {
  const navigate = useNavigate();
  const { customer, refreshCustomer } = useCustomerAuth();
  const [history, setHistory] = useState<PointHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (customer) {
      fetchHistory();
      refreshCustomer(); // Refresh customer data to get latest points
    }
  }, [customer?.id]);

  const fetchHistory = async () => {
    // Fetch all point history for this customer (simplified view)
    const { data, error } = await supabase
      .from('point_history')
      .select('*')
      .eq('to_customer', customer?.id)
      .order('created_at', { ascending: false });

    if (data) {
      setHistory(data.map(h => ({
        ...h,
        points: Number(h.points),
      })));
    }
    setLoading(false);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalEarned = history.reduce((sum, h) => sum + h.points, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/portal')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Riwayat Poin</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="h-5 w-5" />
                <span className="text-sm text-primary-foreground/80">Saldo Poin</span>
              </div>
              <p className="text-2xl font-bold">{formatNumber(customer?.points || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span className="text-sm text-muted-foreground">Total Diterima</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatNumber(totalEarned)}</p>
            </CardContent>
          </Card>
        </div>

        {/* History List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : history.length === 0 ? (
              <div className="py-12 text-center">
                <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Belum ada riwayat poin</p>
              </div>
            ) : (
              <div className="divide-y">
                {history.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-full">
                        <Coins className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        {/* All incoming points shown as "Poin dari Laryzo" for privacy */}
                        <p className="font-medium">Poin dari Laryzo</p>
                        <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-green-600">+{formatNumber(item.points)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CustomerPointHistory;
