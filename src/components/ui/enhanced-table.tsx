import React, { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Share2, AlertTriangle } from 'lucide-react';
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
  onShare?: (item: any) => void;
  renderEditModal?: (item: any, onClose: () => void) => React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  title?: string;
}

export const EnhancedTable: React.FC<EnhancedTableProps> = ({
  data,
  columns,
  onShare,
  renderEditModal,
  loading = false,
  emptyMessage = "Tidak ada data",
  title = "Data"
}) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'share' | null>(null);
  
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

  const handleShareClick = (item: any) => {
    if (onShare) {
      onShare(item);
    }
  };

  const handleBulkShare = () => {
    if (selectedItems.size === 0) {
      toast({
        title: "Info",
        description: "Pilih item yang ingin dibagikan",
      });
      return;
    }
    
    setBulkAction('share');
    // Implement bulk share logic here
    toast({
      title: "Info",
      description: `${selectedItems.size} item dipilih untuk dibagikan`,
    });
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
        <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">
            {selectedItems.size} item dipilih
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkShare}
            className="ml-auto"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Bagikan Terpilih
          </Button>
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
            <TableHead>Aksi</TableHead>
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
              <TableCell>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={false}
                    onCheckedChange={(checked) => checked && handleShareClick(item)}
                    aria-label="Share"
                  />
                  <span className="text-xs text-muted-foreground">Bagikan</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

    </div>
  );
};