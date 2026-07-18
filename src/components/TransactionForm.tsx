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

  const profit = hargaKonsumen - hargaPokok;

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      // Limit to 1000 for dropdown to prevent UI lag, user can use search in a real combobox
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .order('name')
        .limit(1000);

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Insert Transaction
      const { data: transaction, error: txError } = await supabase
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

      if (txError) throw txError;

      // 2. Distribute points via Edge Function (much faster than client-side loops)
      // We'll call the calculate-points function or a new specialized function if available.
      // For now, we use the existing calculate-points as it handles the logic.
      // If a specialized function for single transaction exists, use that.
      const { error: funcError } = await supabase.functions.invoke('calculate-points', {
        body: { transaction_id: transaction.id }
      });

      if (funcError) {
        console.warn('Point distribution function error, points might be calculated in background:', funcError);
      }

      toast({
        title: "Success",
        description: "Transaction added successfully",
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
                <Input id="productCode" value={productCode} onChange={(e) => setProductCode(e.target.value)} placeholder="PROD001" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="productType">Product Type</Label>
                <Input id="productType" value={productType} onChange={(e) => setProductType(e.target.value)} placeholder="Digital Product" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="productName">Product Name *</Label>
              <Input id="productName" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Product name" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qty">Quantity *</Label>
                <Input id="qty" type="number" min="1" value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 1)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hargaKonsumen">Harga Konsumen (Rp) *</Label>
                <Input id="hargaKonsumen" type="number" min="0" value={hargaKonsumen} onChange={(e) => setHargaKonsumen(parseFloat(e.target.value) || 0)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hargaPokok">Harga Pokok (Rp) *</Label>
                <Input id="hargaPokok" type="number" min="0" value={hargaPokok} onChange={(e) => setHargaPokok(parseFloat(e.target.value) || 0)} required />
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
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
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
