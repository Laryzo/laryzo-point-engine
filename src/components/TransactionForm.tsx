
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
}

interface TransactionFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const TransactionForm = ({ onClose, onSuccess }: TransactionFormProps) => {
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [productType, setProductType] = useState('');
  const [qty, setQty] = useState(1);
  const [margin, setMargin] = useState(0);
  const [customerId, setCustomerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const distributePoints = async (transactionId: string, customerId: string, margin: number) => {
    try {
      // Get customer hierarchy
      const { data: customer } = await supabase
        .from('customers')
        .select('parent_id')
        .eq('id', customerId)
        .single();

      if (!customer?.parent_id) return;

      // Simple point distribution: 10% of margin to parent, 5% to grandparent
      const pointsToParent = margin * 0.1;
      const pointsToGrandparent = margin * 0.05;

      // Give points to parent (level 1)
      await supabase.from('point_history').insert({
        from_customer: customerId,
        to_customer: customer.parent_id,
        level: 1,
        points: pointsToParent,
        product_code: productCode,
      });

      // Get grandparent and give points (level 2)
      const { data: parent } = await supabase
        .from('customers')
        .select('parent_id')
        .eq('id', customer.parent_id)
        .single();

      if (parent?.parent_id) {
        await supabase.from('point_history').insert({
          from_customer: customerId,
          to_customer: parent.parent_id,
          level: 2,
          points: pointsToGrandparent,
          product_code: productCode,
        });
      }
    } catch (error) {
      console.error('Error distributing points:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert([{
          product_code: productCode,
          product_name: productName,
          product_type: productType,
          qty,
          margin,
          customer_id: customerId,
        }])
        .select()
        .single();

      if (error) throw error;

      // Distribute points based on transaction
      await distributePoints(transaction.id, customerId, margin * qty);

      toast({
        title: "Success",
        description: "Transaction added and points distributed",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add transaction",
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
          <DialogTitle>Add New Transaction</DialogTitle>
          <DialogDescription>
            Record a new transaction and distribute points automatically
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="productCode">Product Code *</Label>
              <Input
                id="productCode"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                placeholder="PROD001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productType">Product Type</Label>
              <Input
                id="productType"
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                placeholder="Digital Product"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="productName">Product Name *</Label>
            <Input
              id="productName"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Product name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qty">Quantity *</Label>
              <Input
                id="qty"
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="margin">Margin (Rp) *</Label>
              <Input
                id="margin"
                type="number"
                min="0"
                value={margin}
                onChange={(e) => setMargin(parseFloat(e.target.value) || 0)}
                placeholder="50000"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer">Customer *</Label>
            <Select value={customerId} onValueChange={setCustomerId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Processing..." : "Add Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
