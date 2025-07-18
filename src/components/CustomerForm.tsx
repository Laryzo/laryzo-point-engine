
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const customerData: any = {
        name,
        email: email || null,
        whatsapp: whatsapp || null,
      };

      if (parentId) {
        customerData.parent_id = parentId;
        customerData.position = position;
      }

      const { error } = await supabase
        .from('customers')
        .insert([customerData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Customer added successfully",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add customer",
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
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Add a new customer to your binary tree network
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Customer name"
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

          <div className="space-y-2">
            <Label htmlFor="parent">Parent Customer</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select parent (optional for root)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None (Root Customer)</SelectItem>
                {availableParents.map((parent) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {parentId && (
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Select value={position} onValueChange={(value: 'left' | 'right') => setPosition(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Adding..." : "Add Customer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
