import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { canonicalizePpobBrand, getPpobBrandFromProductName } from '@/lib/ppob-brand';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  ArrowLeft, 
  Coins, 
  Search, 
  ShoppingCart, 
  Smartphone, 
  Zap, 
  CreditCard, 
  Package,
  Store,
  ChevronRight,
  ChevronLeft,
  Contact,
  History,
  Truck,
  MapPin
} from 'lucide-react';

// Declare Contact Picker API types
declare global {
  interface ContactInfo {
    name?: string[];
    email?: string[];
    tel?: string[];
    address?: ContactAddress[];
    icon?: Blob[];
  }
  
  interface ContactAddress {
    city?: string;
    country?: string;
    dependentLocality?: string;
    organization?: string;
    phone?: string;
    postalCode?: string;
    recipient?: string;
    region?: string;
    sortingCode?: string;
    addressLine?: string[];
  }

  interface ContactsManager {
    select(properties: string[], options?: { multiple?: boolean }): Promise<ContactInfo[]>;
    getProperties(): Promise<string[]>;
  }

  interface Navigator {
    contacts?: ContactsManager;
  }
}

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

// Menu structure types
type MenuLevel = 'main' | 'category' | 'brand' | 'products';

interface CategoryConfig {
  id: string;
  label: string;
  ppob_type: string;
  icon: React.ReactNode;
}

interface PhoneHistoryItem {
  id: string;
  phone_number: string;
  label: string | null;
  last_used_at: string;
  use_count: number;
}

