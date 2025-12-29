import React, { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Edit, Trash2, AlertTriangle, MessageCircle, Download, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface EnhancedTableProps {
  data: any[];
  columns: Column[];
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => Promise<void>;
  onShareWhatsApp?: (items: any[]) => void;
  shareWhatsAppEnabled?: boolean;
  onExport?: (items: any[], format: 'csv' | 'excel') => void;
  exportEnabled?: boolean;
  renderEditModal?: (item: any, onClose: () => void) => React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  title?: string;
}

export const EnhancedTable: React.FC<EnhancedTableProps> = ({
  data,
  columns,
  onEdit,
  onDelete,
  onShareWhatsApp,
  shareWhatsAppEnabled = false,
  onExport,
  exportEnabled = false,
  renderEditModal,
  loading = false,
  emptyMessage = "Tidak ada data",
  title = "Data"
}) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [bulkAction, setBulkAction] = useState<'edit' | 'delete' | null>(null);
  
  const { admin } = useAuth();
  const { toast } = useToast();

  // Reset selections when data changes
  useEffect(() => {
    setSelectedItems(new Set());
  }, [data]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(data.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleEditClick = (item: any) => {
    if (admin?.role !== 'admin' && admin?.role !== 'super_admin') {
      toast({
        title: "Error",
        description: "Anda tidak memiliki izin untuk mengedit data",
        variant: "destructive",
      });
      return;
    }
    setEditingItem(item);
    if (onEdit) {
      onEdit(item);
    }
  };

  const handleDeleteClick = (item: any) => {
    if (admin?.role !== 'super_admin') {
      toast({
        title: "Error",
        description: "Hanya Super Admin yang dapat menghapus data",
        variant: "destructive",
      });
      return;
    }
    setDeletingItem(item);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (deletingItem && onDelete) {
      try {
        await onDelete(deletingItem);
        setShowDeleteConfirmation(false);
        setDeletingItem(null);
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const handleBulkEdit = () => {
    if (selectedItems.size === 0) {
      toast({
        title: "Info",
        description: "Pilih item yang ingin diedit",
      });
      return;
    }
    
    if (admin?.role !== 'admin' && admin?.role !== 'super_admin') {
      toast({
        title: "Error",
        description: "Anda tidak memiliki izin untuk mengedit data",
        variant: "destructive",
      });
      return;
    }

    setBulkAction('edit');
    // Implement bulk edit logic here
    toast({
      title: "Info",
      description: `${selectedItems.size} item dipilih untuk diedit`,
    });
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "Info",
        description: "Pilih item yang ingin dihapus",
      });
      return;
    }

    if (admin?.role !== 'super_admin') {
      toast({
        title: "Error",
        description: "Hanya Super Admin yang dapat menghapus data",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Hapus ${selectedItems.size} item? Data ini tidak dapat dikembalikan.`)) {
      return;
    }

    try {
      for (const itemId of selectedItems) {
        const item = data.find(d => d.id === itemId);
        if (item && onDelete) {
          await onDelete(item);
        }
      }
      setSelectedItems(new Set());
      toast({
        title: "Berhasil",
        description: `${selectedItems.size} item berhasil dihapus`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus beberapa item",
        variant: "destructive",
      });
    }
  };

  const handleShareWhatsApp = () => {
    if (selectedItems.size === 0) {
      toast({
        title: "Info",
        description: "Pilih customer yang ingin di-share",
      });
      return;
    }

    const selectedData = data.filter(d => selectedItems.has(d.id));
    if (onShareWhatsApp) {
      onShareWhatsApp(selectedData);
    }
  };

  const handleExport = (format: 'csv' | 'excel') => {
    if (selectedItems.size === 0) {
      toast({
        title: "Info",
        description: "Pilih item yang ingin di-export",
      });
      return;
    }

    const selectedData = data.filter(d => selectedItems.has(d.id));
    if (onExport) {
      onExport(selectedData, format);
    }
  };

  const isAllSelected = data.length > 0 && selectedItems.size === data.length;
  const isIndeterminate = selectedItems.size > 0 && selectedItems.size < data.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Memuat data...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">Belum ada data</h3>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="flex items-center gap-2 p-4 bg-muted rounded-lg flex-wrap">
          <span className="text-sm text-muted-foreground">
            {selectedItems.size} item dipilih
          </span>
          <TooltipProvider>
            {shareWhatsAppEnabled && onShareWhatsApp && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleShareWhatsApp}
                    className="bg-green-600 text-white hover:bg-green-700 ml-auto"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>WhatsApp</p>
                </TooltipContent>
              </Tooltip>
            )}
            {exportEnabled && onExport && (
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className={`bg-emerald-600 text-white hover:bg-emerald-700 ${!shareWhatsAppEnabled ? "ml-auto" : ""}`}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Export</p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('excel')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export Excel (.xlsx)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleBulkEdit}
                  className={!shareWhatsAppEnabled && !exportEnabled ? "ml-auto" : ""}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Hapus</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all"
                {...(isIndeterminate && { 'data-indeterminate': true })}
              />
            </TableHead>
            {columns.map((column) => (
              <TableHead key={column.key}>{column.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Checkbox
                  checked={selectedItems.has(item.id)}
                  onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                  aria-label={`Select item ${item.id}`}
                />
              </TableCell>
              {columns.map((column) => (
                <TableCell key={column.key}>
                  {column.render ? column.render(item[column.key], item) : item[column.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit Modal */}
      {editingItem && renderEditModal && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="sm:max-w-[425px]">
            {renderEditModal(editingItem, () => setEditingItem(null))}
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Konfirmasi Hapus
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus item ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirmation(false)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};