import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Coins, Minus, Package, Plus, ShoppingCart, Store, Trash2 } from 'lucide-react';

const formatNumber = (n: number) => new Intl.NumberFormat('id-ID').format(Number(n || 0));

const CustomerCart = () => {
  const navigate = useNavigate();
  const { items, total, setQty, removeItem, clear } = useCart();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/portal/shop')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold flex-1">Keranjang</h1>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clear}>
              Kosongkan
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Keranjang Anda masih kosong.</p>
            <Button onClick={() => navigate('/portal/shop')}>Mulai Belanja</Button>
          </div>
        ) : (
          <>
            {items.map((item) => (
              <Card key={item.product_id}>
                <CardContent className="p-3 flex gap-3">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="h-20 w-20 rounded-lg object-cover" />
                  ) : (
                    <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <button
                      className="font-medium text-sm truncate text-left hover:underline"
                      onClick={() => navigate(`/portal/product/${item.product_id}`)}
                    >
                      {item.name}
                    </button>
                    {item.merchant_id && (
                      <Link
                        to={`/portal/merchant/${item.merchant_id}`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Store className="h-3 w-3" /> {item.merchant_name}
                      </Link>
                    )}
                    <div className="flex items-center gap-1 text-primary font-semibold text-sm mt-1">
                      <Coins className="h-3 w-3" />
                      {formatNumber(item.price * item.qty)} poin
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center border rounded-lg">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQty(item.product_id, item.qty - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.qty}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setQty(item.product_id, Math.min(item.stock > 0 ? item.stock : item.qty, item.qty + 1))}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(item.product_id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-primary">{formatNumber(total)} poin</span>
                </div>
                <Button className="w-full" onClick={() => navigate('/portal/checkout')}>
                  Lanjut ke Checkout
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default CustomerCart;
