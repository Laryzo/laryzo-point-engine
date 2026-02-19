import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, RefreshCw, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface PointHistoryManagementProps {
  isSuperAdmin?: boolean;
}

interface PointHistoryRecord {
  id: string;
  from_customer: string | null;
  to_customer: string | null;
  points: number;
  level: number | null;
  product_code: string | null;
  transaction_id: string | null;
  created_at: string;
  from_customer_data?: { name: string } | null;
  to_customer_data?: { name: string } | null;
}

const PointHistoryManagement = ({ isSuperAdmin = false }: PointHistoryManagementProps) => {
  const { toast } = useToast();
  const [records, setRecords] = useState<PointHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20;

  // Edit state
  const [editingRecord, setEditingRecord] = useState<PointHistoryRecord | null>(null);
  const [editPoints, setEditPoints] = useState(0);
  const [editProductCode, setEditProductCode] = useState('');
  const [editLevel, setEditLevel] = useState(0);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deletingRecord, setDeletingRecord] = useState<PointHistoryRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, [currentPage]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from('point_history')
        .select(`
          *,
          from_customer_data:customers!point_history_from_customer_fkey(name),
          to_customer_data:customers!point_history_to_customer_fkey(name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setRecords(data || []);
      setTotalCount(count || 0);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (record: PointHistoryRecord) => {
    setEditingRecord(record);
    setEditPoints(record.points);
    setEditProductCode(record.product_code || '');
    setEditLevel(record.level || 0);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('point_history')
        .update({
          points: editPoints,
          product_code: editProductCode || null,
          level: editLevel,
        })
        .eq('id', editingRecord.id);

      if (error) throw error;
      toast({ title: 'Riwayat poin berhasil diperbarui' });
      setEditingRecord(null);
      fetchRecords();
    } catch (error: any) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingRecord) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('point_history')
        .delete()
        .eq('id', deletingRecord.id);

      if (error) throw error;
      toast({ title: 'Riwayat poin berhasil dihapus' });
      setDeletingRecord(null);
      fetchRecords();
    } catch (error: any) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    }
    setDeleting(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Riwayat Poin</h2>
          <p className="text-muted-foreground">Kelola riwayat poin semua customer</p>
        </div>
        <Button variant="outline" onClick={fetchRecords}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Dari</TableHead>
                <TableHead>Ke</TableHead>
                <TableHead>Poin</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Kode Produk</TableHead>
                {isSuperAdmin && <TableHead>Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 8 : 7} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 8 : 7} className="text-center py-8 text-muted-foreground">
                    Belum ada riwayat poin
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record, index) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-muted-foreground">{(currentPage - 1) * PAGE_SIZE + index + 1}</TableCell>
                    <TableCell>{format(new Date(record.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell>{record.from_customer_data?.name || '-'}</TableCell>
                    <TableCell className="font-medium">{record.to_customer_data?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={record.points > 0 ? 'default' : 'destructive'}>
                        {record.points > 0 ? '+' : ''}{Number(record.points).toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell>{record.level ?? '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{record.product_code || '-'}</TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(record)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletingRecord(record)}
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Menampilkan {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, totalCount)} dari {totalCount}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />Prev
            </Button>
            <Button variant="outline" size="sm" disabled={currentPage * PAGE_SIZE >= totalCount} onClick={() => setCurrentPage(p => p + 1)}>
              Next<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Riwayat Poin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Penerima</Label>
              <Input value={editingRecord?.to_customer_data?.name || '-'} disabled />
            </div>
            <div>
              <Label>Poin</Label>
              <Input type="number" value={editPoints} onChange={e => setEditPoints(Number(e.target.value))} />
            </div>
            <div>
              <Label>Level</Label>
              <Input type="number" value={editLevel} onChange={e => setEditLevel(Number(e.target.value))} />
            </div>
            <div>
              <Label>Kode Produk</Label>
              <Input value={editProductCode} onChange={e => setEditProductCode(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRecord(null)}>Batal</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingRecord} onOpenChange={(open) => !open && setDeletingRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Riwayat Poin</AlertDialogTitle>
            <AlertDialogDescription>
              Menghapus record poin <strong>{deletingRecord?.points ? Number(deletingRecord.points).toLocaleString() : 0}</strong> untuk
              customer <strong>{deletingRecord?.to_customer_data?.name || '-'}</strong>.
              <br /><br />
              Saldo customer akan otomatis diperbarui oleh trigger database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? 'Menghapus...' : 'Ya, Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PointHistoryManagement;
