import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface OrderRow {
  id: string;
  customer_id: string;
  product_id: string;
  product_name: string | null;
  input_value: string | null;
  points_used: number;
  status: string;
  digiflazz_sn: string | null;
  digiflazz_message: string | null;
  customer_confirmed_at: string | null;
  created_at: string;
}

const CustomerOrderManual = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { customer } = useCustomerAuth();
  const { toast } = useToast();

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [adminWa, setAdminWa] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [waOpened, setWaOpened] = useState(false);

  const fetchData = useCallback(async () => {
    if (!orderId) return;
    const [orderRes, settingsRes] = await Promise.all([
      supabase.from('orders_customer_view').select('*').eq('id', orderId).maybeSingle(),
      supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'admin_ppob_wa_number')
        .maybeSingle(),
    ]);
    if (orderRes.data) setOrder(orderRes.data as any);
    if (settingsRes.data?.value) {
      setAdminWa(String(settingsRes.data.value).replace(/[^0-9]/g, ''));
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime: listen for status changes on this order
  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`order-manual-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        () => fetchData(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, fetchData]);

  const buildWaLink = () => {
    if (!adminWa || !order) return '';
    const shortId = order.id.slice(0, 8).toUpperCase();
    const lines = [
      'Halo Admin, saya ingin melanjutkan pesanan PPOB:',
      `• Produk: ${order.product_name || '-'}`,
      `• Nomor tujuan: ${order.input_value || '-'}`,
      `• Order ID: ${shortId}`,
      `• Customer: ${customer?.name || '-'}`,
      '',
      'Mohon diproses. Terima kasih.',
    ];
    return `https://wa.me/${adminWa}?text=${encodeURIComponent(lines.join('\n'))}`;
  };

  // Auto-open WhatsApp once on first mount when status is manual_pending
  useEffect(() => {
    if (
      order &&
      order.status === 'manual_pending' &&
      adminWa &&
      !waOpened
    ) {
      const link = buildWaLink();
      if (link) {
        // small delay so the user sees the page first
        const t = setTimeout(() => {
          window.open(link, '_blank', 'noopener,noreferrer');
          setWaOpened(true);
        }, 800);
        return () => clearTimeout(t);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status, adminWa]);

  const handleConfirmReceived = async () => {
    if (!orderId) return;
    setSubmitting(true);
    try {
      await supabase.auth.refreshSession();
      const { error } = await supabase.functions.invoke('ppob-manual-resolve', {
        body: { order_id: orderId, action: 'customer_confirm' },
      });
      if (error) throw error;
      toast({
        title: 'Konfirmasi terkirim',
        description: 'Admin akan segera menyelesaikan pesanan Anda.',
      });
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Gagal konfirmasi',
        description: err.message || 'Coba lagi sebentar',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!orderId) return;
    if (!confirm('Batalkan pesanan dan kembalikan poin?')) return;
    setSubmitting(true);
    try {
      await supabase.auth.refreshSession();
      const { error } = await supabase.functions.invoke('ppob-manual-resolve', {
        body: { order_id: orderId, action: 'customer_cancel' },
      });
      if (error) throw error;
      toast({
        title: 'Pesanan dibatalkan',
        description: 'Poin Anda telah dikembalikan.',
      });
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Gagal membatalkan',
        description: err.message || 'Coba lagi sebentar',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (n: number) =>
    `Rp ${new Intl.NumberFormat('id-ID').format(n)}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Pesanan tidak ditemukan</p>
            <Button onClick={() => navigate('/portal/orders')}>Kembali ke Pesanan</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCompleted = order.status === 'completed';
  const isFailed = order.status === 'failed';
  const isManualPending = order.status === 'manual_pending';
  const orderAgeMinutes =
    (Date.now() - new Date(order.created_at).getTime()) / 60000;
  const canCancel = isManualPending && orderAgeMinutes >= 5;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-background to-secondary/5 dark:from-orange-950/20">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/portal/orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Konfirmasi Pesanan</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Status banner */}
        {isCompleted && (
          <Card className="border-green-500 bg-green-50 dark:bg-green-950/30">
            <CardContent className="py-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-green-900 dark:text-green-200 mb-1">
                Pesanan Selesai!
              </h2>
              <p className="text-sm text-green-800 dark:text-green-300">
                Admin telah menyelesaikan pesanan Anda.
              </p>
              {order.digiflazz_sn && (
                <p className="mt-2 text-xs font-mono bg-white dark:bg-black/40 inline-block px-3 py-1 rounded">
                  SN: {order.digiflazz_sn}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {isFailed && (
          <Card className="border-red-500 bg-red-50 dark:bg-red-950/30">
            <CardContent className="py-6 text-center">
              <XCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-red-900 dark:text-red-200 mb-1">
                Pesanan Dibatalkan
              </h2>
              <p className="text-sm text-red-800 dark:text-red-300">
                Poin Anda telah dikembalikan.
              </p>
            </CardContent>
          </Card>
        )}

        {isManualPending && (
          <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/30">
            <CardContent className="py-5">
              <div className="flex items-start gap-3">
                <Clock className="h-6 w-6 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-bold text-orange-900 dark:text-orange-200 mb-1">
                    Menunggu Diproses Admin
                  </h2>
                  <p className="text-sm text-orange-800 dark:text-orange-300">
                    Sistem otomatis sedang sibuk. Pesanan Anda dialihkan ke admin untuk
                    diproses manual via WhatsApp. Admin sudah mendapat notifikasi.
                  </p>
                  {order.customer_confirmed_at && (
                    <p className="mt-2 text-xs flex items-center gap-1 text-orange-900 dark:text-orange-200">
                      <Sparkles className="h-3 w-3" /> Konfirmasi Anda sudah terkirim ke admin
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order detail */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detail Pesanan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order ID</span>
              <span className="font-mono">{order.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Produk</span>
              <span className="font-medium">{order.product_name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nomor tujuan</span>
              <span className="font-medium">{order.input_value || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">{formatCurrency(Number(order.points_used))}</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {isManualPending && (
          <div className="space-y-3">
            {adminWa ? (
              <Button
                asChild
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700 text-white h-14 text-base"
              >
                <a
                  href={buildWaLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setWaOpened(true)}
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Buka WhatsApp Admin Sekarang
                </a>
              </Button>
            ) : (
              <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30">
                <CardContent className="py-4 text-sm text-yellow-900 dark:text-yellow-200">
                  Nomor WhatsApp admin belum dikonfigurasi. Mohon tunggu admin menghubungi Anda.
                </CardContent>
              </Card>
            )}

            {!order.customer_confirmed_at && (
              <Button
                variant="outline"
                size="lg"
                className="w-full h-12"
                disabled={submitting}
                onClick={handleConfirmReceived}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Saya sudah terima produknya
              </Button>
            )}

            {canCancel && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                disabled={submitting}
                onClick={handleCancel}
              >
                Batalkan & Minta Refund Poin
              </Button>
            )}

            {!canCancel && !order.customer_confirmed_at && (
              <p className="text-xs text-center text-muted-foreground">
                Tombol batalkan tersedia setelah 5 menit.
              </p>
            )}
          </div>
        )}

        {(isCompleted || isFailed) && (
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => navigate('/portal/orders')}
          >
            Kembali ke Daftar Pesanan
          </Button>
        )}
      </main>
    </div>
  );
};

export default CustomerOrderManual;
