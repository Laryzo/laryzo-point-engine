import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Truck, CheckCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Order {
  id: string;
  customer_id: string;
  product_id: string;
  points_used: number;
  points_earned: number;
  status: string;
  ref_id: string | null;
  input_value: string | null;
  digiflazz_status: string | null;
  digiflazz_sn: string | null;
  digiflazz_message: string | null;
  shipping_address: string | null;
  tracking_number: string | null;
  shipping_status: string | null;
  admin_notes: string | null;
  processed_at: string | null;
  created_at: string;
  customers?: { name: string; whatsapp: string | null };
  products?: { name: string; type: string; digiflazz_sku: string | null };
}

const OrderManagement = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ppob');
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);
  const [showShippingDialog, setShowShippingDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [shippingForm, setShippingForm] = useState({
    tracking_number: '',
    shipping_status: 'shipped',
    admin_notes: ''
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers(name, whatsapp),
          products(name, type, digiflazz_sku)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async (orderId: string) => {
    setProcessingOrder(orderId);
    try {
      const { data, error } = await supabase.functions.invoke('digiflazz-check-status', {
        body: { order_id: orderId }
      });

      if (error) throw error;

      if (data.success) {
        toast({ 
          title: 'Status Updated', 
          description: `Status: ${data.digiflazz_status}${data.sn ? ` | SN: ${data.sn}` : ''}` 
        });
        fetchOrders();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingOrder(null);
    }
  };

  const processPhysicalOrder = async () => {
    if (!selectedOrder) return;

    setProcessingOrder(selectedOrder.id);
    try {
      const { data, error } = await supabase.functions.invoke('process-physical-order', {
        body: { 
          order_id: selectedOrder.id,
          tracking_number: shippingForm.tracking_number,
          shipping_status: shippingForm.shipping_status,
          admin_notes: shippingForm.admin_notes
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({ title: 'Berhasil', description: 'Pesanan berhasil diproses' });
        setShowShippingDialog(false);
        setSelectedOrder(null);
        setShippingForm({ tracking_number: '', shipping_status: 'shipped', admin_notes: '' });
        fetchOrders();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingOrder(null);
    }
  };

  const openShippingDialog = (order: Order) => {
    setSelectedOrder(order);
    setShippingForm({
      tracking_number: order.tracking_number || '',
      shipping_status: order.shipping_status || 'shipped',
      admin_notes: order.admin_notes || ''
    });
    setShowShippingDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      processing: 'outline',
      completed: 'default',
      failed: 'destructive'
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getDigiflazzStatusBadge = (status: string | null) => {
    if (!status) return null;
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      sukses: 'default',
      pending: 'outline',
      gagal: 'destructive'
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const ppobOrders = orders.filter(o => o.products?.type === 'ppob');
  const physicalOrders = orders.filter(o => o.products?.type === 'physical');

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Manajemen Pesanan</h2>
          <p className="text-muted-foreground">Kelola pesanan PPOB dan produk fisik</p>
        </div>
        <Button variant="outline" onClick={fetchOrders}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ppob">PPOB ({ppobOrders.length})</TabsTrigger>
          <TabsTrigger value="physical">Produk Fisik ({physicalOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="ppob" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead>Nomor Tujuan</TableHead>
                    <TableHead>Poin</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Digiflazz</TableHead>
                    <TableHead>SN</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : ppobOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        Belum ada pesanan PPOB
                      </TableCell>
                    </TableRow>
                  ) : (
                    ppobOrders.map((order, index) => (
                      <TableRow key={order.id}>
                        <TableCell className="text-muted-foreground font-medium">{index + 1}</TableCell>
                        <TableCell>{format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell>{order.customers?.name || '-'}</TableCell>
                        <TableCell>{order.products?.name || '-'}</TableCell>
                        <TableCell>{order.input_value || '-'}</TableCell>
                        <TableCell>{order.points_used.toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>{getDigiflazzStatusBadge(order.digiflazz_status)}</TableCell>
                        <TableCell className="font-mono text-xs">{order.digiflazz_sn || '-'}</TableCell>
                        <TableCell>
                          {(order.status === 'processing' || order.digiflazz_status === 'pending') && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              disabled={processingOrder === order.id}
                              onClick={() => checkStatus(order.id)}
                            >
                              {processingOrder === order.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="physical" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead>Alamat</TableHead>
                    <TableHead>Poin</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Resi</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : physicalOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Belum ada pesanan produk fisik
                      </TableCell>
                    </TableRow>
                  ) : (
                    physicalOrders.map((order, index) => (
                      <TableRow key={order.id}>
                        <TableCell className="text-muted-foreground font-medium">{index + 1}</TableCell>
                        <TableCell>{format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell>{order.customers?.name || '-'}</TableCell>
                        <TableCell>{order.products?.name || '-'}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{order.shipping_address || '-'}</TableCell>
                        <TableCell>{order.points_used.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {getStatusBadge(order.status)}
                            {order.shipping_status && (
                              <Badge variant="outline" className="text-xs">{order.shipping_status}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{order.tracking_number || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {order.status !== 'completed' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => openShippingDialog(order)}
                              >
                                <Truck className="w-4 h-4" />
                              </Button>
                            )}
                            {order.status === 'completed' && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Shipping Dialog */}
      <Dialog open={showShippingDialog} onOpenChange={setShowShippingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proses Pengiriman</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nomor Resi</Label>
              <Input 
                value={shippingForm.tracking_number}
                onChange={(e) => setShippingForm({ ...shippingForm, tracking_number: e.target.value })}
                placeholder="JNE123456789"
              />
            </div>
            <div className="space-y-2">
              <Label>Status Pengiriman</Label>
              <Select 
                value={shippingForm.shipping_status}
                onValueChange={(v) => setShippingForm({ ...shippingForm, shipping_status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="processing">Diproses</SelectItem>
                  <SelectItem value="shipped">Dikirim</SelectItem>
                  <SelectItem value="delivered">Terkirim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Catatan Admin</Label>
              <Textarea 
                value={shippingForm.admin_notes}
                onChange={(e) => setShippingForm({ ...shippingForm, admin_notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShippingDialog(false)}>
              Batal
            </Button>
            <Button 
              onClick={processPhysicalOrder}
              disabled={processingOrder === selectedOrder?.id}
            >
              {processingOrder === selectedOrder?.id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderManagement;
