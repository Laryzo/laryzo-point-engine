import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ImagePlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface MerchantProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchantId: string;
  product?: any;
  onSuccess: () => void;
}

const MerchantProductForm = ({ open, onOpenChange, merchantId, product, onSuccess }: MerchantProductFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', costPrice: '', stock: '-1', pointPrice: '0' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const isEdit = !!product;

  const costNum = Number(form.costPrice) || 0;
  const sellingPrice = Math.ceil((costNum / 0.9) / 500) * 500;

  useEffect(() => {
    if (open && product) {
      setForm({
        name: product.name || '',
        description: product.description || '',
        costPrice: String(product.cost_price ?? Math.round(Number(product.price ?? 0) * 0.9)),
        stock: String(product.stock ?? '-1'),
        pointPrice: String(product.point_price ?? 0),
      });
      setImagePreview(product.image_url || null);
      setImageFile(null);
    } else if (open && !product) {
      setForm({ name: '', description: '', costPrice: '', stock: '-1', pointPrice: '0' });
      setImagePreview(null);
      setImageFile(null);
    }
  }, [open, product]);

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

      const pointPriceNum = Number(form.pointPrice) || 0;

      if (isEdit) {
        const updateData: any = {
          name: form.name,
          description: form.description || null,
          price: sellingPrice,
          cost_price: costNum,
          stock: Number(form.stock),
          point_price: pointPriceNum,
        };
        if (imageUrl !== undefined) {
          updateData.image_url = imageUrl;
        }
        const { error } = await supabase.from('merchant_products')
          .update(updateData)
          .eq('id', product.id);
        if (error) throw error;
        toast({ title: 'Produk diperbarui!' });
      } else {
        const { error } = await supabase.from('merchant_products').insert({
          merchant_id: merchantId,
          name: form.name,
          description: form.description || null,
          price: sellingPrice,
          cost_price: costNum,
          stock: Number(form.stock),
          image_url: imageUrl ?? null,
          point_price: pointPriceNum,
        });
        if (error) throw error;
        toast({ title: 'Produk ditambahkan!' });
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
          <DialogTitle>{isEdit ? 'Edit Produk' : 'Tambah Produk'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Foto Produk</Label>
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
          <div className="space-y-2">
            <Label>Nama Produk</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Deskripsi</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Harga Asli (Rp)</Label>
            <Input type="number" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} required min="0" />
          </div>
          <div className="space-y-2">
            <Label>Harga Jual (Rp) — sudah termasuk 10% fee admin</Label>
            <Input type="number" value={sellingPrice || ''} readOnly className="bg-muted" />
            <p className="text-xs text-muted-foreground">Otomatis dihitung: Harga Asli ÷ 0.9, dibulatkan ke atas per Rp 500</p>
          </div>
          <div className="space-y-2">
            <Label>Harga Poin (untuk belanja poin customer)</Label>
            <Input type="number" value={form.pointPrice} onChange={e => setForm({ ...form, pointPrice: e.target.value })} min="0" />
            <p className="text-xs text-muted-foreground">Set 0 jika tidak dijual dengan poin</p>
          </div>
          <div className="space-y-2">
            <Label>Stok (-1 = unlimited)</Label>
            <Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MerchantProductForm;
