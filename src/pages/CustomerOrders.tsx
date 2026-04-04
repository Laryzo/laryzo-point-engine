import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';

interface Order {
  id: string;
  status: string;
  points_used: number;
  input_value: string;
  shipping_address: string;
  tracking_number: string;
  digiflazz_sn: string;
  created_at: string;
  product_name: string;
  product_type: string;
  item_notes: string;
  estimated_shipping_cost: number;
  order_type: string;
}

const CustomerOrders = () => {
  const navigate = useNavigate();
  const { customer } = useCustomerAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (customer) {
      fetchOrders();
    }
  }, [customer?.id]);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders_customer_view')
      .select('*')
      .eq('customer_id', customer?.id)
      .order('created_at', { ascending: false });

    if (data) {
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const formatCurrency = (num: number) => {
    return `Rp ${new Intl.NumberFormat('id-ID').format(num)}`;
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'processing':
        return <Package className="h-5 w-5 text-blue-500" />;
      case 'completed':
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'shipped':
        return <Truck className="h-5 w-5 text-blue-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Package className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Menunggu',
      processing: 'Diproses',
      completed: 'Selesai',
      delivered: 'Terkirim',
      shipped: 'Dalam Pengiriman',
      failed: 'Gagal',
    };
    return labels[status] || status;
  };

  const getStatusStyle = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      delivered: 'bg-green-100 text-green-800',
      shipped: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-muted text-muted-foreground';
  };

  const getProductPrice = (order: Order) => {
    return Number(order.points_used || 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/portal')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Pesanan Saya</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Belum ada pesanan</p>
              <Button onClick={() => navigate('/portal/shop')}>
                Mulai Belanja
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const productPrice = getProductPrice(order);
              const shippingCost = Number(order.estimated_shipping_cost || 0);

              return (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(order.status)}
                        <div>
                          <h3 className="font-medium">{order.product_name || 'Produk'}</h3>
                          <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusStyle(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      {/* Item notes */}
                      {order.item_notes && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Catatan</span>
                          <span className="text-right">{order.item_notes}</span>
                        </div>
                      )}

                      {/* Price breakdown */}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Harga</span>
                        <span>{formatCurrency(productPrice > 0 ? productPrice : Number(order.points_used))}</span>
                      </div>

                      {shippingCost > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ongkir</span>
                          <span>{formatCurrency(shippingCost)}</span>
                        </div>
                      )}

                      <div className="flex justify-between font-medium border-t pt-2">
                        <span>Total</span>
                        <span>{formatCurrency(Number(order.points_used))}</span>
                      </div>

                      {order.input_value && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Input</span>
                          <span>{order.input_value}</span>
                        </div>
                      )}

                      {order.digiflazz_sn && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">SN/Token</span>
                          <span className="font-mono text-xs">{order.digiflazz_sn}</span>
                        </div>
                      )}

                      {order.tracking_number && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">No. Resi</span>
                          <span className="font-mono">{order.tracking_number}</span>
                        </div>
                      )}

                      {order.shipping_address && (
                        <div className="pt-2 border-t">
                          <span className="text-muted-foreground block mb-1">Alamat Pengiriman</span>
                          <span className="text-sm">{order.shipping_address}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerOrders;
