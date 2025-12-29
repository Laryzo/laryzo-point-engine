import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EnhancedTable } from '@/components/ui/enhanced-table';
import { ShareWhatsAppTransactionModal } from '@/components/ShareWhatsAppTransactionModal';
import { ShoppingCart, TrendingUp, Download, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TransactionEditForm } from './TransactionEditForm';
import { exportToCSV, exportToExcel } from '@/lib/export-utils';

interface Transaction {
  id: string;
  product_name: string;
  product_code: string;
  product_type: string;
  margin: number;
  qty: number;
  customer_id: string;
  created_at: string;
  customers?: {
    id: string;
    name: string;
    whatsapp?: string;
  };
}

export const TransactionListEnhanced = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [transactionsToShare, setTransactionsToShare] = useState<Transaction[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          customers (
            id,
            name,
            whatsapp
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
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
  };

  const handleEditSuccess = () => {
    setEditingTransaction(null);
    fetchData();
  };

  const handleDelete = async (transaction: Transaction) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: `Transaksi ${transaction.product_name} berhasil dihapus`,
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

  const getCustomerName = (transaction: Transaction) => {
    return transaction.customers?.name || 'Customer tidak ditemukan';
  };

  const formatTransactionsForExport = (transactionsToExport: Transaction[]) => {
    return transactionsToExport.map(tx => ({
      'Produk': tx.product_name || '-',
      'Kode Produk': tx.product_code || '-',
      'Jenis': tx.product_type || '-',
      'Customer': tx.customers?.name || '-',
      'Margin': tx.margin || 0,
      'Qty': tx.qty || 0,
      'Total': (tx.margin || 0) * (tx.qty || 0),
      'Tanggal': new Date(tx.created_at).toLocaleDateString('id-ID')
    }));
  };

  const handleExport = (selectedTransactions: Transaction[], format: 'csv' | 'excel') => {
    const exportData = formatTransactionsForExport(selectedTransactions);
    const filename = `transactions_${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'csv') {
      exportToCSV(exportData, filename);
    } else {
      exportToExcel(exportData, filename);
    }
    
    toast({
      title: "Berhasil",
      description: `${selectedTransactions.length} transaksi berhasil di-export ke ${format.toUpperCase()}`,
    });
  };

  const exportAllTransactions = (format: 'csv' | 'excel') => {
    handleExport(transactions, format);
  };

  const handleShareWhatsApp = (selectedTransactions: Transaction[]) => {
    setTransactionsToShare(selectedTransactions);
    setShowWhatsAppModal(true);
  };

  const columns = [
    {
      key: 'product_name',
      label: 'Produk',
      render: (value: string) => (
        <div className="flex items-center space-x-2">
          <ShoppingCart className="w-4 h-4 text-primary" />
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      key: 'product_code',
      label: 'Kode Produk'
    },
    {
      key: 'product_type',
      label: 'Jenis',
      render: (value: string) => value ? (
        <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
          {value}
        </span>
      ) : '-'
    },
    {
      key: 'customer_id',
      label: 'Customer',
      render: (value: string, row: Transaction) => getCustomerName(row)
    },
    {
      key: 'margin',
      label: 'Margin',
      render: (value: number) => (
        <div className="flex items-center space-x-1">
          <TrendingUp className="w-3 h-3 text-green-600" />
          <span>Rp {(value || 0).toLocaleString()}</span>
        </div>
      )
    },
    {
      key: 'qty',
      label: 'Qty'
    },
    {
      key: 'total',
      label: 'Total',
      render: (value: any, row: Transaction) => {
        const total = (row.margin || 0) * (row.qty || 0);
        return (
          <span className="font-medium text-green-600">
            Rp {total.toLocaleString()}
          </span>
        );
      }
    },
    {
      key: 'created_at',
      label: 'Tanggal',
      render: (value: string) => new Date(value).toLocaleDateString('id-ID')
    }
  ];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Riwayat Transaksi ({transactions.length})</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Semua
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => exportAllTransactions('csv')}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAllTransactions('excel')}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export Excel (.xlsx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <EnhancedTable
            data={transactions}
            columns={columns}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onExport={handleExport}
            exportEnabled={true}
            onShareWhatsApp={handleShareWhatsApp}
            shareWhatsAppEnabled={true}
            loading={loading}
            emptyMessage="Tambahkan transaksi pertama Anda"
            title="Transaksi"
          />
        </CardContent>
      </Card>
      
      {editingTransaction && (
        <TransactionEditForm 
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      <ShareWhatsAppTransactionModal
        open={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        transactions={transactionsToShare}
      />
    </>
  );
};