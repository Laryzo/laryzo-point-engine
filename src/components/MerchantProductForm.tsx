import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ImagePlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAppFeePercent, computeSellingPrice, estimateCostFromPrice } from '@/lib/app-fee';

interface MerchantProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchantId: string;
  product?: any;
  onSuccess: () => void;
}

const UNIT_OPTIONS = ['pcs', 'kg', 'gram', 'jam', 'menit', 'meter', 'cm', 'liter', 'porsi', 'paket'];
const CATEGORY_OPTIONS = [
  'Fashion', 
  'Elektronik', 
  'Makanan & Minuman', 
  'Kesehatan', 
  'Kecantikan', 
  'Rumah Tangga', 
  'Otomotif', 
  'Hobi & Koleksi', 
  'Lainnya'
];

const MerchantProductForm = ({ open, onOpenChange, merchantId, product, onSuccess }: MerchantProductFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    costPrice: '',
    stock: '-1',
    itemType: 'product' as 'product' | 'service',
    unit: 'pcs',
    minQty: '',
    category: 'Lainnya',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const isEdit = !!product;
  const isService = form.itemType === 'service';

  const [feePercent, setFeePercent] = useState<number>(5);
  useEffect(() => {
    getAppFeePercent().then(setFeePercent);
  }, []);

  const costNum = Number(form.costPrice) || 0;
  const sellingPrice = computeSellingPrice(costNum, feePercent);

  useEffect(() => {
    if (open && product) {
      setForm({
        name: product.name || '',
        description: product.description || '',
        costPrice: String(product.cost_price ?? estimateCostFromPrice(Number(product.price ?? 0), feePercent)),
        stock: String(product.stock ?? '-1'),
        itemType: (product.item_type === 'service' ? 'service' : 'product'),
        unit: product.unit || 'pcs',
        minQty: product.min_qty != null ? String(product.min_qty) : '',
        category: product.category || 'Lainnya',
      });
      setImagePreview(product.image_url || null);
      setImageFile(null);
    } else if (open && !product) {
      setForm({ name: '', description: '', costPrice: '', stock: '-1', itemType: 'product', unit: 'pcs', minQty: '', category: 'Lainnya' });
      setImagePreview(null);
      setImageFile(null);
    }
  }, [open, product, feePercent]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File terlalu besar', description: 'Maksimal 2MB', variant: 'destructive' });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let imageUrl: string | null | undefined = undefined;

      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const filePath = `${merchantId}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('merchant-products')
          .upload(filePath, imageFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage
          .from('merchant-products')
          .getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      const payload: any = {
        name: form.name,
        description: form.description || null,
        price: sellingPrice,
        cost_price: costNum,
        stock: isService ? -1 : Number(form.stock),
        point_price: 0,
        item_type: form.itemType,
        unit: form.unit,
        category: form.category,
        allow_qty_decimal: isService,
        min_qty: form.minQty ? Number(form.minQty) : null,
      };

      if (isEdit) {
        if (imageUrl !== undefined) payload.image_url = imageUrl;
        const { error } = await supabase.from('merchant_products')
          .update(payload)
          .eq('id', product.id);
        if (error) throw error;
        toast({ title: isService ? 'Jasa diperbarui!' : 'Produk diperbarui!' });
      } else {
        const { error } = await supabase.from('merchant_products').insert({
          merchant_id: merchantId,
          ...payload,
          image_url: imageUrl ?? null,
        });
        if (error) throw error;
        toast({ title: isService ? 'Jasa ditambahkan!' : 'Produk ditambahkan!' });
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${isService ? 'Jasa' : 'Produk'}` : `Tambah ${isService ? 'Jasa' : 'Produk'}`}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="space-y-2">
            <Label>Jenis Item</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={form.itemType === 'product' ? 'default' : 'outline'}
                onClick={() => setForm({ ...form, itemType: 'product', unit: 'pcs' })}
              >
                Produk
              </Button>
              <Button
                type="button"
                variant={form.itemType === 'service' ? 'default' : 'outline'}
                onClick={() => setForm({ ...form, itemType: 'service', unit: form.unit === 'pcs' ? 'kg' : form.unit, stock: '-1' })}
              >
                Jasa
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {isService
                ? 'Jasa: harga dihitung per satuan (qty bisa desimal, mis. 3.75 kg).'
                : 'Produk: harga tetap per item, qty bilangan bulat.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Foto {isService ? 'Jasa' : 'Produk'}</Label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <label className="relative w-20 h-20 rounded-lg overflow-hidden border cursor-pointer group">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ImagePlus className="h-5 w-5 text-white" />
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              ) : (
                <label className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground mt-1">Upload</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              )}
              <p className="text-xs text-muted-foreground">Maks 2MB (JPG, PNG)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Nama {isService ? 'Jasa' : 'Produk'}</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Deskripsi</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          {isService && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Satuan</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Min. Qty (opsional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.minQty}
                  placeholder={`mis. 1 ${form.unit}`}
                  onChange={e => setForm({ ...form, minQty: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{isService ? `Tarif per ${form.unit} (yang Anda terima)` : 'Harga Asli / yang Anda terima (Rp)'}</Label>
            <Input type="number" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} required min="0" />
            <p className="text-xs text-muted-foreground">Ini jumlah bersih yang masuk ke Anda setelah biaya aplikasi {feePercent}%.</p>
          </div>

          <div className="space-y-2">
            <Label>{isService ? `Harga Tampil ke Customer / ${form.unit}` : 'Harga Jual ke Customer (Rp)'}</Label>
            <Input type="number" value={sellingPrice || ''} readOnly className="bg-muted" />
            <p className="text-xs text-muted-foreground">Otomatis (sudah include biaya aplikasi {feePercent}%).</p>
          </div>

          {!isService && (
            <div className="space-y-2">
              <Label>Stok (-1 = unlimited)</Label>
              <Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} required />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MerchantProductForm;