const CustomerShop = () => {
  const navigate = useNavigate();
  const { customer, refreshCustomer } = useCustomerAuth();
  const { toast } = useToast();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [merchantProducts, setMerchantProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Phone history state
  const [phoneHistory, setPhoneHistory] = useState<PhoneHistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  
  // Hierarchical navigation state
  const [menuLevel, setMenuLevel] = useState<MenuLevel>('main');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedMerchantCoords, setSelectedMerchantCoords] = useState<{lat: number, lng: number} | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [deliveryType, setDeliveryType] = useState<'none' | 'pickup' | 'external_ojol'>('none');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [deliveryLat, setDeliveryLat] = useState('');
  const [deliveryLng, setDeliveryLng] = useState('');
  const [estimatedDistance, setEstimatedDistance] = useState<number | null>(null);
  const [estimatedShipping, setEstimatedShipping] = useState<number | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);

  // Category configurations
  const ppobCategories: CategoryConfig[] = [
    { id: 'pulsa', label: 'Pulsa', ppob_type: 'pulsa', icon: <Smartphone className="h-8 w-8" /> },
    { id: 'emoney', label: 'E-Money', ppob_type: 'emoney', icon: <CreditCard className="h-8 w-8" /> },
    { id: 'token_pln', label: 'Token PLN', ppob_type: 'token_pln', icon: <Zap className="h-8 w-8" /> },
  ];

  // Haversine formula for client-side distance preview
  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const calculateGojekShipping = (km: number): number => {
    if (km <= 0) return 0;
    if (km <= 3) return 10000;
    if (km <= 7) return 15000;
    if (km <= 12) return 22000;
    return 22000 + Math.ceil(km - 12) * 3000;
  };

  // Auto-calculate shipping when coordinates change
  useEffect(() => {
    if (selectedMerchantCoords && deliveryLat && deliveryLng) {
      const dist = haversineDistance(
        selectedMerchantCoords.lat, selectedMerchantCoords.lng,
        Number(deliveryLat), Number(deliveryLng)
      );
      const rounded = Math.round(dist * 10) / 10;
      setEstimatedDistance(rounded);
      setEstimatedShipping(calculateGojekShipping(rounded));
    } else {
      setEstimatedDistance(null);
      setEstimatedShipping(null);
    }
  }, [selectedMerchantCoords, deliveryLat, deliveryLng]);

  useEffect(() => {
    fetchProducts();
    fetchMerchantProducts();
    fetchPhoneHistory();
  }, [customer?.id]);

  // Fetch phone history for current customer
  const fetchPhoneHistory = async () => {
    if (!customer?.id) return;
    
    const { data, error } = await supabase
      .from('customer_phone_history' as any)
      .select('*')
      .eq('customer_id', customer.id)
      .order('last_used_at', { ascending: false })
      .limit(10);

    if (data && !error) {
      setPhoneHistory(data as unknown as PhoneHistoryItem[]);
    }
  };

  // Handle selecting a phone from history
  const handleSelectFromHistory = (phoneNumber: string) => {
    setInputValue(phoneNumber);
    setHistoryOpen(false);
    toast({
      title: 'Nomor Dipilih',
      description: `Nomor ${phoneNumber} berhasil dipilih dari riwayat`,
    });
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products_public' as any)
      .select('*')
      .order('point_price', { ascending: true });

    if (data) {
      setProducts(data.map((p: any) => ({
        ...p,
        point_price: Number(p.point_price),
        stock: Number(p.stock),
      })));
    }
    setLoading(false);
  };

  const fetchMerchantProducts = async () => {
    const { data } = await supabase
      .from('merchant_products')
      .select('*, merchants(business_name, name, latitude, longitude)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    setMerchantProducts(data || []);
  };

  // Extract brands from products for current category
  const brandsForCategory = useMemo(() => {
    if (!selectedCategory) return [];
    
    const categoryProducts = products.filter(p => 
      p.type === 'ppob' && p.ppob_type === selectedCategory
    );
    
    // Extract brand from product name (first word before space)
    const brandSet = new Set<string>();
    categoryProducts.forEach(p => {
      brandSet.add(getPpobBrandFromProductName(p.name));
    });
    
    return Array.from(brandSet).sort();
  }, [products, selectedCategory]);

  // Filter products based on current selection
  const filteredProducts = useMemo(() => {
    let filtered = [...products];
    
    if (menuLevel === 'products') {
      if (selectedCategory === 'physical') {
        filtered = filtered.filter(p => p.type === 'physical');
      } else if (selectedCategory && selectedBrand) {
        const selected = canonicalizePpobBrand(selectedBrand);
        filtered = filtered.filter(p => {
          if (p.type !== 'ppob' || p.ppob_type !== selectedCategory) return false;
          return getPpobBrandFromProductName(p.name) === selected;
        });
      }
    }
    
    // Apply search
    if (search) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Sort by point price ascending
    filtered.sort((a, b) => a.point_price - b.point_price);
    
    return filtered;
  }, [products, menuLevel, selectedCategory, selectedBrand, search]);

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

  const getBrandIcon = (brand: string) => {
    // Could be extended with actual brand logos
    return <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
      {brand.charAt(0)}
    </div>;
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

  // Check if Contact Picker API is supported
  const isContactPickerSupported = () => {
    return 'contacts' in navigator && 'ContactsManager' in window;
  };

  // Handle picking contact from phonebook
  const handlePickContact = async () => {
    if (!isContactPickerSupported()) {
      toast({
        title: 'Tidak Didukung',
        description: 'Browser Anda tidak mendukung akses kontak. Silakan masukkan nomor manual.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const contacts = await navigator.contacts!.select(['tel'], { multiple: false });
      
      if (contacts && contacts.length > 0 && contacts[0].tel && contacts[0].tel.length > 0) {
        // Clean the phone number - remove spaces, dashes, and country code
        let phoneNumber = contacts[0].tel[0];
        phoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, ''); // Remove spaces, dashes, parentheses
        
        // Convert +62 or 62 to 0
        if (phoneNumber.startsWith('+62')) {
          phoneNumber = '0' + phoneNumber.substring(3);
        } else if (phoneNumber.startsWith('62')) {
          phoneNumber = '0' + phoneNumber.substring(2);
        }
        
        setInputValue(phoneNumber);
        toast({
          title: 'Kontak Dipilih',
          description: `Nomor ${phoneNumber} berhasil dipilih`,
        });
      }
    } catch (error: any) {
      // User cancelled or error occurred
      if (error.name !== 'InvalidStateError' && error.name !== 'NotAllowedError') {
        console.error('Contact picker error:', error);
        toast({
          title: 'Error',
          description: 'Gagal mengakses kontak',
          variant: 'destructive',
        });
      }
    }
  };

  // Navigation handlers
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (categoryId === 'physical') {
      // Physical products go directly to product list
      setMenuLevel('products');
    } else if (categoryId === 'token_pln') {
      // PLN only has one "brand", go directly to products
      setSelectedBrand('PLN');
      setMenuLevel('products');
    } else {
      setMenuLevel('brand');
    }
  };

  const handleBrandSelect = (brand: string) => {
    setSelectedBrand(brand);
    setMenuLevel('products');
  };

  const handleBack = () => {
    if (menuLevel === 'products') {
      if (selectedCategory === 'physical' || selectedCategory === 'token_pln') {
        setMenuLevel('main');
        setSelectedCategory(null);
        setSelectedBrand(null);
      } else {
        setMenuLevel('brand');
        setSelectedBrand(null);
      }
    } else if (menuLevel === 'brand') {
      setMenuLevel('main');
      setSelectedCategory(null);
    } else {
      navigate('/portal');
    }
  };

  const getPageTitle = () => {
    if (menuLevel === 'main') return 'Belanja Poin';
    if (menuLevel === 'brand') {
      const cat = ppobCategories.find(c => c.id === selectedCategory);
      return cat?.label || 'Pilih Provider';
    }
    if (menuLevel === 'products') {
      if (selectedCategory === 'physical') return 'Produk Fisik';
      if (selectedBrand) return selectedBrand;
      return 'Produk';
    }
    return 'Belanja Poin';
  };

  const handleOrder = async () => {
    if (!selectedProduct || !customer) return;

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

    if (deliveryType === 'external_ojol' && !deliveryAddress) {
      toast({
        title: 'Error',
        description: 'Alamat pengiriman ojol harus diisi',
        variant: 'destructive',
      });
      return;
    }

    // Calculate total including shipping for merchant products with ojol
    const shippingCost = (selectedProduct.type === 'merchant' && deliveryType === 'external_ojol' && estimatedShipping) ? estimatedShipping : 0;
    const totalPointsNeeded = selectedProduct.point_price + shippingCost;

    if (customer.points < totalPointsNeeded) {
      toast({
        title: 'Poin Tidak Cukup',
        description: `Anda membutuhkan ${formatNumber(totalPointsNeeded)} poin (produk + ongkir)`,
        variant: 'destructive',
      });
      return;
    }

    setOrderLoading(true);

    try {
      // Merchant product purchase uses dedicated edge function
      if (selectedProduct.type === 'merchant') {
        const { data: result, error: fnError } = await supabase.functions.invoke('merchant-product-purchase', {
          body: { 
            product_id: selectedProduct.id,
            delivery_type: deliveryType,
            delivery_address: deliveryType === 'external_ojol' ? deliveryAddress : null,
            delivery_notes: deliveryNotes || null,
            delivery_latitude: deliveryType === 'external_ojol' && deliveryLat ? Number(deliveryLat) : null,
            delivery_longitude: deliveryType === 'external_ojol' && deliveryLng ? Number(deliveryLng) : null,
            item_notes: itemNotes || null,
          },
        });

        if (fnError) throw new Error(fnError.message || 'Gagal memproses pembelian');
        if (result && !result.success) throw new Error(result.error || 'Gagal memproses pembelian');

        const totalPaid = selectedProduct.point_price + shippingCost;
        toast({
          title: 'Pembelian Berhasil! 🎉',
          description: shippingCost > 0 
            ? `${selectedProduct.name} berhasil dibeli dengan ${formatNumber(totalPaid)} poin (termasuk ongkir ${formatNumber(shippingCost)})`
            : `${selectedProduct.name} berhasil dibeli dengan ${formatNumber(selectedProduct.point_price)} poin`,
        });

        await refreshCustomer();
        setSelectedProduct(null);
        setInputValue('');
        setShippingAddress('');
        setDeliveryType('none');
        setDeliveryAddress('');
        setDeliveryNotes('');
        setItemNotes('');
        setDeliveryLat('');
        setDeliveryLng('');
        setEstimatedDistance(null);
        setEstimatedShipping(null);
        return;
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          customer_id: customer.id,
          product_id: selectedProduct.id,
          points_used: selectedProduct.point_price,
          input_value: inputValue || null,
          shipping_address: shippingAddress || null,
          status: 'pending',
          order_type: selectedProduct.type === 'ppob' ? 'ppob' : 'product',
          delivery_type: deliveryType,
          delivery_address: deliveryType === 'external_ojol' ? deliveryAddress : null,
          delivery_notes: deliveryNotes || null,
          delivery_status: deliveryType === 'external_ojol' ? 'waiting_driver' : null,
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      if (selectedProduct.type === 'ppob') {
        const { data: topupResult, error: topupError } = await supabase.functions.invoke('digiflazz-topup', {
          body: { order_id: order.id },
        });

        if (topupError) {
          console.error('Topup error:', topupError);
          await supabase.from('orders').delete().eq('id', order.id);
          throw new Error('Gagal memproses pesanan PPOB');
        }

        if (topupResult && !topupResult.success) {
          throw new Error(topupResult.error || 'Gagal memproses pesanan PPOB');
        }
      } else {
        const { data: pointsSuccess, error: pointsError } = await supabase.rpc(
          'increment_customer_points',
          {
            customer_uuid: customer.id,
            points_to_add: -selectedProduct.point_price
          }
        );

        if (pointsError) throw pointsError;
        
        if (!pointsSuccess) {
          await supabase.from('orders').delete().eq('id', order.id);
          throw new Error('Gagal mengurangi poin - akun mungkin diblokir atau saldo tidak cukup');
        }
      }

      toast({
        title: 'Pesanan Berhasil',
        description: selectedProduct.type === 'ppob' 
          ? 'Pesanan PPOB Anda sedang diproses'
          : 'Pesanan Anda sedang diproses oleh admin',
      });

      await refreshCustomer();
      setSelectedProduct(null);
      setInputValue('');
      setShippingAddress('');
      setDeliveryType('none');
      setDeliveryAddress('');
      setDeliveryNotes('');
      setItemNotes('');
      setDeliveryLat('');
      setDeliveryLng('');
      setEstimatedDistance(null);
      setEstimatedShipping(null);
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

  // Count products per category
  const getProductCountForCategory = (ppobType: string) => {
    return products.filter(p => p.type === 'ppob' && p.ppob_type === ppobType).length;
  };

  const getPhysicalProductCount = () => {
    return products.filter(p => p.type === 'physical').length;
  };

  // Count products per brand
  const getProductCountForBrand = (brand: string) => {
    if (!selectedCategory) return 0;
    return products.filter(p => {
      if (p.type !== 'ppob' || p.ppob_type !== selectedCategory) return false;
      return getPpobBrandFromProductName(p.name) === canonicalizePpobBrand(brand);
    }).length;
  };

  // Render main menu
  const renderMainMenu = () => (
    <div className="space-y-6">
      {/* PPOB Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Produk PPOB</h2>
        <div className="grid grid-cols-3 gap-4">
          {ppobCategories.map((cat) => {
            const productCount = getProductCountForCategory(cat.ppob_type);
            return (
              <Card 
                key={cat.id}
                className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                onClick={() => handleCategorySelect(cat.id)}
              >
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary mb-3">
                    {cat.icon}
                  </div>
                  <span className="font-medium text-sm">{cat.label}</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {productCount} produk
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground mt-2" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Physical Products Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Produk Fisik</h2>
        <Card 
          className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
          onClick={() => handleCategorySelect('physical')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Package className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <span className="font-medium">Lihat Semua Produk Fisik</span>
              <p className="text-sm text-muted-foreground">
                {getPhysicalProductCount()} produk tersedia
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      {/* Merchant Products Section */}
      {merchantProducts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Store className="h-5 w-5" />
            Produk Mitra
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {merchantProducts.map((mp: any) => {
              const sellingPrice = Number(mp.price) || 0;
              return (
                <Card
                  key={mp.id}
                  className="overflow-hidden cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
                  onClick={() => {
                    setSelectedProduct({
                      id: mp.id,
                      name: mp.name,
                      description: mp.description || '',
                      type: 'merchant',
                      ppob_type: '',
                      point_price: sellingPrice,
                      requires_input: '',
                      image_url: mp.image_url || '',
                      stock: mp.stock,
                      requires_shipping: false,
                    } as Product);
                    // Store merchant GPS for auto distance calculation
                    if (mp.merchants?.latitude && mp.merchants?.longitude) {
                      setSelectedMerchantCoords({ lat: Number(mp.merchants.latitude), lng: Number(mp.merchants.longitude) });
                    } else {
                      setSelectedMerchantCoords(null);
                    }
                  }}
                >
                  <CardContent className="p-0">
                    {mp.image_url ? (
                      <img src={mp.image_url} alt={mp.name} className="w-full h-28 object-cover" />
                    ) : (
                      <div className="w-full h-28 bg-muted flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="font-medium text-sm truncate">{mp.name}</p>
                      <div className="flex items-center gap-1 text-primary font-bold text-sm">
                        <Coins className="h-3 w-3" />
                        <span>{formatNumber(sellingPrice)} poin</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] mt-1">
                        {mp.merchants?.business_name || mp.merchants?.name || 'Mitra'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // Render brand selection
  const renderBrandMenu = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Pilih provider:</p>
      <div className="grid grid-cols-3 gap-3">
        {brandsForCategory.map((brand) => {
          const productCount = getProductCountForBrand(brand);
          return (
            <Card 
              key={brand}
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
              onClick={() => handleBrandSelect(brand)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center">
                {getBrandIcon(brand)}
                <span className="font-medium mt-2">{brand}</span>
                <span className="text-xs text-muted-foreground mt-1">
                  {productCount} produk
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground mt-2" />
              </CardContent>
            </Card>
          );
        })}
      </div>
      {brandsForCategory.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Belum ada produk di kategori ini
        </div>
      )}
    </div>
  );

  // Render products list
  const renderProductsList = () => (
    <div className="space-y-4">
      {/* Search in products */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {filteredProducts.length} produk ditemukan (diurutkan dari harga terendah)
      </p>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Tidak ada produk ditemukan</p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-320px)]">
          <div className="space-y-2 pr-4">
            {filteredProducts.map((product) => (
              <Card 
                key={product.id} 
                className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
                onClick={() => setSelectedProduct(product)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex items-center justify-center p-2 bg-muted rounded-lg">
                    {getCategoryIcon(product.type, product.ppob_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{product.name}</h3>
                    {product.description && (
                      <p className="text-xs text-muted-foreground truncate">{product.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-primary font-semibold">
                      <Coins className="h-4 w-4" />
                      <span>{formatNumber(product.point_price)}</span>
                    </div>
                    {product.stock > 0 && product.stock < 10 && (
                      <p className="text-xs text-orange-500">Stok: {product.stock}</p>
                    )}
                    {product.stock === 0 && (
                      <p className="text-xs text-red-500">Habis</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              {menuLevel === 'main' ? <ArrowLeft className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </Button>
            <h1 className="text-xl font-semibold">{getPageTitle()}</h1>
          </div>
          
          {/* Points Display */}
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
            <Coins className="h-5 w-5 text-primary" />
            <span className="text-sm">Poin Anda:</span>
            <span className="font-bold text-primary">{formatNumber(customer?.points || 0)}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {menuLevel === 'main' && renderMainMenu()}
            {menuLevel === 'brand' && renderBrandMenu()}
            {menuLevel === 'products' && renderProductsList()}
          </>
        )}
      </main>

      {/* Order Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              {selectedProduct?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 pr-1">
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
                <div className="flex gap-2">
                  <Input
                    id="input-value"
                    placeholder={`Masukkan ${getInputLabel(selectedProduct.requires_input).toLowerCase()}`}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="flex-1"
                  />
                  {/* Show contact picker and history buttons only for phone input (pulsa/emoney) */}
                  {selectedProduct.requires_input === 'phone' && (
                    <>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon"
                        onClick={handlePickContact}
                        title="Pilih dari kontak"
                      >
                        <Contact className="h-4 w-4" />
                      </Button>
                      <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
                        <PopoverTrigger asChild>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon"
                            title="Riwayat nomor"
                            disabled={phoneHistory.length === 0}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0" align="end">
                          <div className="p-2 border-b">
                            <p className="text-sm font-medium">Nomor Terakhir</p>
                          </div>
                          <ScrollArea className="max-h-48">
                            {phoneHistory.length === 0 ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                Belum ada riwayat nomor
                              </div>
                            ) : (
                              <div className="p-1">
                                {phoneHistory.map((item) => (
                                  <button
                                    key={item.id}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-sm flex items-center justify-between"
                                    onClick={() => handleSelectFromHistory(item.phone_number)}
                                  >
                                    <span className="font-medium">{item.phone_number}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {item.use_count}x
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    </>
                  )}
                </div>
                {selectedProduct.requires_input === 'phone' && (
                  <p className="text-xs text-muted-foreground">
                    Klik 📱 untuk pilih dari kontak, atau 📋 untuk riwayat nomor terakhir
                  </p>
                )}
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

            {/* Item Notes - for merchant products */}
            {selectedProduct?.type === 'merchant' && (
              <div className="space-y-2">
                <Label htmlFor="item-notes">Catatan Pesanan (opsional)</Label>
                <Input
                  id="item-notes"
                  placeholder="Contoh: Sambal pedas, nasi tambah, dll"
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Catatan ini akan diteruskan ke resto dan driver</p>
              </div>
            )}

            {/* Delivery Options - only for physical/merchant products */}
            {selectedProduct && (selectedProduct.type === 'physical' || selectedProduct.type === 'merchant') && (
              <div className="space-y-3">
                <Label>Metode Pengambilan</Label>
                <RadioGroup
                  value={deliveryType}
                  onValueChange={(val) => setDeliveryType(val as 'none' | 'pickup' | 'external_ojol')}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="pickup" id="pickup" />
                    <Label htmlFor="pickup" className="flex items-center gap-2 cursor-pointer flex-1">
                      <MapPin className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-medium text-sm">Ambil Sendiri (Pickup)</p>
                        <p className="text-xs text-muted-foreground">Ambil langsung di toko mitra</p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="external_ojol" id="external_ojol" />
                    <Label htmlFor="external_ojol" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Truck className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-medium text-sm">Kirim via Ojol</p>
                        <p className="text-xs text-muted-foreground">Dikirim menggunakan Grab/Gojek</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>

                {deliveryType === 'external_ojol' && (
                  <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
                    <div className="space-y-2">
                      <Label htmlFor="delivery-address">Alamat Pengiriman Ojol *</Label>
                      <Input
                        id="delivery-address"
                        placeholder="Alamat lengkap tujuan pengiriman"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="delivery-notes">Catatan untuk Driver (opsional)</Label>
                      <Input
                        id="delivery-notes"
                        placeholder="Contoh: Lantai 2, warna pintu biru"
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">📍 Koordinat Tujuan (untuk hitung ongkir otomatis)</Label>
                      <p className="text-xs text-muted-foreground">
                        Klik "Gunakan Lokasi Saya" atau salin dari Google Maps
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Latitude</Label>
                          <Input
                            type="number"
                            step="any"
                            value={deliveryLat}
                            onChange={(e) => setDeliveryLat(e.target.value)}
                            placeholder="-6.2088"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Longitude</Label>
                          <Input
                            type="number"
                            step="any"
                            value={deliveryLng}
                            onChange={(e) => setDeliveryLng(e.target.value)}
                            placeholder="106.8456"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!navigator.geolocation) {
                            toast({ title: 'Geolokasi tidak didukung', variant: 'destructive' });
                            return;
                          }
                          navigator.geolocation.getCurrentPosition(
                            (pos) => {
                              setDeliveryLat(String(pos.coords.latitude));
                              setDeliveryLng(String(pos.coords.longitude));
                              toast({ title: 'Lokasi berhasil diambil' });
                            },
                            (err) => {
                              toast({ title: 'Gagal ambil lokasi', description: err.message, variant: 'destructive' });
                            }
                          );
                        }}
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        Gunakan Lokasi Saya
                      </Button>
                    </div>
                    {estimatedDistance !== null && estimatedShipping !== null && (
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-xs font-medium text-primary mb-1">🚚 Estimasi Ongkir (termasuk dalam total bayar)</p>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-lg font-bold text-primary">
                            <Coins className="h-4 w-4" />
                            <span>{formatNumber(estimatedShipping)} poin</span>
                          </div>
                          <span className="text-xs text-muted-foreground">({estimatedDistance.toFixed(1)} km)</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Total bayar: {formatNumber((selectedProduct?.point_price || 0) + estimatedShipping)} poin (produk + ongkir)
                        </p>
                      </div>
                    )}
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <p className="text-xs font-medium text-primary mb-1">🚚 Tarif Standar Gojek</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between"><span>0-3 km</span><span className="font-medium">Rp 10.000</span></div>
                        <div className="flex justify-between"><span>3-7 km</span><span className="font-medium">Rp 15.000</span></div>
                        <div className="flex justify-between"><span>7-12 km</span><span className="font-medium">Rp 22.000</span></div>
                        <div className="flex justify-between"><span>12+ km</span><span className="font-medium">+Rp 3.000/km</span></div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      💡 Ongkos kirim sudah termasuk dalam total pembayaran poin. Laryzo yang akan membayar driver.
                    </p>
                  </div>
                )}
              </div>
            )}

            {customer && selectedProduct && (() => {
              const shippingForCheck = (selectedProduct.type === 'merchant' && deliveryType === 'external_ojol' && estimatedShipping) ? estimatedShipping : 0;
              const totalForCheck = selectedProduct.point_price + shippingForCheck;
              return customer.points < totalForCheck ? (
                <p className="text-sm text-destructive">
                  Poin Anda tidak cukup. Anda membutuhkan {formatNumber(totalForCheck - customer.points)} poin lagi.
                  {shippingForCheck > 0 && ` (Produk: ${formatNumber(selectedProduct.point_price)} + Ongkir: ${formatNumber(shippingForCheck)})`}
                </p>
              ) : null;
            })()}
          </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProduct(null)}>
              Batal
            </Button>
            <Button 
              onClick={handleOrder} 
              disabled={orderLoading || (customer && selectedProduct && (() => {
                const sc = (selectedProduct.type === 'merchant' && deliveryType === 'external_ojol' && estimatedShipping) ? estimatedShipping : 0;
                return customer.points < (selectedProduct.point_price + sc);
              })())}
            >
              {orderLoading ? 'Memproses...' : (() => {
                const sc = (selectedProduct?.type === 'merchant' && deliveryType === 'external_ojol' && estimatedShipping) ? estimatedShipping : 0;
                const total = (selectedProduct?.point_price || 0) + sc;
                return sc > 0 ? `Bayar ${formatNumber(total)} Poin` : 'Beli Sekarang';
              })()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerShop;
