
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
  const [hargaKonsumen, setHargaKonsumen] = useState(0);
  const [hargaPokok, setHargaPokok] = useState(0);
  const [customerId, setCustomerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Auto-calculate profit (margin)
  const profit = hargaKonsumen - hargaPokok;

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

  const distributePoints = async (transactionId: string, customerId: string, calculatedProfit: number) => {
    try {
      // Give 1% points to the customer who made the transaction
      // Note: customers.points is automatically updated via database trigger on point_history
      const customerPoints = calculatedProfit * 0.01;
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
          .maybeSingle();

        // If no parent found, stop distribution
        if (!customer?.parent_id) {
          break;
        }

        // Check if parent is blocked from receiving points
        const { data: parentData } = await supabase
          .from('customers')
          .select('points_blocked')
          .eq('id', customer.parent_id)
          .maybeSingle();

        // Skip if parent has points blocked
        if (parentData?.points_blocked) {
          currentCustomer = customer.parent_id;
          continue;
        }

        // Give 1% points to parent
        // Note: customers.points is automatically updated via database trigger on point_history
        const uplinePoints = calculatedProfit * 0.01;
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
          margin: profit,
          harga_konsumen: hargaKonsumen,
          harga_pokok: hargaPokok,
          customer_id: customerId,
        }])
        .select()
        .single();

      if (error) throw error;

      // Distribute points based on transaction profit
      await distributePoints(transaction.id, customerId, profit);

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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
          <DialogDescription>
            Record a new transaction and distribute points automatically
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-y-auto flex-1 pr-2">
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
              <Label htmlFor="hargaKonsumen">Harga Konsumen (Rp) *</Label>
              <Input
                id="hargaKonsumen"
                type="number"
                min="0"
                value={hargaKonsumen}
                onChange={(e) => setHargaKonsumen(parseFloat(e.target.value) || 0)}
                placeholder="100000"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hargaPokok">Harga Pokok (Rp) *</Label>
              <Input
                id="hargaPokok"
                type="number"
                min="0"
                value={hargaPokok}
                onChange={(e) => setHargaPokok(parseFloat(e.target.value) || 0)}
                placeholder="80000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Profit (Rp)</Label>
              <div className={`p-2 rounded border ${profit >= 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                Rp {profit.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer">Customer *</Label>
            <Select value={customerId} onValueChange={setCustomerId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent className="max-h-80 overflow-y-auto">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
