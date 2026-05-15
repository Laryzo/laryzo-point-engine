import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Copy, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const CustomerTopupTransfer = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { customer } = useCustomerAuth();
  const [req, setReq] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from('topup_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      setReq(data);
    })();
  }, [id]);

  const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(Number(n || 0));

  const copy = (val: string, label: string) => {
    navigator.clipboard.writeText(val);
    toast.success(`${label} disalin`);
  };

  const confirmTransfer = async () => {
    if (!req || !customer?.id) return;
    setSubmitting(true);
    try {
      await supabase.auth.refreshSession();
      const { data, error } = await supabase.functions.invoke('wallet-topup-confirm', {
        body: { request_id: req.id, customer_id: customer.id },
      });
      if (error || !data?.success) {
        toast.error(data?.error || error?.message || 'Gagal konfirmasi');
        return;
      }
      toast.success('Konfirmasi terkirim. Tunggu admin verifikasi.');
      navigate('/portal/wallet');
    } finally {
      setSubmitting(false);
    }
  };

  if (!req) return <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin inline" /></div>;

  const bank = req.bank_snapshot || {};
  const alreadyConfirmed = !!req.customer_confirmed_at;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/portal/wallet')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-lg">Detail Transfer</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Transfer ke Rekening Berikut</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-primary/5 p-4 rounded-lg space-y-1">
              <p className="text-sm text-muted-foreground">Bank</p>
              <p className="font-semibold text-lg">{bank.bank_name}</p>
            </div>

            <div className="bg-primary/5 p-4 rounded-lg space-y-2">
              <p className="text-sm text-muted-foreground">No. Rekening</p>
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono font-bold text-xl">{bank.account_number}</p>
                <Button size="sm" variant="outline" onClick={() => copy(bank.account_number, 'Nomor rekening')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm">a.n. <b>{bank.account_holder}</b></p>
            </div>

            <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-lg space-y-2">
              <p className="text-sm text-yellow-800">Nominal Transfer (PERSIS)</p>
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-2xl text-yellow-900">Rp {fmt(req.transfer_amount)}</p>
                <Button size="sm" variant="outline" onClick={() => copy(String(req.transfer_amount), 'Nominal')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-yellow-700">
                Termasuk 3 angka unik <b>{req.unique_code}</b> agar admin mudah verifikasi.
                Saldo yang diterima: <b>Rp {fmt(req.amount)}</b>.
              </p>
            </div>

            {alreadyConfirmed ? (
              <div className="text-center text-green-700 bg-green-50 p-4 rounded-lg">
                <CheckCircle2 className="h-6 w-6 mx-auto mb-2" />
                <p className="font-semibold">Sudah dikonfirmasi</p>
                <p className="text-xs">Menunggu verifikasi admin.</p>
              </div>
            ) : (
              <Button className="w-full" onClick={confirmTransfer} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                SUDAH TRANSFER
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CustomerTopupTransfer;
