import { useState, useEffect, useCallback } from 'react';
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
import { Users, Mail, Phone, Award, Download, FileSpreadsheet, Upload, RefreshCw, Plus, Minus, AlertTriangle, Pencil, Trash2, Key, Copy, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
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
  plain_password?: string;
}

interface CustomerListEnhancedProps {
  isSuperAdmin?: boolean;
}

const PAGE_SIZE = 50;

export const CustomerListEnhanced = ({ isSuperAdmin = false }: CustomerListEnhancedProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  
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
  
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingCustomer, setAdjustingCustomer] = useState<Customer | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
  const [adjustReason, setAdjustReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  
  const [showMoveWarning, setShowMoveWarning] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generatingCustomerId, setGeneratingCustomerId] = useState<string | null>(null);
  
  const { toast } = useToast();

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get total count for pagination
      const { count, error: countError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });
      
      if (countError) throw countError;
      setTotalCount(count || 0);

      // Fetch paginated data
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      if (customersError) throw customersError;

      // Fetch all parent info needed for level calculation (optimized)
      // Note: For very large datasets, level should ideally be stored in the DB
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

      // Fetch plaintext passwords
      const { data: credsData } = await supabase
        .from('customer_credentials')
        .select('customer_id, plain_password')
        .in('customer_id', (customersData || []).map(c => c.id));
        
      const credMap = new Map((credsData || []).map(c => [c.customer_id, c.plain_password || '']));

      const processedCustomers = (customersData || []).map((customer) => ({
        ...customer,
        plain_password: credMap.get(customer.id) || '',
        totalPoints: Number(customer.points) || 0,
        level: calculateLevel(customer.id)
      }));

      setCustomers(processedCustomers);
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
  }, [currentPage, toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditName(customer.name);
    setEditEmail(customer.email || '');
    setEditWhatsapp(customer.whatsapp || '');
    setEditParentId(customer.parent_id || 'none');
    setEditPosition(customer.position || 'none');
    setShowMoveWarning(false);
  };

  const getAvailablePositions = (parentId: string): string[] => {
    if (!parentId || parentId === 'none') return ['left', 'right'];
    const children = customers.filter(c => c.parent_id === parentId && c.id !== editingCustomer?.id);
    const hasLeft = children.some(c => c.position === 'left');
    const hasRight = children.some(c => c.position === 'right');
    const available: string[] = [];
    if (!hasLeft) available.push('left');
    if (!hasRight) available.push('right');
    return available;
  };

  const hasDownline = (customerId: string): boolean => {
    return customers.some(c => c.parent_id === customerId);
  };

  const handleParentChange = (newParentId: string) => {
    setEditParentId(newParentId);
    const availablePositions = getAvailablePositions(newParentId);
    if (availablePositions.length > 0 && !availablePositions.includes(editPosition)) {
      setEditPosition(availablePositions[0]);
    }
    if (editingCustomer && newParentId !== (editingCustomer.parent_id || 'none')) {
      if (hasDownline(editingCustomer.id)) setShowMoveWarning(true);
      else setShowMoveWarning(false);
    } else setShowMoveWarning(false);
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
        description: "Data customer berhasil diperbarui.",
      });
      setEditingCustomer(null);
      fetchCustomers();
    } catch (error) {
      toast({ title: "Error", description: "Gagal memperbarui data customer", variant: "destructive" });
    }
  };

  const handleDelete = async (customer: Customer) => {
    try {
      const { error } = await supabase.from('customers').delete().eq('id', customer.id);
      if (error) throw error;
      toast({ title: "Berhasil", description: `Customer ${customer.name} berhasil dihapus` });
      fetchCustomers();
    } catch (error) {
      toast({ title: "Error", description: "Gagal menghapus customer", variant: "destructive" });
    }
  };

  const handleRecalculatePoints = async () => {
    setIsRecalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-points');
      if (error) throw error;
      toast({ title: "Recalculate Selesai", description: `${data.transactions_processed} transaksi diproses` });
      fetchCustomers();
    } catch (error) {
      toast({ title: "Error", description: "Gagal menghitung ulang poin", variant: "destructive" });
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleAdjustPoints = async () => {
    if (!adjustingCustomer || !adjustAmount) return;
    const amount = parseFloat(adjustAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Error", description: "Masukkan jumlah poin yang valid", variant: "destructive" });
      return;
    }
    setIsAdjusting(true);
    try {
      const finalAmount = adjustType === 'subtract' ? -amount : amount;
      const { error } = await supabase.from('point_history').insert({
        to_customer: adjustingCustomer.id,
        points: finalAmount,
        product_code: adjustType === 'add' ? 'MANUAL_ADD' : 'MANUAL_SUBTRACT',
        description: adjustReason || (adjustType === 'add' ? 'Penambahan manual' : 'Pengurangan manual'),
      });
      if (error) throw error;
      toast({ title: "Berhasil", description: `Poin berhasil diupdate` });
      setShowAdjustModal(false);
      fetchCustomers();
    } catch (error) {
      toast({ title: "Error", description: "Gagal mengubah poin", variant: "destructive" });
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleGeneratePassword = async (customer: Customer) => {
    setGeneratingCustomerId(customer.id);
    try {
      const { error } = await supabase.functions.invoke('customer-bulk-auth', {
        body: { customer_id: customer.id, email: customer.email }
      });
      if (error) throw error;
      toast({ title: "Berhasil", description: `Password berhasil di-generate` });
      fetchCustomers();
    } catch (error) {
      toast({ title: "Error", description: "Gagal generate password", variant: "destructive" });
    } finally {
      setGeneratingCustomerId(null);
    }
  };

  const handleGenerateAll = async () => {
    setIsGeneratingAll(true);
    try {
      const { error } = await supabase.functions.invoke('customer-bulk-auth', {
        body: { action: 'generate-all' }
      });
      if (error) throw error;
      toast({ title: "Berhasil", description: "Password semua customer berhasil di-generate" });
      fetchCustomers();
    } catch (error) {
      toast({ title: "Error", description: "Gagal generate password semua customer", variant: "destructive" });
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const handleToggleBlock = async (customer: Customer) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({ points_blocked: !customer.points_blocked })
        .eq('id', customer.id);
      if (error) throw error;
      toast({
        title: "Berhasil",
        description: !customer.points_blocked ? 'Poin customer diblokir' : 'Blokir poin dibuka',
      });
      fetchCustomers();
    } catch (error) {
      toast({ title: "Error", description: "Gagal mengubah status poin", variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Disalin", description: "Password disalin ke clipboard" });
  };

  const buildExportRows = (rows: Customer[]) =>
    rows.map((c) => ({
      Nama: c.name || '',
      Email: c.email || '',
      WhatsApp: c.whatsapp || '',
      Level: c.level ?? 0,
      Poin: c.totalPoints ?? 0,
      Password: c.plain_password || '',
      'Status Poin': c.points_blocked ? 'Diblokir' : 'Aktif',
      'Tanggal Daftar': c.created_at ? new Date(c.created_at).toLocaleDateString('id-ID') : '',
    }));

  const handleExport = (items: Customer[], format: 'csv' | 'excel') => {
    const rows = buildExportRows(items.length > 0 ? items : customers);
    if (rows.length === 0) {
      toast({ title: "Tidak ada data", description: "Tidak ada data untuk diexport", variant: "destructive" });
      return;
    }
    const filename = `customers-${new Date().toISOString().slice(0, 10)}`;
    if (format === 'csv') exportToCSV(rows, filename);
    else exportToExcel(rows, filename);
  };

  const uplineName = (parentId: string | null) => {
    if (!parentId) return '-';
    return customers.find(c => c.id === parentId)?.name || 'Upline lain';
  };

  const columns = [
    { key: 'name', label: 'Nama', render: (val: string, row: Customer) => (
      <div className="flex flex-col">
        <span className="font-medium">{val}</span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Mail className="w-3 h-3" />{row.email || '-'}
        </span>
      </div>
    )},
    { key: 'whatsapp', label: 'WhatsApp', render: (val: string) => (
      <span className="flex items-center gap-1 whitespace-nowrap">
        <Phone className="w-3 h-3 text-muted-foreground" />{val || '-'}
      </span>
    )},
    { key: 'level', label: 'Level', render: (val: number) => `Lvl ${val ?? 0}` },
    { key: 'parent_id', label: 'Upline / Posisi', render: (val: string | null, row: Customer) => (
      <div className="flex flex-col text-xs">
        <span>{uplineName(val)}</span>
        <span className="text-muted-foreground capitalize">{row.position || '-'}</span>
      </div>
    )},
    { key: 'totalPoints', label: 'Poin', render: (val: number, row: Customer) => (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1">
          <Award className="w-3 h-3 text-muted-foreground" />{(val || 0).toLocaleString('id-ID')}
        </span>
        {isSuperAdmin && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={() => {
              setAdjustingCustomer(row);
              setAdjustAmount('');
              setAdjustType('add');
              setAdjustReason('');
              setShowAdjustModal(true);
            }}
          >
            <Plus className="w-3 h-3" />
          </Button>
        )}
      </div>
    )},
    { key: 'points_blocked', label: 'Status Poin', render: (val: boolean, row: Customer) => (
      <div className="flex items-center gap-2">
        <Switch checked={!val} onCheckedChange={() => handleToggleBlock(row)} disabled={!isSuperAdmin} />
        <span className="text-xs text-muted-foreground">{val ? 'Diblokir' : 'Aktif'}</span>
      </div>
    )},
    { key: 'plain_password', label: 'Password', render: (val: string, row: Customer) => (
      <div className="flex items-center gap-1">
        <span className="font-mono text-xs">{val || '-'}</span>
        {val && (
          <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => copyToClipboard(val)}>
            <Copy className="w-3 h-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1"
          title="Generate / reset password"
          disabled={!row.email || generatingCustomerId === row.id}
          onClick={() => handleGeneratePassword(row)}
        >
          {generatingCustomerId === row.id
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <Key className="w-3 h-3" />}
        </Button>
      </div>
    )},
    { key: 'created_at', label: 'Tanggal Daftar', render: (val: string) => (
      <span className="text-xs whitespace-nowrap">
        {val ? new Date(val).toLocaleDateString('id-ID') : '-'}
      </span>
    )},
  ];

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const availablePositions = getAvailablePositions(editParentId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Daftar Customer ({totalCount})
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <ImportExcel onSuccess={fetchCustomers} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport([], 'excel')}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Export ke Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport([], 'csv')}>
                  <Download className="w-4 h-4 mr-2" /> Export ke CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {isSuperAdmin && (
              <Button variant="outline" size="sm" onClick={handleGenerateAll} disabled={isGeneratingAll}>
                {isGeneratingAll
                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  : <Key className="w-4 h-4 mr-2" />}
                Generate Password Semua
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={handleRecalculatePoints} disabled={isRecalculating}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
              Update Poin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <EnhancedTable
            data={customers}
            columns={columns}
            loading={loading}
            title="Customer"
            onEdit={handleEdit}
            onDelete={handleDelete}
            exportEnabled
            onExport={(items, format) => handleExport(items as Customer[], format)}
            shareWhatsAppEnabled
            onShareWhatsApp={(items) => {
              setCustomersToShare(items as Customer[]);
              setShowWhatsAppModal(true);
            }}
            searchableColumns={['name', 'email', 'whatsapp']}
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

      {/* Edit Customer */}
      <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4" /> Edit Customer
            </DialogTitle>
            <DialogDescription>Perbarui data customer dan penempatan jaringan.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nama</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>WhatsApp</Label>
              <Input value={editWhatsapp} onChange={(e) => setEditWhatsapp(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Upline</Label>
              <Select value={editParentId} onValueChange={handleParentChange}>
                <SelectTrigger><SelectValue placeholder="Pilih upline" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa upline (root)</SelectItem>
                  {customers
                    .filter(c => c.id !== editingCustomer?.id)
                    .map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Posisi</Label>
              <Select value={editPosition} onValueChange={setEditPosition}>
                <SelectTrigger><SelectValue placeholder="Pilih posisi" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa posisi</SelectItem>
                  {availablePositions.map(pos => (
                    <SelectItem key={pos} value={pos}>{pos === 'left' ? 'Kiri' : 'Kanan'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showMoveWarning && (
              <div className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
                <span>
                  Customer ini memiliki downline. Memindahkan upline akan mengubah struktur jaringan
                  dan perhitungan poin turunannya.
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCustomer(null)}>Batal</Button>
            <Button onClick={handleSaveEdit}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Poin (Super Admin) */}
      <Dialog open={showAdjustModal} onOpenChange={setShowAdjustModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sesuaikan Poin</DialogTitle>
            <DialogDescription>
              {adjustingCustomer?.name} — poin saat ini {(adjustingCustomer?.totalPoints || 0).toLocaleString('id-ID')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                variant={adjustType === 'add' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setAdjustType('add')}
              >
                <Plus className="w-4 h-4 mr-1" /> Tambah
              </Button>
              <Button
                variant={adjustType === 'subtract' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setAdjustType('subtract')}
              >
                <Minus className="w-4 h-4 mr-1" /> Kurangi
              </Button>
            </div>
            <div className="space-y-1">
              <Label>Jumlah Poin</Label>
              <Input
                type="number"
                min="0"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <Label>Alasan</Label>
              <Textarea
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Contoh: koreksi transaksi manual"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustModal(false)}>Batal</Button>
            <Button onClick={handleAdjustPoints} disabled={isAdjusting}>
              {isAdjusting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share WhatsApp */}
      <ShareWhatsAppModal
        open={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        customers={customersToShare as any}
      />
    </div>
  );
};
