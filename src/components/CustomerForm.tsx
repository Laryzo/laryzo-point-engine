
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  name: string;
  parent_id: string | null;
}

interface CustomerFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CustomerForm = ({ onClose, onSuccess }: CustomerFormProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [position, setPosition] = useState<'left' | 'right'>('left');
  const [loading, setLoading] = useState(false);
  const [availableParents, setAvailableParents] = useState<Customer[]>([]);

  useEffect(() => {
    fetchAvailableParents();
  }, []);

  const fetchAvailableParents = async () => {
    try {
      const { data: customers, error } = await supabase
        .from('customers')
        .select('id, name, parent_id');

      if (error) throw error;

      // Find customers that have available slots
      const parentsWithSlots = [];
      
      for (const customer of customers || []) {
        const { data: children } = await supabase
          .from('customers')
          .select('position')
          .eq('parent_id', customer.id);

        const hasLeftChild = children?.some(c => c.position === 'left');
        const hasRightChild = children?.some(c => c.position === 'right');

        if (!hasLeftChild || !hasRightChild) {
          parentsWithSlots.push(customer);
        }
      }

      setAvailableParents(parentsWithSlots);
    } catch (error) {
      console.error('Error fetching available parents:', error);
    }
  };

  const findAvailableSlot = async () => {
    try {
      // Get all customers with their children count
      const { data: customers } = await supabase
        .from('customers')
        .select(`
          id, 
          name,
          customers!customers_parent_id_fkey(position)
        `)
        .order('created_at', { ascending: true });

      if (!customers || customers.length === 0) {
        return { parent_id: null, position: null };
      }

      // Find first customer with available slot (top-to-bottom, left-to-right)
      for (const customer of customers) {
        const children = customer.customers || [];
        const hasLeft = children.some((c: any) => c.position === 'left');
        const hasRight = children.some((c: any) => c.position === 'right');

        if (!hasLeft) {
          return { parent_id: customer.id, position: 'left' };
        }
        if (!hasRight) {
          return { parent_id: customer.id, position: 'right' };
        }
      }

      // If all slots are taken, return the first customer (they can still have children)
      return { parent_id: customers[0].id, position: 'left' };
    } catch (error) {
      console.error('Error finding available slot:', error);
      return { parent_id: null, position: null };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Find available slot automatically
      const { parent_id, position } = await findAvailableSlot();

      const customerData: any = {
        name,
        email: email || null,
        whatsapp: whatsapp || null,
        parent_id,
        position,
      };

      const { error } = await supabase
        .from('customers')
        .insert([customerData]);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Customer berhasil ditambahkan ke genealogi",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal menambahkan customer",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Customer Baru</DialogTitle>
          <DialogDescription>
            Tambahkan customer baru ke dalam jaringan genealogi binary tree
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama customer"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+62xxx"
            />
          </div>

          <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
            Customer akan ditempatkan secara otomatis pada posisi tersedia di genealogi
          </div>

          <div className="flex space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Batal
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Menambahkan..." : "Tambah Customer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
