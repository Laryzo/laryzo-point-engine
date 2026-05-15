import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CustomerTopupForm = () => {
  const navigate = useNavigate();
  const { customer } = useCustomerAuth();
  const [banks, setBanks] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [bankId, setBankId] = useState('');
  const [minAmount, setMinAmount] = useState(10000);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: bs } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      setBanks(bs || []);

      const { data: m } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'min_topup_amount')
        .maybeSingle();
      if (m?.value) setMinAmount(Number(m.value));
    })();
  }, []);

  const submit = async () => {
    if (!customer?.id) return;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error('Jumlah tidak valid');
    if (amt < minAmount) return toast.error(`Minimum Rp ${minAmount.toLocaleString('id-ID')}`);
    if (!bankId) return toast.error('Pilih rekening tujuan');

    setSubmitting(true);
    try {
      await supabase.auth.refreshSession();
      const { data, error } = await supabase.functions.invoke('wallet-topup-create', {
        body: { customer_id: customer.id, amount: amt, bank_account_id: bankId },
      });
      if (error || !data?.success) {
        toast.error(data?.error || error?.message || 'Gagal membuat permintaan');
        return;
      }
      navigate(`/portal/wallet/transfer/${data.request.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/portal/wallet')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-lg">Top Up Saldo</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Form Top Up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Jumlah Top Up (Rp)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={amount}
                placeholder={`Min. ${minAmount.toLocaleString('id-ID')}`}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="flex gap-2 flex-wrap">
                {[50000, 100000, 200000, 500000].map((v) => (
                  <Button key={v} type="button" size="sm" variant="outline" onClick={() => setAmount(String(v))}>
                    {v.toLocaleString('id-ID')}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Transfer Ke</Label>
              <Select value={bankId} onValueChange={setBankId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih rekening tujuan" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.bank_name} - {b.account_number} ({b.account_holder})
                    </SelectItem>
                  ))}
                  {banks.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground">Belum ada rekening tersedia</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full" onClick={submit} disabled={submitting || !amount || !bankId}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              LANJUT TRANSFER
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CustomerTopupForm;
