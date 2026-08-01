import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Coins, Minus, Plus, Package, ShoppingCart, Store } from 'lucide-react';

const formatNumber = (n: number) => new Intl.NumberFormat('id-ID').format(Number(n || 0));

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addItem, count } = useCart();

  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('merchant_products')
        .select('*, merchants(id, business_name, name, latitude, longitude, logo_url)')
        .eq('id', id as string)
        .eq('is_active', true)
        .maybeSingle();
      
      if (data) {
        // Fallback: If merchants join failed (RLS or other issues), try fetching separately
        const mData = Array.isArray(data.merchants) ? data.merchants[0] : data.merchants;
        if (!mData && data.merchant_id) {
          const { data: separateMerchant } = await supabase
            .from('merchants')
            .select('id, business_name, name, latitude, longitude, logo_url')
            .eq('id', data.merchant_id)
            .maybeSingle();
          if (separateMerchant) {
            data.merchants = separateMerchant;
          }
        }
        setProduct(data);
      } else {
        setProduct(null);
      }
      
      setLoading(false);
    };
    if (id) load();
  }, [id]);

  const merchantData = Array.isArray(product?.merchants) ? product.merchants[0] : product?.merchants;
  const merchantName = merchantData?.business_name || merchantData?.name || 'Mitra';
  const price = Number(product?.price || 0);
  const stock = Number(product?.stock || 0);
  const maxQty = stock > 0 ? stock : 1;

  const handleAddToCart = () => {
    if (!product) return;
    addItem(
      {
        product_id: product.id,
        name: product.name,
        price,
        image_url: product.image_url || null,
        stock,
        merchant_id: product.merchant_id || null,
        merchant_name: merchantName,
        merchant_lat: merchantData?.latitude ? Number(merchantData.latitude) : null,
        merchant_lng: merchantData?.longitude ? Number(merchantData.longitude) : null,
      },
      qty
    );
    toast({ title: 'Ditambahkan ke keranjang', description: `${product.name} x${qty}` });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Produk tidak ditemukan.</p>
        <Button onClick={() => navigate('/portal/shop')}>Kembali ke Belanja</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold flex-1 truncate">Detail Produk</h1>
          <Button variant="outline" size="sm" onClick={() => navigate('/portal/cart')} className="relative">
            <ShoppingCart className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
                {count}
              </span>
            )}
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        <Card className="overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-64 object-cover" />
          ) : (
            <div className="w-full h-64 bg-muted flex items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold">{product.name}</h2>
              {product.category && <Badge variant="outline">{product.category}</Badge>}
            </div>

            <div className="flex items-center gap-1 text-primary font-bold text-lg">
              <Coins className="h-5 w-5" />
              <span>{formatNumber(price)} poin</span>
            </div>

            {product.merchant_id && (
              <Link
                to={`/portal/merchant/${product.merchant_id}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <Store className="h-4 w-4" /> {merchantName}
              </Link>
            )}

            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {product.description || 'Tidak ada deskripsi produk.'}
            </p>

            <p className="text-xs text-muted-foreground">
              Stok: {stock > 0 ? formatNumber(stock) : 'Habis'}
            </p>

            <div className="flex items-center gap-3 pt-2">
              <span className="text-sm">Jumlah</span>
              <div className="flex items-center border rounded-lg">
                <Button variant="ghost" size="icon" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-10 text-center font-medium">{qty}</span>
                <Button variant="ghost" size="icon" onClick={() => setQty((q) => Math.min(maxQty, q + 1))}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <span className="ml-auto text-sm font-semibold">{formatNumber(price * qty)} poin</span>
            </div>

            <Button className="w-full" disabled={stock <= 0} onClick={handleAddToCart}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              {stock <= 0 ? 'Stok Habis' : 'Tambah ke Keranjang'}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProductDetail;
