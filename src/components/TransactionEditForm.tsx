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

interface Transaction {
  id: string;
  product_code: string;
  product_name: string;
  product_type: string;
  qty: number;
  margin: number;
  customer_id: string;
}

interface TransactionEditFormProps {
  transaction: Transaction;
  onClose: () => void;
  onSuccess: () => void;
}

export const TransactionEditForm = ({ transaction, onClose, onSuccess }: TransactionEditFormProps) => {
  const [productCode, setProductCode] = useState(transaction.product_code || '');
  const [productName, setProductName] = useState(transaction.product_name || '');
  const [productType, setProductType] = useState(transaction.product_type || '');
  const [qty, setQty] = useState(transaction.qty || 1);
  const [margin, setMargin] = useState(transaction.margin || 0);
  const [customerId, setCustomerId] = useState(transaction.customer_id || '');
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

  const recalculatePoints = async (transactionId: string, customerId: string, margin: number, productCode: string) => {
    try {
      // First, delete existing point history for this transaction
      await supabase
        .from('point_history')
        .delete()
        .eq('transaction_id', transactionId);

      // Give 1% points to the customer who made the transaction
      const customerPoints = margin * 0.01;
      await supabase.from('point_history').insert({
        transaction_id: transactionId,
        from_customer: customerId,
        to_customer: customerId,
        level: 0,
        points: customerPoints,
        product_code: productCode,
      });

      // Distribute 1% to each upline (up to 10 levels)
      let currentCustomer = customerId;
      
      for (let level = 1; level <= 10; level++) {
        // Get parent of current customer
        const { data: customer } = await supabase
          .from('customers')
          .select('parent_id')
          .eq('id', currentCustomer)
          .single();

        // If no parent found, stop distribution
        if (!customer?.parent_id) {
          break;
        }

        // Give 1% points to parent
        const uplinePoints = margin * 0.01;
        await supabase.from('point_history').insert({
          transaction_id: transactionId,
          from_customer: customerId,
          to_customer: customer.parent_id,
          level: level,
          points: uplinePoints,
          product_code: productCode,
        });

        // Move to next level (parent becomes current customer)
        currentCustomer = customer.parent_id;
      }
    } catch (error) {
      console.error('Error recalculating points:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update transaction
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          product_code: productCode,
          product_name: productName,
          product_type: productType,
          qty,
          margin,
          customer_id: customerId,
        })
        .eq('id', transaction.id);

      if (updateError) throw updateError;

      // Recalculate points based on updated transaction
      await recalculatePoints(transaction.id, customerId, margin, productCode);

      toast({
        title: "Success",
        description: "Transaction updated and points recalculated",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update transaction",
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
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Update transaction details and recalculate points automatically
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
              {loading ? "Updating..." : "Update Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};