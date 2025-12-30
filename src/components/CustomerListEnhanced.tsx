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
import { Users, Mail, Phone, Award, Download, FileSpreadsheet, Upload } from 'lucide-react';
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
        .order('name', { ascending: true });

      if (customersError) throw customersError;

      const customersWithPoints = await Promise.all(
        (customersData || []).map(async (customer) => {
          const { data: pointsData } = await supabase
            .from('point_history')
            .select('points')
            .eq('to_customer', customer.id);

          const totalPoints = pointsData?.reduce((sum, p) => sum + (Number(p.points) || 0), 0) || 0;
          
          return {
            ...customer,
            totalPoints
          };
        })
      );

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
        description: "Data customer berhasil diperbarui",
      });

      setEditingCustomer(null);
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

  const handleShareWhatsApp = (selectedCustomers: Customer[]) => {
    setCustomersToShare(selectedCustomers);
    setShowWhatsAppModal(true);
  };

  const formatCustomersForExport = (customersToExport: Customer[]) => {
    // Sort by created_at ascending (oldest first, newest last)
    const sorted = [...customersToExport].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    return sorted.map(customer => ({
      'Nama': customer.name || '-',
      'Email': customer.email || '-',
      'WhatsApp': customer.whatsapp || '-',
      'Parent': customers.find(c => c.id === customer.parent_id)?.name || '-',
      'Posisi': customer.position?.toUpperCase() || '-',
      'Total Poin': customer.totalPoints?.toFixed(2) || '0.00',
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
      render: (value: number) => (
        <div className="flex items-center space-x-2">
          <Award className="w-3 h-3 text-primary" />
          <span className="font-medium">{value?.toFixed(2) || '0.00'}</span>
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
          <Select value={editParentId} onValueChange={setEditParentId}>
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
          <Select value={editPosition} onValueChange={setEditPosition}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih posisi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Tidak ada posisi</SelectItem>
              <SelectItem value="left">LEFT</SelectItem>
              <SelectItem value="right">RIGHT</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={handleSaveEdit}>Simpan</Button>
      </DialogFooter>
    </>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Daftar Customer ({customers.length})</CardTitle>
        <div className="flex items-center gap-2">
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
    </Card>
  );
};