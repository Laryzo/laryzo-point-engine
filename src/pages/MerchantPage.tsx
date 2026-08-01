import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Coins, MapPin, Package, ShoppingCart, Star, Store } from 'lucide-react';

const formatNumber = (n: number) => new Intl.NumberFormat('id-ID').format(Number(n || 0));

const MerchantPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { count } = useCart();

  const [merchant, setMerchant] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: m }, { data: p }] = await Promise.all([
        supabase
          .from('merchants')
          .select('id, name, business_name, business_address, logo_url, is_active, created_at')
          .eq('id', id as string)
          .maybeSingle(),
        supabase
          .from('merchant_products')
          .select('*')
          .eq('merchant_id', id as string)
          .eq('is_active', true)
          .or('item_type.is.null,item_type.eq.product')
          .order('created_at', { ascending: false }),
      ]);
      setMerchant(m || null);
      setProducts(p || []);
      setLoading(false);
    };
    if (id) load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Mitra tidak ditemukan.</p>
        <Button onClick={() => navigate('/portal/shop')}>Kembali ke Belanja</Button>
      </div>
    );
  }

  const merchantName = merchant.business_name || merchant.name || 'Mitra';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold flex-1 truncate">Profil Mitra</h1>
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

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-5">
        <Card>
          <CardContent className="p-4 flex gap-4 items-center">
            {merchant.logo_url ? (
              <img src={merchant.logo_url} alt={merchantName} className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
                <Store className="h-7 w-7 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold truncate">{merchantName}</h2>
              {merchant.name && merchant.business_name && (
                <p className="text-xs text-muted-foreground truncate">Pemilik: {merchant.name}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 text-sm font-medium text-amber-600">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  {products.length > 0 ? '5.0' : 'Belum ada'}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {products.length} produk
                </Badge>
                {merchant.is_active && (
                  <Badge className="text-[10px]" variant="secondary">
                    Aktif
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {merchant.business_address && (
          <Card>
            <CardContent className="p-4 flex gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{merchant.business_address}</span>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          <h3 className="font-semibold">Produk Mitra Ini</h3>
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">Mitra ini belum memiliki produk aktif.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {products.map((p) => (
                <Card
                  key={p.id}
                  className="overflow-hidden cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
                  onClick={() => navigate(`/portal/product/${p.id}`)}
                >
                  <CardContent className="p-0">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-28 object-cover" />
                    ) : (
                      <div className="w-full h-28 bg-muted flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <div className="flex items-center gap-1 text-primary font-bold text-sm">
                        <Coins className="h-3 w-3" />
                        <span>{formatNumber(Number(p.price) || 0)} poin</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MerchantPage;
