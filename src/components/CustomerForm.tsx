
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
      // Get all customers 
      const { data: allCustomers, error } = await supabase
        .from('customers')
        .select('id, name, parent_id')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!allCustomers || allCustomers.length === 0) {
        return { parent_id: null, position: null };
      }

      // Binary tree placement logic - find first available slot in order
      // Start from root nodes, then go level by level (breadth-first)
      const queue = allCustomers.filter(c => !c.parent_id);
      
      while (queue.length > 0) {
        const current = queue.shift()!;
        
        const { data: children, error: childError } = await supabase
          .from('customers')
          .select('position')
          .eq('parent_id', current.id);

        if (childError) continue;

        const hasLeft = children?.some(c => c.position === 'left') || false;
        const hasRight = children?.some(c => c.position === 'right') || false;

        if (!hasLeft) {
          return { parent_id: current.id, position: 'left' };
        } else if (!hasRight) {
          return { parent_id: current.id, position: 'right' };
        } else {
          // Both slots filled, add children to queue for next level
          const currentChildren = allCustomers.filter(c => c.parent_id === current.id);
          queue.push(...currentChildren);
        }
      }

      // If no slots found (shouldn't happen with proper binary tree), create new root
      return { parent_id: null, position: null };
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Tambah Customer Baru</DialogTitle>
          <DialogDescription>
            Tambahkan customer baru ke dalam jaringan genealogi binary tree
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-y-auto flex-1 pr-2">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
