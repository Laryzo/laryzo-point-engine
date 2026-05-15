import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Wallet, Plus, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const statusMap: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { label: 'Disetujui', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-800', icon: XCircle },
  cancelled: { label: 'Dibatalkan', color: 'bg-gray-100 text-gray-800', icon: XCircle },
};

const CustomerWallet = () => {
  const navigate = useNavigate();
  const { customer, refreshCustomer } = useCustomerAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!customer?.id) return;
    refreshCustomer();
    loadData();
  }, [customer?.id]);

  const loadData = async () => {
    if (!customer?.id) return;
    const { data: reqs } = await supabase
      .from('topup_requests')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setRequests(reqs || []);

    const { data: wallet } = await supabase
      .from('wallet_balances')
      .select('id')
      .eq('user_id', customer.id)
      .eq('user_type', 'customer')
      .maybeSingle();
    if (wallet?.id) {
      const { data: tx } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setTransactions(tx || []);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(Number(n || 0));
  const fmtDate = (s: string) => new Date(s).toLocaleString('id-ID');

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/portal')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-lg">Saldo Saya</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Wallet className="h-8 w-8" />
              <div>
                <p className="text-sm text-primary-foreground/80">Saldo Tersedia</p>
                <p className="text-3xl font-bold">Rp {fmt(customer?.balance || 0)}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => navigate('/portal/wallet/topup')}
            >
              <Plus className="h-4 w-4 mr-2" /> TOP UP SALDO
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Permintaan Top Up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {requests.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada permintaan</p>
            )}
            {requests.map((r) => {
              const s = statusMap[r.status] || statusMap.pending;
              const Icon = s.icon;
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                  onClick={() => r.status === 'pending' && navigate(`/portal/wallet/transfer/${r.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Rp {fmt(r.amount)}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</p>
                    </div>
                  </div>
                  <Badge className={s.color}>{s.label}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Riwayat Saldo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {transactions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada transaksi</p>
            )}
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">{t.description || t.type}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(t.created_at)}</p>
                </div>
                <span className={`font-semibold ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.type === 'credit' ? '+' : '-'}Rp {fmt(t.amount)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CustomerWallet;
