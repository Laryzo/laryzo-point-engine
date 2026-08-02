import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EnhancedTable } from '@/components/ui/enhanced-table';
import { ShareWhatsAppTransactionModal } from '@/components/ShareWhatsAppTransactionModal';
import { ImportTransactions } from '@/components/ImportTransactions';
import { ShoppingCart, TrendingUp, Download, FileSpreadsheet, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TransactionEditForm } from './TransactionEditForm';
import { exportToCSV, exportToExcel } from '@/lib/export-utils';

interface Transaction {
  id: string;
  product_name: string;
  product_code: string;
  product_type: string;
  margin: number;
  harga_konsumen?: number;
  harga_pokok?: number;
  qty: number;
  customer_id: string;
  created_at: string;
  customers?: {
    id: string;
    name: string;
    whatsapp?: string;
    parent_id?: string | null;
  };
  customerLevel?: number;
}

interface TransactionListEnhancedProps {
  isSuperAdmin?: boolean;
}

const PAGE_SIZE = 50;

export const TransactionListEnhanced = ({ isSuperAdmin = false }: TransactionListEnhancedProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [transactionsToShare, setTransactionsToShare] = useState<Transaction[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get total count
      const { count, error: countError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });
      
      if (countError) throw countError;
      setTotalCount(count || 0);

      // Fetch paginated transactions
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          customers (
            id,
            name,
            whatsapp,
            parent_id
          )
        `)
        .order('created_at', { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      // Fetch parent info for level calculation (optimized)
      const { data: allParentInfo } = await supabase
        .from('customers')
        .select('id, parent_id');
      
      const parentMap = new Map((allParentInfo || []).map(c => [c.id, c.parent_id]));

      const calculateLevel = (customerId: string): number => {
        let level = 0;
        let pid = parentMap.get(customerId);
        while (pid) {
          level++;
          pid = parentMap.get(pid);
        }
        return level;
      };

      // Fetch mitra product info for pricing overrides
      const mitraNames = Array.from(new Set(
        (data || []).filter(t => t.product_type === 'Mitra').map(t => t.product_name).filter(Boolean)
      ));
      const mitraCostMap = new Map<string, number>();
      if (mitraNames.length > 0) {
        const { data: mp } = await supabase
          .from('merchant_products')
          .select('name, cost_price')
          .in('name', mitraNames as string[]);
        (mp || []).forEach(p => {
          if (p.name && p.cost_price != null) mitraCostMap.set(p.name, Number(p.cost_price));
        });
      }

      const processedData = (data || []).map(tx => {
        let harga_pokok = tx.harga_pokok;
        let margin = tx.margin;
        if (tx.product_type === 'Mitra' && tx.product_name && mitraCostMap.has(tx.product_name)) {
          harga_pokok = mitraCostMap.get(tx.product_name)!;
          margin = (Number(tx.harga_konsumen) || 0) - harga_pokok;
        }
        return {
          ...tx,
          harga_pokok,
          margin,
          customerLevel: tx.customer_id ? calculateLevel(tx.customer_id) : 0
        };
      });
      
      setTransactions(processedData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: "Error", description: "Gagal memuat data transaksi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [currentPage, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
  };

  const handleEditSuccess = () => {
    setEditingTransaction(null);
    fetchData();
  };

  const handleDelete = async (transaction: Transaction) => {
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', transaction.id);
      if (error) throw error;
      toast({ title: "Berhasil", description: `Transaksi berhasil dihapus` });
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: "Gagal menghapus transaksi", variant: "destructive" });
    }
  };

  const handleShareWhatsApp = (items: Transaction[]) => {
    if (items.length === 0) {
      toast({ title: "Pilih transaksi", description: "Pilih minimal 1 transaksi untuk dibagikan", variant: "destructive" });
      return;
    }
    setTransactionsToShare(items);
    setShowWhatsAppModal(true);
  };

  const buildExportRows = (items: Transaction[]) =>
    items.map(t => ({
      Produk: t.product_name || '',
      'Kode Produk': t.product_code || '',
      Jenis: t.product_type || '',
      Customer: t.customers?.name || '',
      WhatsApp: t.customers?.whatsapp || '',
      Level: t.customerLevel ?? 0,
      Qty: t.qty || 0,
      'Harga Pokok': t.harga_pokok || 0,
      'Harga Konsumen': t.harga_konsumen || 0,
      Profit: t.margin || 0,
      'Total Profit': (t.margin || 0) * (t.qty || 0),
      Tanggal: new Date(t.created_at).toLocaleDateString('id-ID'),
    }));

  const handleExport = (items: Transaction[], format: 'csv' | 'excel') => {
    const source = items.length > 0 ? items : transactions;
    const rows = buildExportRows(source);
    if (rows.length === 0) {
      toast({ title: "Tidak ada data", description: "Tidak ada transaksi untuk diexport", variant: "destructive" });
      return;
    }
    const filename = `transaksi-${new Date().toISOString().split('T')[0]}`;
    if (format === 'csv') exportToCSV(rows, filename);
    else exportToExcel(rows, filename);
    toast({ title: "Export berhasil", description: `${rows.length} transaksi diexport ke ${format.toUpperCase()}` });
  };

  const columns = [
    { key: 'product_name', label: 'Produk', render: (val: string) => (
      <div className="flex items-center space-x-2">
        <ShoppingCart className="w-4 h-4 text-primary" />
        <span className="font-medium">{val}</span>
      </div>
    )},
    { key: 'product_code', label: 'Kode Produk', render: (val: string) => val || '-' },
    { key: 'product_type', label: 'Jenis', render: (val: string) => val ? (
      <span className="px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground">{val}</span>
    ) : '-' },
    { key: 'customer_id', label: 'Customer', render: (_: any, row: Transaction) => (
      <div>
        <p className="font-medium">{row.customers?.name || '-'}</p>
        {row.customers?.whatsapp && (
          <p className="text-xs text-muted-foreground">{row.customers.whatsapp}</p>
        )}
      </div>
    )},
    { key: 'customerLevel', label: 'Level', render: (val: number) => `Level ${val ?? 0}` },
    { key: 'qty', label: 'Qty', render: (val: number) => val ?? 1 },
    ...(isSuperAdmin ? [{
      key: 'harga_pokok', label: 'Harga Pokok',
      render: (val: number) => `Rp ${(val || 0).toLocaleString('id-ID')}`
    }] : []),
    { key: 'harga_konsumen', label: 'Harga Konsumen', render: (val: number) => `Rp ${(val || 0).toLocaleString('id-ID')}` },
    { key: 'margin', label: 'Profit', render: (val: number) => (
      <div className="flex items-center space-x-1 text-green-600">
        <TrendingUp className="w-3 h-3" />
        <span>Rp {(val || 0).toLocaleString('id-ID')}</span>
      </div>
    )},
    { key: 'total_profit', label: 'Total Profit', render: (_: any, row: Transaction) => (
      <span className="font-medium text-green-600">
        Rp {((row.margin || 0) * (row.qty || 1)).toLocaleString('id-ID')}
      </span>
    )},
    { key: 'created_at', label: 'Tanggal', render: (val: string) => new Date(val).toLocaleDateString('id-ID') }
  ];

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Riwayat Transaksi ({totalCount})</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" /> Import Excel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Import Transaksi</DialogTitle>
                  <DialogDescription>Unggah file Excel untuk menambahkan transaksi.</DialogDescription>
                </DialogHeader>
                <ImportTransactions onSuccess={() => { setShowImportModal(false); fetchData(); }} />
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport([], 'csv')}>
                  <Download className="w-4 h-4 mr-2" /> Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport([], 'excel')}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <EnhancedTable
            data={transactions}
            columns={columns}
            onEdit={handleEdit}
            onDelete={isSuperAdmin ? handleDelete : undefined}
            onShareWhatsApp={handleShareWhatsApp}
            shareWhatsAppEnabled
            onExport={handleExport}
            exportEnabled
            loading={loading}
            title="Transaksi"
            searchableColumns={['product_name', 'product_code', 'product_type']}
            emptyMessage="Belum ada transaksi"
          />


          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Halaman {currentPage + 1} dari {totalPages}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === 0 || loading}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage >= totalPages - 1 || loading}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
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
        onClose={() => { setShowWhatsAppModal(false); setTransactionsToShare([]); }}
        transactions={transactionsToShare}
      />

    </div>
  );
};
