import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/hooks/useCart';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import MapLocationPicker from '@/components/MapLocationPicker';
import PaymentMethodSelector, { calculatePayment, type PaymentMethod } from '@/components/PaymentMethodSelector';
import { ArrowLeft, Loader2, MapPin, Truck } from 'lucide-react';

const formatNumber = (n: number) => new Intl.NumberFormat('id-ID').format(Number(n || 0));

const CustomerCheckout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, total, clear } = useCart();
  const { customer, refreshCustomer } = useCustomerAuth();

  const [deliveryType, setDeliveryType] = useState<'pickup' | 'external_ojol'>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState(customer?.address || '');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [deliveryLat, setDeliveryLat] = useState(customer?.latitude?.toString() || '');
  const [deliveryLng, setDeliveryLng] = useState(customer?.longitude?.toString() || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('points');
  const [loading, setLoading] = useState(false);

  // Checkout is only reachable with items explicitly added to the cart
  useEffect(() => {
    if (items.length === 0 && !loading) {
      navigate('/portal/cart', { replace: true });
    }
  }, [items.length, loading, navigate]);

  if (items.length === 0) return null;

  const walletBalance = Number(customer?.balance || 0);
  const pointsBalance = Number(customer?.points || 0);
  const calc = calculatePayment(paymentMethod, total, walletBalance, pointsBalance);

  const handleCheckout = async () => {
    if (!customer) return;
    if (deliveryType === 'external_ojol' && !deliveryAddress) {
      toast({ title: 'Error', description: 'Alamat pengiriman ojol harus diisi', variant: 'destructive' });
      return;
    }
    if (!calc.canPay) {
      toast({
        title: 'Pembayaran Tidak Cukup',
        description: `Kurang Rp ${formatNumber(calc.shortage)}. Silakan top up saldo.`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    let remainingWallet = walletBalance;
    let remainingPoints = pointsBalance;
    let succeeded = 0;

    try {
      await supabase.auth.refreshSession();

      for (const item of items) {
        for (let n = 0; n < item.qty; n++) {
          const unitCalc = calculatePayment(paymentMethod, item.price, remainingWallet, remainingPoints);
          if (!unitCalc.canPay) throw new Error('Saldo/poin tidak cukup untuk seluruh item');

          const { data: result, error: fnError } = await supabase.functions.invoke('merchant-product-purchase', {
            body: {
              product_id: item.product_id,
              wallet_used: unitCalc.walletUsed,
              points_used: unitCalc.pointsUsed,
              delivery_type: deliveryType,
              delivery_address: deliveryType === 'external_ojol' ? deliveryAddress : null,
              delivery_notes: deliveryNotes || null,
              delivery_latitude: deliveryType === 'external_ojol' && deliveryLat ? Number(deliveryLat) : null,
              delivery_longitude: deliveryType === 'external_ojol' && deliveryLng ? Number(deliveryLng) : null,
              item_notes: itemNotes || null,
            },
          });

          if (fnError) throw new Error(fnError.message || 'Gagal memproses pembelian');
          if (result && !result.success) throw new Error(result.error || 'Gagal memproses pembelian');

          remainingWallet -= unitCalc.walletUsed;
          remainingPoints -= unitCalc.pointsUsed;
          succeeded++;
        }
      }

      clear();
      await refreshCustomer();
      toast({ title: 'Pesanan Berhasil 🎉', description: `${succeeded} item berhasil diproses` });
      navigate('/portal/orders');
    } catch (error: any) {
      await refreshCustomer();
      toast({
        title: 'Error',
        description: `${error.message || 'Gagal membuat pesanan'}${succeeded > 0 ? ` (${succeeded} item sudah diproses)` : ''}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/portal/cart')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Checkout</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-2">
            <h2 className="font-semibold text-sm">Ringkasan Pesanan</h2>
            {items.map((i) => (
              <div key={i.product_id} className="flex justify-between text-sm">
                <span className="truncate mr-2">
                  {i.name} <span className="text-muted-foreground">x{i.qty}</span>
                </span>
                <span>{formatNumber(i.price * i.qty)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold pt-2 border-t">
              <span>Total</span>
              <span className="text-primary">{formatNumber(total)} poin</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Truck className="h-4 w-4" /> Metode Pengambilan
            </Label>
            <RadioGroup value={deliveryType} onValueChange={(v) => setDeliveryType(v as 'pickup' | 'external_ojol')} className="space-y-2">
              <div className="flex items-center gap-2 border rounded-lg p-3">
                <RadioGroupItem value="pickup" id="d-pickup" />
                <Label htmlFor="d-pickup" className="cursor-pointer">Ambil sendiri di tempat mitra</Label>
              </div>
              <div className="flex items-center gap-2 border rounded-lg p-3">
                <RadioGroupItem value="external_ojol" id="d-ojol" />
                <Label htmlFor="d-ojol" className="cursor-pointer">Kirim via ojol (ongkir dibayar langsung ke kurir)</Label>
              </div>
            </RadioGroup>

            {deliveryType === 'external_ojol' && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="addr">Alamat Pengiriman</Label>
                  <Textarea id="addr" rows={2} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> Pin Lokasi
                  </Label>
                  <MapLocationPicker
                    latitude={deliveryLat}
                    longitude={deliveryLng}
                    onSave={(lat, lng) => {
                      setDeliveryLat(lat);
                      setDeliveryLng(lng);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="dnotes">Catatan Kurir</Label>
                  <Input id="dnotes" value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="inotes">Catatan Pesanan (opsional)</Label>
              <Textarea id="inotes" rows={2} value={itemNotes} onChange={(e) => setItemNotes(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <PaymentMethodSelector
          totalPrice={total}
          walletBalance={walletBalance}
          pointsBalance={pointsBalance}
          method={paymentMethod}
          onChange={setPaymentMethod}
          onCalculated={() => {}}
        />

        <Button className="w-full" size="lg" disabled={loading} onClick={handleCheckout}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memproses...
            </>
          ) : (
            `Bayar ${formatNumber(total)} poin`
          )}
        </Button>
      </main>
    </div>
  );
};

export default CustomerCheckout;
