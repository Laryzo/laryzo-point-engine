import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Coins, Search, ShoppingCart, Smartphone, Zap, CreditCard, Package } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  type: string;
  ppob_type: string;
  point_price: number;
  requires_input: string;
  image_url: string;
  stock: number;
  requires_shipping: boolean;
}

const CustomerShop = () => {
  const navigate = useNavigate();
  const { customer, refreshCustomer } = useCustomerAuth();
  const { toast } = useToast();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, search, activeCategory]);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (data) {
      setProducts(data.map(p => ({
        ...p,
        point_price: Number(p.point_price),
        stock: Number(p.stock),
      })));
    }
    setLoading(false);
  };

  const filterProducts = () => {
    let filtered = [...products];
    
    if (activeCategory !== 'all') {
      if (activeCategory === 'physical') {
        filtered = filtered.filter(p => p.type === 'physical');
      } else {
        filtered = filtered.filter(p => p.type === 'ppob' && p.ppob_type === activeCategory);
      }
    }
    
    if (search) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    setFilteredProducts(filtered);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const getCategoryIcon = (type: string, ppobType: string) => {
    if (type === 'physical') return <Package className="h-5 w-5" />;
    switch (ppobType) {
      case 'pulsa': return <Smartphone className="h-5 w-5" />;
      case 'token_pln': return <Zap className="h-5 w-5" />;
      case 'emoney': return <CreditCard className="h-5 w-5" />;
      default: return <ShoppingCart className="h-5 w-5" />;
    }
  };

  const getInputLabel = (inputType: string | null) => {
    if (!inputType) return '';
    switch (inputType) {
      case 'phone': return 'Nomor HP';
      case 'meter_number': return 'Nomor Meter PLN';
      case 'account_number': return 'Nomor Akun';
      default: return 'Input';
    }
  };

  const handleOrder = async () => {
    if (!selectedProduct || !customer) return;

    // Validate input
    if (selectedProduct.requires_input && !inputValue) {
      toast({
        title: 'Error',
        description: `${getInputLabel(selectedProduct.requires_input)} harus diisi`,
        variant: 'destructive',
      });
      return;
    }

    if (selectedProduct.requires_shipping && !shippingAddress) {
      toast({
        title: 'Error',
        description: 'Alamat pengiriman harus diisi',
        variant: 'destructive',
      });
      return;
    }

    // Check points
    if (customer.points < selectedProduct.point_price) {
      toast({
        title: 'Poin Tidak Cukup',
        description: `Anda membutuhkan ${formatNumber(selectedProduct.point_price)} poin untuk produk ini`,
        variant: 'destructive',
      });
      return;
    }

    setOrderLoading(true);

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          customer_id: customer.id,
          product_id: selectedProduct.id,
          points_used: selectedProduct.point_price,
          input_value: inputValue || null,
          shipping_address: shippingAddress || null,
          status: 'pending',
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Deduct points
      const { error: pointsError } = await supabase
        .from('customers')
        .update({ points: customer.points - selectedProduct.point_price })
        .eq('id', customer.id);

      if (pointsError) throw pointsError;

      // If PPOB, trigger the topup function
      if (selectedProduct.type === 'ppob') {
        const { error: topupError } = await supabase.functions.invoke('digiflazz-topup', {
          body: { orderId: order.id },
        });

        if (topupError) {
          console.error('Topup error:', topupError);
          // Order is still created, admin can process manually
        }
      }

      toast({
        title: 'Pesanan Berhasil',
        description: 'Pesanan Anda sedang diproses',
      });

      await refreshCustomer();
      setSelectedProduct(null);
      setInputValue('');
      setShippingAddress('');
      navigate('/portal/orders');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal membuat pesanan',
        variant: 'destructive',
      });
    } finally {
      setOrderLoading(false);
    }
  };

  const categories = [
    { id: 'all', label: 'Semua' },
    { id: 'pulsa', label: 'Pulsa' },
    { id: 'token_pln', label: 'Token PLN' },
    { id: 'emoney', label: 'E-Money' },
    { id: 'physical', label: 'Fisik' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/portal')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Belanja Poin</h1>
          </div>
          
          {/* Points Display */}
          <div className="flex items-center gap-2 mb-4 p-3 bg-primary/10 rounded-lg">
            <Coins className="h-5 w-5 text-primary" />
            <span className="text-sm">Poin Anda:</span>
            <span className="font-bold text-primary">{formatNumber(customer?.points || 0)}</span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4">
        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={activeCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(cat.id)}
              className="whitespace-nowrap"
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Tidak ada produk ditemukan</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <Card 
                key={product.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedProduct(product)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-center p-3 bg-muted rounded-lg mb-3">
                    {getCategoryIcon(product.type, product.ppob_type)}
                  </div>
                  <h3 className="font-medium text-sm mb-1 line-clamp-2">{product.name}</h3>
                  {product.description && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
                  )}
                  <div className="flex items-center gap-1 text-primary font-semibold">
                    <Coins className="h-4 w-4" />
                    <span>{formatNumber(product.point_price)}</span>
                  </div>
                  {product.stock > 0 && product.stock < 10 && (
                    <p className="text-xs text-orange-500 mt-1">Stok: {product.stock}</p>
                  )}
                  {product.stock === 0 && (
                    <p className="text-xs text-red-500 mt-1">Stok Habis</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Order Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              {selectedProduct?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span>Harga</span>
              <div className="flex items-center gap-1 font-semibold text-primary">
                <Coins className="h-4 w-4" />
                <span>{formatNumber(selectedProduct?.point_price || 0)}</span>
              </div>
            </div>

            {selectedProduct?.requires_input && (
              <div className="space-y-2">
                <Label htmlFor="input-value">{getInputLabel(selectedProduct.requires_input)}</Label>
                <Input
                  id="input-value"
                  placeholder={`Masukkan ${getInputLabel(selectedProduct.requires_input).toLowerCase()}`}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
              </div>
            )}

            {selectedProduct?.requires_shipping && (
              <div className="space-y-2">
                <Label htmlFor="shipping">Alamat Pengiriman</Label>
                <Input
                  id="shipping"
                  placeholder="Masukkan alamat lengkap"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                />
              </div>
            )}

            {customer && selectedProduct && customer.points < selectedProduct.point_price && (
              <p className="text-sm text-red-500">
                Poin Anda tidak cukup. Anda membutuhkan {formatNumber(selectedProduct.point_price - customer.points)} poin lagi.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProduct(null)}>
              Batal
            </Button>
            <Button 
              onClick={handleOrder} 
              disabled={orderLoading || (customer && selectedProduct && customer.points < selectedProduct.point_price)}
            >
              {orderLoading ? 'Memproses...' : 'Beli Sekarang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerShop;
