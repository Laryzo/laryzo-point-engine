import React, { useState, useEffect, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2, AlertTriangle, MessageCircle, Download, FileSpreadsheet, Search, Filter, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any, index?: number) => React.ReactNode;
  filterable?: boolean;
  filterOptions?: { value: string; label: string }[];
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
  searchableColumns?: string[];
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
  title = "Data",
  searchableColumns = []
}) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [bulkAction, setBulkAction] = useState<'edit' | 'delete' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  
  const { admin } = useAuth();
  const { toast } = useToast();

  // Get filterable columns
  const filterableColumns = columns.filter(col => col.filterable && col.filterOptions);

  // Filter and search data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const searchCols = searchableColumns.length > 0 
        ? searchableColumns 
        : columns.map(c => c.key);
      
      result = result.filter(item => 
        searchCols.some(key => {
          const value = item[key];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(query);
        })
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        result = result.filter(item => String(item[key]) === value);
      }
    });

    return result;
  }, [data, searchQuery, filters, searchableColumns, columns]);

  // Reset selections when data changes
  useEffect(() => {
    setSelectedItems(new Set());
  }, [data]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(filteredData.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilters({});
  };

  const hasActiveFilters = searchQuery.trim() || Object.values(filters).some(v => v && v !== 'all');

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

    // If only one item selected, open edit modal directly
    if (selectedItems.size === 1) {
      const itemId = Array.from(selectedItems)[0];
      const item = filteredData.find(d => d.id === itemId);
      if (item) {
        // Set editingItem for renderEditModal to work
        if (renderEditModal) {
          setEditingItem(item);
        }
        // Also call onEdit callback for parent components that handle edit externally
        if (onEdit) {
          onEdit(item);
        }
        setSelectedItems(new Set());
      }
    } else {
      // Multiple items selected
      toast({
        title: "Info",
        description: `Pilih hanya 1 item untuk diedit`,
      });
    }
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

  const isAllSelected = filteredData.length > 0 && selectedItems.size === filteredData.length;
  const isIndeterminate = selectedItems.size > 0 && selectedItems.size < filteredData.length;

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
      {/* Search and Filter Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {filterableColumns.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showFilters ? "secondary" : "outline"}
                    size="icon"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Filter</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              Reset
            </Button>
          )}
        </div>

        {/* Filter Options */}
        {showFilters && filterableColumns.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap p-3 bg-muted/50 rounded-lg">
            {filterableColumns.map((col) => (
              <div key={col.key} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{col.label}:</span>
                <Select
                  value={filters[col.key] || 'all'}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, [col.key]: value }))}
                >
                  <SelectTrigger className="w-[150px] h-8">
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    {col.filterOptions?.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}

        {/* Results count */}
        {hasActiveFilters && (
          <div className="text-sm text-muted-foreground">
            Menampilkan {filteredData.length} dari {data.length} data
          </div>
        )}
      </div>

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
          {filteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + 1} className="text-center py-8 text-muted-foreground">
                Tidak ada data yang cocok dengan pencarian
              </TableCell>
            </TableRow>
          ) : (
            filteredData.map((item, index) => (
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
                    {column.render ? column.render(item[column.key], item, index) : item[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Edit Modal */}
      {editingItem && renderEditModal && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
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