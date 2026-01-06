import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EnhancedTable } from '@/components/ui/enhanced-table';
import { ShareWhatsAppModal } from '@/components/ShareWhatsAppModal';
import { ImportExcel } from '@/components/ImportExcel';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Users, Mail, Phone, Award, Download, FileSpreadsheet, Upload, RefreshCw, Plus, Minus, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV, exportToExcel } from '@/lib/export-utils';

interface Customer {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  parent_id: string | null;
  position: string | null;
  created_at: string;
  totalPoints?: number;
  level?: number;
  points_blocked?: boolean;
}

export const CustomerListEnhanced = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editParentId, setEditParentId] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [customersToShare, setCustomersToShare] = useState<Customer[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  
  // Adjust points modal states
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingCustomer, setAdjustingCustomer] = useState<Customer | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
  const [adjustReason, setAdjustReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  
  // Move warning state
  const [showMoveWarning, setShowMoveWarning] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
        .order('name', { ascending: false });

      if (customersError) throw customersError;

      // Build a map for quick parent lookup
      const customerMap = new Map<string, typeof customersData[0]>();
      (customersData || []).forEach(c => customerMap.set(c.id, c));

      // Calculate level for each customer (count ancestors)
      const calculateLevel = (customerId: string): number => {
        let level = 0;
        let current = customerMap.get(customerId);
        while (current?.parent_id) {
          level++;
          current = customerMap.get(current.parent_id);
        }
        return level;
      };

      const customersWithPoints = await Promise.all(
        (customersData || []).map(async (customer) => {
          const { data: pointsData } = await supabase
            .from('point_history')
            .select('points')
            .eq('to_customer', customer.id);

          const totalPoints = pointsData?.reduce((sum, p) => sum + (Number(p.points) || 0), 0) || 0;
          const level = calculateLevel(customer.id);
          
          return {
            ...customer,
            totalPoints,
            level
          };
        })
      );

      // Sort by created_at descending, then by name descending for consistent order
      customersWithPoints.sort((a, b) => {
        const dateCompare = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (dateCompare !== 0) return dateCompare;
        const getNum = (name: string) => {
          const match = name?.match(/(\d+)/);
          return match ? parseInt(match[1]) : 0;
        };
        return getNum(b.name) - getNum(a.name);
      });

      setCustomers(customersWithPoints);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data customer",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditName(customer.name);
    setEditEmail(customer.email || '');
    setEditWhatsapp(customer.whatsapp || '');
    setEditParentId(customer.parent_id || 'none');
    setEditPosition(customer.position || 'none');
    setShowMoveWarning(false);
  };

  // Get available positions for a selected parent
  const getAvailablePositions = (parentId: string): string[] => {
    if (!parentId || parentId === 'none') return ['left', 'right'];
    
    const children = customers.filter(c => 
      c.parent_id === parentId && 
      c.id !== editingCustomer?.id
    );
    
    const hasLeft = children.some(c => c.position === 'left');
    const hasRight = children.some(c => c.position === 'right');
    
    const available: string[] = [];
    if (!hasLeft) available.push('left');
    if (!hasRight) available.push('right');
    return available;
  };

  // Check if customer has downline
  const hasDownline = (customerId: string): boolean => {
    return customers.some(c => c.parent_id === customerId);
  };

  // Handle parent change with warning
  const handleParentChange = (newParentId: string) => {
    setEditParentId(newParentId);
    
    // Reset position if parent changed
    const availablePositions = getAvailablePositions(newParentId);
    if (availablePositions.length > 0 && !availablePositions.includes(editPosition)) {
      setEditPosition(availablePositions[0]);
    }
    
    // Show warning if customer has downline and parent is changing
    if (editingCustomer && newParentId !== (editingCustomer.parent_id || 'none')) {
      if (hasDownline(editingCustomer.id)) {
        setShowMoveWarning(true);
      } else {
        setShowMoveWarning(false);
      }
    } else {
      setShowMoveWarning(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingCustomer) return;

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: editName,
          email: editEmail || null,
          whatsapp: editWhatsapp || null,
          parent_id: editParentId === 'none' ? null : editParentId || null,
          position: editPosition === 'none' ? null : (editPosition as 'left' | 'right' | null),
        })
        .eq('id', editingCustomer.id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Data customer berhasil diperbarui. Jalankan 'Recalculate Points' untuk menghitung ulang poin.",
      });

      setEditingCustomer(null);
      setShowMoveWarning(false);
      fetchCustomers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memperbarui data customer",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (customer: Customer) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: `Customer ${customer.name} berhasil dihapus`,
      });

      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus customer",
        variant: "destructive",
      });
    }
  };

  // Recalculate all points
  const handleRecalculatePoints = async () => {
    setIsRecalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-points');
      
      if (error) throw error;
      
      toast({
        title: "Recalculate Selesai",
        description: `${data.transactions_processed} transaksi diproses, ${data.customers_updated} customer diupdate`,
      });
      
      fetchCustomers();
    } catch (error) {
      console.error('Error recalculating points:', error);
      toast({
        title: "Error",
        description: "Gagal menghitung ulang poin",
        variant: "destructive",
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  // Toggle points blocked
  const handleToggleBlock = async (customer: Customer) => {
    const newStatus = !customer.points_blocked;
    try {
      const { error } = await supabase
        .from('customers')
        .update({ points_blocked: newStatus })
        .eq('id', customer.id);

      if (error) throw error;

      toast({
        title: newStatus ? "Poin Diblokir" : "Poin Diaktifkan",
        description: `Poin ${customer.name} ${newStatus ? 'tidak akan' : 'akan'} dihitung otomatis`,
      });
      
      fetchCustomers();
    } catch (error) {
      console.error('Error toggling block:', error);
      toast({
        title: "Error",
        description: "Gagal mengubah status blokir poin",
        variant: "destructive",
      });
    }
  };

  // Open adjust points modal
  const handleOpenAdjustModal = (customer: Customer, type: 'add' | 'subtract') => {
    setAdjustingCustomer(customer);
    setAdjustType(type);
    setAdjustAmount('');
    setAdjustReason('');
    setShowAdjustModal(true);
  };

  // Adjust points
  const handleAdjustPoints = async () => {
    if (!adjustingCustomer || !adjustAmount) return;

    const amount = parseFloat(adjustAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Masukkan jumlah poin yang valid",
        variant: "destructive",
      });
      return;
    }

    setIsAdjusting(true);
    try {
      const finalAmount = adjustType === 'subtract' ? -amount : amount;

      // Insert to point_history
      const { error: historyError } = await supabase.from('point_history').insert({
        to_customer: adjustingCustomer.id,
        from_customer: null,
        points: finalAmount,
        product_code: adjustType === 'add' ? 'MANUAL_ADD' : 'MANUAL_SUBTRACT',
        level: 0
      });

      if (historyError) throw historyError;

      // Update customer total points
      const newTotalPoints = (adjustingCustomer.totalPoints || 0) + finalAmount;
      const { error: updateError } = await supabase
        .from('customers')
        .update({ points: newTotalPoints })
        .eq('id', adjustingCustomer.id);

      if (updateError) throw updateError;

      toast({
        title: "Berhasil",
        description: `Poin berhasil di-${adjustType === 'add' ? 'tambah' : 'kurangi'} sebesar ${amount}`,
      });

      setShowAdjustModal(false);
      setAdjustingCustomer(null);
      fetchCustomers();
    } catch (error) {
      console.error('Error adjusting points:', error);
      toast({
        title: "Error",
        description: "Gagal mengubah poin",
        variant: "destructive",
      });
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleShareWhatsApp = (selectedCustomers: Customer[]) => {
    setCustomersToShare(selectedCustomers);
    setShowWhatsAppModal(true);
  };

  const formatCustomersForExport = (customersToExport: Customer[]) => {
    const sorted = [...customersToExport].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    return sorted.map(customer => ({
      'Nama': customer.name || '-',
      'Level': customer.level ?? 0,
      'Email': customer.email || '-',
      'WhatsApp': customer.whatsapp || '-',
      'Parent': customers.find(c => c.id === customer.parent_id)?.name || '-',
      'Posisi': customer.position?.toUpperCase() || '-',
      'Total Poin': customer.totalPoints?.toFixed(2) || '0.00',
      'Status Poin': customer.points_blocked ? 'Diblokir' : 'Aktif',
      'Tanggal Dibuat': new Date(customer.created_at).toLocaleDateString('id-ID')
    }));
  };

  const handleExport = (selectedCustomers: Customer[], format: 'csv' | 'excel') => {
    const exportData = formatCustomersForExport(selectedCustomers);
    const filename = `customers_${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'csv') {
      exportToCSV(exportData, filename);
    } else {
      exportToExcel(exportData, filename);
    }
    
    toast({
      title: "Berhasil",
      description: `${selectedCustomers.length} customer berhasil di-export ke ${format.toUpperCase()}`,
    });
  };

  const exportAllCustomers = (format: 'csv' | 'excel') => {
    handleExport(customers, format);
  };

  const availablePositions = getAvailablePositions(editParentId);

  const columns = [
    {
      key: 'name',
      label: 'Nama',
      render: (value: string) => (
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      key: 'level',
      label: 'Level',
      render: (value: number) => (
        <span className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary font-medium">
          Level {value}
        </span>
      )
    },
    {
      key: 'email',
      label: 'Email',
      render: (value: string) => value ? (
        <div className="flex items-center space-x-2">
          <Mail className="w-3 h-3 text-muted-foreground" />
          <span>{value}</span>
        </div>
      ) : '-'
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      render: (value: string) => value ? (
        <div className="flex items-center space-x-2">
          <Phone className="w-3 h-3 text-muted-foreground" />
          <span>{value}</span>
        </div>
      ) : '-'
    },
    {
      key: 'parent_id',
      label: 'Parent',
      render: (value: string, row: Customer) => {
        const parent = customers.find(c => c.id === value);
        return parent ? parent.name : '-';
      }
    },
    {
      key: 'position',
      label: 'Posisi',
      render: (value: string) => value ? (
        <span className={`px-2 py-1 rounded-full text-xs ${
          value === 'left' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          {value.toUpperCase()}
        </span>
      ) : '-'
    },
    {
      key: 'totalPoints',
      label: 'Total Points',
      render: (value: number, row: Customer) => (
        <div className="flex items-center space-x-2">
          <Award className="w-3 h-3 text-primary" />
          <span className="font-medium">{value?.toFixed(2) || '0.00'}</span>
          <div className="flex items-center space-x-1 ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenAdjustModal(row, 'add');
              }}
            >
              <Plus className="w-3 h-3 text-green-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenAdjustModal(row, 'subtract');
              }}
            >
              <Minus className="w-3 h-3 text-red-600" />
            </Button>
          </div>
        </div>
      )
    },
    {
      key: 'points_blocked',
      label: 'Status Poin',
      render: (value: boolean, row: Customer) => (
        <div className="flex items-center space-x-2">
          <Switch 
            checked={!value} 
            onCheckedChange={() => handleToggleBlock(row)}
          />
          <span className={`text-xs ${value ? 'text-red-600' : 'text-green-600'}`}>
            {value ? 'Diblokir' : 'Aktif'}
          </span>
        </div>
      )
    },
    {
      key: 'created_at',
      label: 'Tanggal Dibuat',
      render: (value: string) => new Date(value).toLocaleDateString('id-ID')
    }
  ];

  const renderEditModal = (customer: Customer, onClose: () => void) => (
    <>
      <DialogHeader>
        <DialogTitle>Edit Customer</DialogTitle>
        <DialogDescription>
          Perbarui informasi customer
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="edit-name">Nama</Label>
          <Input
            id="edit-name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="edit-email">Email</Label>
          <Input
            id="edit-email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="edit-whatsapp">WhatsApp</Label>
          <Input
            id="edit-whatsapp"
            value={editWhatsapp}
            onChange={(e) => setEditWhatsapp(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="edit-parent">Parent</Label>
          <Select value={editParentId} onValueChange={handleParentChange}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih parent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Tidak ada parent</SelectItem>
              {customers.filter(c => c.id !== editingCustomer?.id).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="edit-position">Posisi</Label>
          <Select 
            value={editPosition} 
            onValueChange={setEditPosition}
            disabled={availablePositions.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih posisi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Tidak ada posisi</SelectItem>
              {availablePositions.map(pos => (
                <SelectItem key={pos} value={pos}>
                  {pos.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {editParentId !== 'none' && availablePositions.length === 0 && (
            <p className="text-xs text-destructive mt-1">
              Parent ini sudah memiliki 2 anak (LEFT & RIGHT)
            </p>
          )}
        </div>
        
        {showMoveWarning && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <strong>Perhatian:</strong> Customer ini memiliki downline. 
              Setelah memindahkan, jalankan "Recalculate Points" untuk menghitung ulang poin berdasarkan struktur tree baru.
            </div>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={handleSaveEdit} disabled={editParentId !== 'none' && availablePositions.length === 0}>
          Simpan
        </Button>
      </DialogFooter>
    </>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Daftar Customer ({customers.length})</CardTitle>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRecalculatePoints}
            disabled={isRecalculating}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
            {isRecalculating ? 'Menghitung...' : 'Recalculate Points'}
          </Button>
          <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Import Excel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Import Customer dari Excel</DialogTitle>
                <DialogDescription>
                  Upload file Excel (.xlsx, .xls) dan mapping kolom ke field database
                </DialogDescription>
              </DialogHeader>
              <ImportExcel onSuccess={() => {
                setShowImportModal(false);
                fetchCustomers();
              }} />
            </DialogContent>
          </Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Semua
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => exportAllCustomers('csv')}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAllCustomers('excel')}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export Excel (.xlsx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <EnhancedTable
          data={customers}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onShareWhatsApp={handleShareWhatsApp}
          shareWhatsAppEnabled={true}
          onExport={handleExport}
          exportEnabled={true}
          renderEditModal={renderEditModal}
          loading={loading}
          emptyMessage="Tambahkan customer pertama Anda"
          title="Customer"
        />
      </CardContent>

      <ShareWhatsAppModal
        open={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        customers={customersToShare}
      />

      {/* Adjust Points Modal */}
      <Dialog open={showAdjustModal} onOpenChange={setShowAdjustModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustType === 'add' ? 'Tambah' : 'Kurangi'} Poin Manual
            </DialogTitle>
            <DialogDescription>
              {adjustType === 'add' ? 'Tambahkan' : 'Kurangi'} poin untuk {adjustingCustomer?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipe</Label>
              <Select value={adjustType} onValueChange={(v) => setAdjustType(v as 'add' | 'subtract')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-green-600" />
                      Tambah Poin
                    </div>
                  </SelectItem>
                  <SelectItem value="subtract">
                    <div className="flex items-center gap-2">
                      <Minus className="w-4 h-4 text-red-600" />
                      Kurangi Poin
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="adjust-amount">Jumlah Poin</Label>
              <Input
                id="adjust-amount"
                type="number"
                min="0"
                step="0.01"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="Masukkan jumlah poin"
              />
            </div>
            <div>
              <Label htmlFor="adjust-reason">Alasan (opsional)</Label>
              <Textarea
                id="adjust-reason"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Masukkan alasan perubahan poin"
                rows={3}
              />
            </div>
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm">
                <strong>Poin saat ini:</strong> {adjustingCustomer?.totalPoints?.toFixed(2) || '0.00'}
              </p>
              {adjustAmount && (
                <p className="text-sm mt-1">
                  <strong>Poin setelah:</strong> {
                    ((adjustingCustomer?.totalPoints || 0) + 
                    (adjustType === 'subtract' ? -parseFloat(adjustAmount || '0') : parseFloat(adjustAmount || '0'))).toFixed(2)
                  }
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustModal(false)}>Batal</Button>
            <Button 
              onClick={handleAdjustPoints} 
              disabled={isAdjusting || !adjustAmount}
              className={adjustType === 'subtract' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {isAdjusting ? 'Menyimpan...' : (adjustType === 'add' ? 'Tambah Poin' : 'Kurangi Poin')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
