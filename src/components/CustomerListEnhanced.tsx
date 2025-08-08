import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { EnhancedTable } from '@/components/ui/enhanced-table';
import { Users, Mail, Phone, Award, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
        .order('created_at', { ascending: false });

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
          position: editPosition === 'none' ? null : editPosition || null,
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

  const handleShare = async (customer: Customer) => {
    const shareData = {
      title: `Customer: ${customer.name}`,
      text: `Informasi Customer Laryzo Point Engine\n\nNama: ${customer.name}\nEmail: ${customer.email || 'Tidak ada'}\nWhatsApp: ${customer.whatsapp || 'Tidak ada'}\nTotal Points: ${customer.totalPoints?.toFixed(2) || '0.00'}`,
      url: window.location.href
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast({
          title: "Berhasil",
          description: "Data customer berhasil dibagikan",
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          fallbackShare(shareData.text);
        }
      }
    } else {
      fallbackShare(shareData.text);
    }
  };

  const fallbackShare = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Berhasil",
        description: "Data customer berhasil disalin ke clipboard",
      });
    }).catch(() => {
      toast({
        title: "Info",
        description: "Silakan salin data customer secara manual",
      });
    });
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
      <CardHeader>
        <CardTitle>Daftar Customer ({customers.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <EnhancedTable
          data={customers}
          columns={columns}
          onShare={handleShare}
          renderEditModal={renderEditModal}
          loading={loading}
          emptyMessage="Tambahkan customer pertama Anda"
          title="Customer"
        />
      </CardContent>
    </Card>
  );
};