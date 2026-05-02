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
import { RefreshCw, Truck, CheckCircle, Loader2, Undo2, Trash2, ChevronLeft, ChevronRight, Pencil, MessageCircle, XCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

interface OrderManagementProps {
  isSuperAdmin?: boolean;
}

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
  customer_confirmed_at: string | null;
  customers?: { name: string; whatsapp: string | null };
  products?: { name: string; type: string; digiflazz_sku: string | null };
}

const OrderManagement = ({ isSuperAdmin = false }: OrderManagementProps) => {
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
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [refundingOrder, setRefundingOrder] = useState<Order | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Edit order state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editForm, setEditForm] = useState({
    status: '',
    input_value: '',
    shipping_address: '',
    tracking_number: '',
    shipping_status: '',
    admin_notes: '',
    points_used: 0,
    points_earned: 0,
    digiflazz_sn: '',
    digiflazz_status: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    fetchOrders();
  }, [currentPage]);

  // Realtime: notify admin when manual_pending orders arrive or customer confirms
  useEffect(() => {
    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload: any) => {
          const newRow = payload.new;
          const oldRow = payload.old;
          if (
            newRow?.status === 'manual_pending' &&
            oldRow?.status !== 'manual_pending'
          ) {
            toast({
              title: '🔔 Order Manual Baru',
              description: 'Ada order PPOB yang perlu diproses manual via WhatsApp.',
            });
          }
          if (
            newRow?.customer_confirmed_at &&
            !oldRow?.customer_confirmed_at
          ) {
            toast({
              title: '✅ Customer Konfirmasi',
              description: 'Customer menandai sudah menerima produk PPOB.',
            });
          }
          fetchOrders();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from('orders')
        .select(`
          *,
          customers(name, whatsapp),
          products(name, type, digiflazz_sku)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setOrders(data || []);
      setTotalCount(count || 0);
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

  const resolveManualOrder = async (orderId: string, action: 'success' | 'fail') => {
    setProcessingOrder(orderId);
    try {
      let sn: string | undefined;
      if (action === 'success') {
        const input = window.prompt('Masukkan SN/Token (opsional, boleh kosong):', '');
        if (input === null) {
          setProcessingOrder(null);
          return;
        }
        sn = input.trim() || undefined;
      } else {
        if (!window.confirm('Yakin tandai GAGAL? Poin customer akan di-refund.')) {
          setProcessingOrder(null);
          return;
        }
      }

      await supabase.auth.refreshSession();
      const { data, error } = await supabase.functions.invoke('ppob-manual-resolve', {
        body: { order_id: orderId, action, sn },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Gagal memproses');

      toast({
        title: 'Berhasil',
        description: action === 'success'
          ? `Pesanan ditandai sukses. Distribusi ke ${data.distributed} penerima.`
          : `Pesanan ditandai gagal. ${Number(data.refunded || 0).toLocaleString('id-ID')} poin direfund.`,
      });
      fetchOrders();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setProcessingOrder(null);
    }
  };

  const openWaCustomer = (order: Order) => {
    const wa = order.customers?.whatsapp?.replace(/[^0-9]/g, '') || '';
    if (!wa) {
      toast({ title: 'Tidak ada WhatsApp', description: 'Customer belum mengisi nomor WA', variant: 'destructive' });
      return;
    }
    const normalized = wa.startsWith('0') ? '62' + wa.slice(1) : wa.startsWith('62') ? wa : '62' + wa;
    const shortId = order.id.slice(0, 8).toUpperCase();
    const text = encodeURIComponent(
      `Halo ${order.customers?.name || 'customer'}, terkait pesanan PPOB ${order.products?.name || ''} (Order ${shortId}) ke nomor ${order.input_value || '-'}, mohon konfirmasi sebentar ya.`
    );
    window.open(`https://wa.me/${normalized}?text=${text}`, '_blank');
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

  const openRefundConfirm = (order: Order) => {
    setRefundingOrder(order);
    setShowRefundConfirm(true);
  };

  const refundPoints = async () => {
    if (!refundingOrder) return;

    setProcessingOrder(refundingOrder.id);
    try {
      // Check if already refunded
      const { data: existingRefund } = await supabase
        .from('point_history')
        .select('id')
        .eq('to_customer', refundingOrder.customer_id)
        .eq('product_code', 'REFUND')
        .eq('points', refundingOrder.points_used)
        .gte('created_at', refundingOrder.created_at)
        .maybeSingle();

      if (existingRefund) {
        toast({
          title: 'Info',
          description: 'Poin untuk order ini sudah pernah di-refund.',
          variant: 'default'
        });
        setShowRefundConfirm(false);
        setRefundingOrder(null);
        setProcessingOrder(null);
        return;
      }

      // Insert refund to point_history (trigger will update customers.points)
      const { error: refundError } = await supabase
        .from('point_history')
        .insert({
          from_customer: null,
          to_customer: refundingOrder.customer_id,
          points: refundingOrder.points_used,
          level: 0,
          transaction_id: null,
          product_code: 'REFUND'
        });

      if (refundError) throw refundError;

      // Update order status to mark it as refunded
      await supabase
        .from('orders')
        .update({ 
          admin_notes: (refundingOrder.admin_notes || '') + '\n[REFUNDED] ' + new Date().toISOString()
        })
        .eq('id', refundingOrder.id);

      toast({
        title: 'Berhasil',
        description: `${refundingOrder.points_used.toLocaleString()} poin berhasil dikembalikan.`
      });

      fetchOrders();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setShowRefundConfirm(false);
      setRefundingOrder(null);
      setProcessingOrder(null);
    }
  };

  const isOrderRefunded = (order: Order) => {
    return order.admin_notes?.includes('[REFUNDED]') || false;
  };

  const openDeleteConfirm = (order: Order) => {
    setDeletingOrder(order);
    setShowDeleteConfirm(true);
  };

  const openEditDialog = (order: Order) => {
    setEditingOrder(order);
    setEditForm({
      status: order.status,
      input_value: order.input_value || '',
      shipping_address: order.shipping_address || '',
      tracking_number: order.tracking_number || '',
      shipping_status: order.shipping_status || '',
      admin_notes: order.admin_notes || '',
      points_used: order.points_used,
      points_earned: order.points_earned,
      digiflazz_sn: order.digiflazz_sn || '',
      digiflazz_status: order.digiflazz_status || '',
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: editForm.status,
          input_value: editForm.input_value || null,
          shipping_address: editForm.shipping_address || null,
          tracking_number: editForm.tracking_number || null,
          shipping_status: editForm.shipping_status || null,
          admin_notes: editForm.admin_notes || null,
          points_used: editForm.points_used,
          points_earned: editForm.points_earned,
          digiflazz_sn: editForm.digiflazz_sn || null,
          digiflazz_status: editForm.digiflazz_status || null,
        })
        .eq('id', editingOrder.id);

      if (error) throw error;
      toast({ title: 'Order berhasil diperbarui' });
      setShowEditDialog(false);
      setEditingOrder(null);
      fetchOrders();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    setSavingEdit(false);
  };

  const deleteOrder = async () => {
    if (!deletingOrder) return;

    setProcessingOrder(deletingOrder.id);
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', deletingOrder.id);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Order berhasil dihapus.'
      });

      fetchOrders();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setShowDeleteConfirm(false);
      setDeletingOrder(null);
      setProcessingOrder(null);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'manual_pending') {
      return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Manual (WA)</Badge>;
    }
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
          <TabsTrigger value="ppob">
            PPOB ({ppobOrders.length})
            {ppobOrders.filter(o => o.status === 'manual_pending').length > 0 && (
              <Badge className="ml-2 bg-orange-500 hover:bg-orange-600 text-white animate-pulse">
                {ppobOrders.filter(o => o.status === 'manual_pending').length} manual
              </Badge>
            )}
          </TabsTrigger>
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
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap">
                            {getStatusBadge(order.status)}
                            {order.customer_confirmed_at && order.status === 'manual_pending' && (
                              <Badge className="bg-blue-500 hover:bg-blue-600 text-white text-[10px]" title={`Customer konfirmasi diterima pada ${order.customer_confirmed_at}`}>
                                ✓ Customer OK
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getDigiflazzStatusBadge(order.digiflazz_status)}</TableCell>
                        <TableCell className="font-mono text-xs">{order.digiflazz_sn || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {(order.status === 'processing' || order.digiflazz_status === 'pending') && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                disabled={processingOrder === order.id}
                                onClick={() => checkStatus(order.id)}
                                title="Cek Status"
                              >
                                {processingOrder === order.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                            {order.status === 'manual_pending' && (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  disabled={processingOrder === order.id}
                                  onClick={() => resolveManualOrder(order.id, 'success')}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  {processingOrder === order.id ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                  )}
                                  Tandai Sukses
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={processingOrder === order.id}
                                  onClick={() => resolveManualOrder(order.id, 'fail')}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Tandai Gagal
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openWaCustomer(order)}
                                  className="border-green-600 text-green-700 hover:bg-green-50"
                                >
                                  <MessageCircle className="w-4 h-4 mr-1" />
                                  WA Customer
                                </Button>
                              </div>
                            )}
                            {order.status === 'failed' && !isOrderRefunded(order) && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                disabled={processingOrder === order.id}
                                onClick={() => openRefundConfirm(order)}
                                title="Refund Poin"
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                              >
                                {processingOrder === order.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Undo2 className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                            {order.status === 'failed' && isOrderRefunded(order) && (
                              <Badge variant="outline" className="text-xs text-green-600">Refunded</Badge>
                            )}
                            {isSuperAdmin && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => openEditDialog(order)}
                                title="Edit Order"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            {isSuperAdmin && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                disabled={processingOrder === order.id}
                                onClick={() => openDeleteConfirm(order)}
                                title="Hapus Order"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
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
                            {isSuperAdmin && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => openEditDialog(order)}
                                title="Edit Order"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            {isSuperAdmin && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                disabled={processingOrder === order.id}
                                onClick={() => openDeleteConfirm(order)}
                                title="Hapus Order"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
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

      {/* Pagination */}
      {totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Menampilkan {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, totalCount)} dari {totalCount} order
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage * PAGE_SIZE >= totalCount}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

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

      {/* Refund Confirmation Dialog */}
      <AlertDialog open={showRefundConfirm} onOpenChange={setShowRefundConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Refund Poin</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan mengembalikan <strong>{refundingOrder?.points_used.toLocaleString()}</strong> poin 
              ke customer <strong>{refundingOrder?.customers?.name}</strong>.
              <br /><br />
              Aksi ini tidak dapat dibatalkan. Pastikan order ini memang gagal dan layak di-refund.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={refundPoints}
              disabled={processingOrder === refundingOrder?.id}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {processingOrder === refundingOrder?.id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Ya, Refund Poin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Order</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menghapus order <strong>{deletingOrder?.products?.name}</strong> dari 
              customer <strong>{deletingOrder?.customers?.name}</strong>.
              <br /><br />
              Aksi ini tidak dapat dibatalkan. Data order akan hilang secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteOrder}
              disabled={processingOrder === deletingOrder?.id}
              className="bg-destructive hover:bg-destructive/90"
            >
              {processingOrder === deletingOrder?.id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Ya, Hapus Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Order Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm({...editForm, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Digiflazz Status</Label>
                <Input value={editForm.digiflazz_status} onChange={e => setEditForm({...editForm, digiflazz_status: e.target.value})} placeholder="sukses/pending/gagal" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Poin Digunakan</Label>
                <Input type="number" value={editForm.points_used} onChange={e => setEditForm({...editForm, points_used: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Poin Earned</Label>
                <Input type="number" value={editForm.points_earned} onChange={e => setEditForm({...editForm, points_earned: Number(e.target.value)})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nomor Tujuan / Input</Label>
              <Input value={editForm.input_value} onChange={e => setEditForm({...editForm, input_value: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>SN / Token</Label>
              <Input value={editForm.digiflazz_sn} onChange={e => setEditForm({...editForm, digiflazz_sn: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Alamat Pengiriman</Label>
              <Textarea value={editForm.shipping_address} onChange={e => setEditForm({...editForm, shipping_address: e.target.value})} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nomor Resi</Label>
                <Input value={editForm.tracking_number} onChange={e => setEditForm({...editForm, tracking_number: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Status Pengiriman</Label>
                <Input value={editForm.shipping_status} onChange={e => setEditForm({...editForm, shipping_status: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Catatan Admin</Label>
              <Textarea value={editForm.admin_notes} onChange={e => setEditForm({...editForm, admin_notes: e.target.value})} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Batal</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderManagement;
