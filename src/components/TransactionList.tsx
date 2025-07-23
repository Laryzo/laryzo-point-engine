import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2, ShoppingCart, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Transaction {
  id: string;
  product_name: string;
  product_code: string;
  product_type: string;
  margin: number;
  qty: number;
  customer_id: string;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
}

export const TransactionList = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editProductName, setEditProductName] = useState('');
  const [editProductCode, setEditProductCode] = useState('');
  const [editProductType, setEditProductType] = useState('');
  const [editMargin, setEditMargin] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editCustomerId, setEditCustomerId] = useState('');
  const { admin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transactionsRes, customersRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('customers')
          .select('id, name')
      ]);

      if (transactionsRes.error) throw transactionsRes.error;
      if (customersRes.error) throw customersRes.error;

      setTransactions(transactionsRes.data || []);
      setCustomers(customersRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data transaksi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditProductName(transaction.product_name);
    setEditProductCode(transaction.product_code);
    setEditProductType(transaction.product_type || '');
    setEditMargin(transaction.margin.toString());
    setEditQty(transaction.qty.toString());
    setEditCustomerId(transaction.customer_id);
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          product_name: editProductName,
          product_code: editProductCode,
          product_type: editProductType || null,
          margin: Number(editMargin),
          qty: Number(editQty),
          customer_id: editCustomerId,
        })
        .eq('id', editingTransaction.id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Data transaksi berhasil diperbarui",
      });

      setEditingTransaction(null);
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memperbarui data transaksi",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string, productName: string) => {
    // Only super admin can delete
    if (admin?.role !== 'super_admin') {
      toast({
        title: "Error",
        description: "Hanya Super Admin yang dapat menghapus transaksi",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Hapus transaksi ${productName}? Data ini tidak dapat dikembalikan.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: `Transaksi ${productName} berhasil dihapus`,
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus transaksi",
        variant: "destructive",
      });
    }
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Customer tidak ditemukan';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Memuat data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Belum ada transaksi</h3>
            <p className="text-muted-foreground">Tambahkan transaksi pertama Anda</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat Transaksi ({transactions.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead>Kode Produk</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Margin</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const total = (transaction.margin || 0) * (transaction.qty || 0);
              return (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <ShoppingCart className="w-4 h-4 text-primary" />
                      <span>{transaction.product_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{transaction.product_code}</TableCell>
                  <TableCell>
                    {transaction.product_type && (
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                        {transaction.product_type}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{getCustomerName(transaction.customer_id)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="w-3 h-3 text-green-600" />
                      <span>Rp {(transaction.margin || 0).toLocaleString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>{transaction.qty}</TableCell>
                  <TableCell className="font-medium">
                    <span className="text-green-600">
                      Rp {total.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(transaction.created_at).toLocaleDateString('id-ID')}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEdit(transaction)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Transaksi</DialogTitle>
                            <DialogDescription>
                              Perbarui informasi transaksi
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="edit-product-name">Nama Produk</Label>
                              <Input
                                id="edit-product-name"
                                value={editProductName}
                                onChange={(e) => setEditProductName(e.target.value)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-product-code">Kode Produk</Label>
                              <Input
                                id="edit-product-code"
                                value={editProductCode}
                                onChange={(e) => setEditProductCode(e.target.value)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-product-type">Jenis Produk</Label>
                              <Input
                                id="edit-product-type"
                                value={editProductType}
                                onChange={(e) => setEditProductType(e.target.value)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-margin">Margin</Label>
                              <Input
                                id="edit-margin"
                                type="number"
                                value={editMargin}
                                onChange={(e) => setEditMargin(e.target.value)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-qty">Quantity</Label>
                              <Input
                                id="edit-qty"
                                type="number"
                                value={editQty}
                                onChange={(e) => setEditQty(e.target.value)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-customer">Customer</Label>
                              <Select value={editCustomerId} onValueChange={setEditCustomerId}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih customer" />
                                </SelectTrigger>
                                <SelectContent>
                                  {customers.map((customer) => (
                                    <SelectItem key={customer.id} value={customer.id}>
                                      {customer.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={handleSaveEdit}>Simpan</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      {admin?.role === 'super_admin' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDelete(transaction.id, transaction.product_name)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};