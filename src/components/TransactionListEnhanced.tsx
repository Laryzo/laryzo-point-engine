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

  const columns = [
    { key: 'product_name', label: 'Produk', render: (val: string) => (
      <div className="flex items-center space-x-2">
        <ShoppingCart className="w-4 h-4 text-primary" />
        <span className="font-medium">{val}</span>
      </div>
    )},
    { key: 'customer_id', label: 'Customer', render: (_: any, row: Transaction) => row.customers?.name || '-' },
    { key: 'harga_konsumen', label: 'Harga', render: (val: number) => `Rp ${val?.toLocaleString()}` },
    { key: 'margin', label: 'Profit', render: (val: number) => (
      <div className="flex items-center space-x-1 text-green-600">
        <TrendingUp className="w-3 h-3" />
        <span>Rp {val?.toLocaleString()}</span>
      </div>
    )},
    { key: 'created_at', label: 'Tanggal', render: (val: string) => new Date(val).toLocaleDateString('id-ID') }
  ];

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Riwayat Transaksi ({totalCount})</CardTitle>
          <div className="flex items-center gap-2">
            <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" /> Import Excel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <ImportTransactions onSuccess={() => { setShowImportModal(false); fetchData(); }} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <EnhancedTable
            data={transactions}
            columns={columns}
            onEdit={isSuperAdmin ? handleEdit : undefined}
            onDelete={isSuperAdmin ? handleDelete : undefined}
            loading={loading}
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
    </div>
  );
};
