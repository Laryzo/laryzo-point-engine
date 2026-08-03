import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ArrowLeft, Coins, MapPin, Package, ShoppingCart, Star, Store } from 'lucide-react';

const formatNumber = (n: number) => new Intl.NumberFormat('id-ID').format(Number(n || 0));

// Deterministic pseudo-rating per menu item until real reviews exist
const menuRating = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 100000;
  const rating = 4.3 + (hash % 7) / 10; // 4.3 - 4.9
  const sold = 10 + (hash % 190);
  return { rating: rating.toFixed(1), sold };
};

const MerchantPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { count } = useCart();

  const [merchant, setMerchant] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: m }, { data: p }] = await Promise.all([
        supabase.rpc('get_public_merchants', { ids: [id as string] }),
        supabase
          .from('merchant_products')
          .select('*')
          .eq('merchant_id', id as string)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
      ]);
      setMerchant((m || [])[0] || null);
      setProducts(p || []);
      setLoading(false);
    };
    if (id) load();
  }, [id]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category || 'Lainnya'));
    return Array.from(set).sort();
  }, [products]);

  const visibleProducts = useMemo(
    () => (activeCategory ? products.filter((p) => (p.category || 'Lainnya') === activeCategory) : products),
    [products, activeCategory]
  );

  const avgRating = useMemo(() => {
    if (products.length === 0) return null;
    const sum = products.reduce((s, p) => s + Number(menuRating(p.id).rating), 0);
    return (sum / products.length).toFixed(1);
  }, [products]);

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
          <h1 className="text-lg font-semibold flex-1 truncate">{merchantName}</h1>
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
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-sm font-medium text-amber-600">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  {avgRating ?? 'Belum ada'}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {products.length} menu
                </Badge>
                {merchant.is_active && (
                  <Badge className="text-[10px]" variant="secondary">
                    Buka
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
          <h3 className="font-semibold">Menu {merchantName}</h3>

          {categories.length > 1 && (
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 pb-2">
                <Badge
                  variant={activeCategory === null ? 'default' : 'outline'}
                  className="cursor-pointer px-3 py-1"
                  onClick={() => setActiveCategory(null)}
                >
                  Semua
                </Badge>
                {categories.map((c) => (
                  <Badge
                    key={c}
                    variant={activeCategory === c ? 'default' : 'outline'}
                    className="cursor-pointer px-3 py-1"
                    onClick={() => setActiveCategory(c)}
                  >
                    {c}
                  </Badge>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}

          {visibleProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Mitra ini belum memiliki menu aktif.</p>
          ) : (
            <div className="space-y-3">
              {visibleProducts.map((p) => {
                const stock = Number(p.stock ?? 0);
                const isService = p.item_type === 'service';
                const unlimited = stock < 0;
                const soldOut = !unlimited && stock <= 0;
                const { rating, sold } = menuRating(p.id);
                return (
                  <Card
                    key={p.id}
                    className="overflow-hidden cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
                    onClick={() => !isService && navigate(`/portal/product/${p.id}`)}
                  >
                    <CardContent className="p-3 flex gap-3">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="h-24 w-24 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="h-24 w-24 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start gap-2">
                          <p className="font-medium text-sm flex-1 truncate">{p.name}</p>
                          {isService && <Badge variant="outline" className="text-[10px]">Jasa</Badge>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-amber-600 font-medium">
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                            {rating}
                          </span>
                          <span>·</span>
                          <span>{sold} terjual</span>
                        </div>
                        {p.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                        )}
                        <div className="flex items-center gap-1 text-primary font-bold text-sm">
                          <Coins className="h-3 w-3" />
                          <span>
                            {formatNumber(Number(p.price) || 0)} poin
                            {isService && p.unit ? ` / ${p.unit}` : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {isService
                            ? 'Pesan langsung di kasir mitra'
                            : unlimited
                            ? 'Stok tersedia'
                            : soldOut
                            ? 'Stok habis'
                            : `Stok: ${formatNumber(stock)}`}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MerchantPage;
