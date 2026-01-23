import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Plus, RefreshCw, Edit, Trash2, Loader2, Download, Search, Check, ChevronRight, ChevronLeft, Smartphone, CreditCard, Zap, Package } from 'lucide-react';
import { canonicalizePpobBrand, getPpobBrandFromProductName } from '@/lib/ppob-brand';

interface Product {
  id: string;
  name: string;
  description: string | null;
  type: string;
  ppob_type: string | null;
  digiflazz_sku: string | null;
  cost_price: number;
  point_price: number;
  stock: number;
  is_active: boolean;
  requires_shipping: boolean;
  requires_input: string | null;
  image_url: string | null;
}

interface DigiflazzCacheProduct {
  buyer_sku_code: string;
  product_name: string;
  category: string;
  brand: string;
  price: number;
  buyer_product_status: boolean;
  seller_product_status: boolean;
}

interface ProductManagementProps {
  isSuperAdmin?: boolean;
}

// Menu navigation types
type PPOBMenuLevel = 'category' | 'brand' | 'products';

interface CategoryConfig {
  id: string;
  label: string;
  ppob_type: string;
  icon: React.ReactNode;
}

const ProductManagement = ({ isSuperAdmin = false }: ProductManagementProps) => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState('ppob');

  // Hierarchical PPOB navigation
  const [ppobMenuLevel, setPpobMenuLevel] = useState<PPOBMenuLevel>('category');
  const [selectedPpobCategory, setSelectedPpobCategory] = useState<string | null>(null);
  const [selectedPpobBrand, setSelectedPpobBrand] = useState<string | null>(null);

  // PPOB Categories config
  const ppobCategories: CategoryConfig[] = [
    { id: 'pulsa', label: 'Pulsa', ppob_type: 'pulsa', icon: <Smartphone className="h-8 w-8" /> },
    { id: 'emoney', label: 'E-Money', ppob_type: 'emoney', icon: <CreditCard className="h-8 w-8" /> },
    { id: 'token_pln', label: 'Token PLN', ppob_type: 'token_pln', icon: <Zap className="h-8 w-8" /> },
  ];

  // Import dialog state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [cacheProducts, setCacheProducts] = useState<DigiflazzCacheProduct[]>([]);
  const [existingSkus, setExistingSkus] = useState<Set<string>>(new Set());
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());
  const [importFilter, setImportFilter] = useState({ category: '', brand: '', search: '' });
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'ppob',
    ppob_type: '',
    digiflazz_sku: '',
    cost_price: 0,
    point_price: 0,
    stock: -1,
    is_active: true,
    requires_shipping: false,
    requires_input: '',
    image_url: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('point_price', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
      
      // Update existing SKUs set
      const skus = new Set((data || []).filter(p => p.digiflazz_sku).map(p => p.digiflazz_sku!));
      setExistingSkus(skus);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const syncFromDigiflazz = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('digiflazz-price-list', {
        body: { cmd: 'prepaid', force: true }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to sync');
      }

      let description = `Ditemukan ${data.count} produk dari Digiflazz.`;
      
      if (data.products_synced > 0) {
        description += ` ${data.products_synced} produk PPOB dicek.`;
        
        if (data.prices_changed > 0) {
          description += ` ${data.prices_changed} harga terupdate.`;
        } else {
          description += ` Semua harga sudah sinkron.`;
        }
      }

      toast({ 
        title: 'Sync Berhasil', 
        description
      });

      if (data.changes && data.changes.length > 0) {
        console.log('Perubahan harga:', data.changes);
        
        const changesList = data.changes.slice(0, 3).map((c: { 
          name: string; 
          old_cost: number; 
          new_cost: number; 
          old_point_price: number; 
          new_point_price: number 
        }) => 
          `${c.name}: Modal Rp${c.new_cost.toLocaleString()}, Poin ${c.new_point_price.toLocaleString()}`
        ).join('\n');
        
        toast({
          title: `${data.prices_changed} Harga Berubah`,
          description: changesList + (data.changes.length > 3 ? `\n...dan ${data.changes.length - 3} lainnya` : ''),
        });
      }

      fetchProducts();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  // Load cache products for import dialog
  const loadCacheProducts = async () => {
    setImportLoading(true);
    try {
      const { data, error } = await supabase
        .from('digiflazz_price_cache')
        .select('buyer_sku_code, product_name, category, brand, price, buyer_product_status, seller_product_status')
        .eq('buyer_product_status', true)
        .order('category', { ascending: true })
        .order('brand', { ascending: true })
        .order('product_name', { ascending: true });

      if (error) throw error;

      setCacheProducts(data || []);

      // Extract unique categories and brands
      const uniqueCategories = [...new Set((data || []).map(p => p.category).filter(Boolean))];
      const uniqueBrands = [...new Set((data || []).map(p => p.brand).filter(Boolean))];
      setCategories(uniqueCategories.sort());
      setBrands(uniqueBrands.sort());

    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setImportLoading(false);
    }
  };

  const openImportDialog = async () => {
    setShowImportDialog(true);
    setSelectedSkus(new Set());
    setImportFilter({ category: '', brand: '', search: '' });
    await loadCacheProducts();
  };

  // Calculate point price with margin formula
  const calculatePointPrice = (costPrice: number): number => {
    return Math.ceil((costPrice + 1000) / 500) * 500;
  };

  // Filter cache products based on filters
  const filteredCacheProducts = cacheProducts.filter(p => {
    if (importFilter.category && p.category !== importFilter.category) return false;
    if (importFilter.brand && p.brand !== importFilter.brand) return false;
    if (importFilter.search) {
      const search = importFilter.search.toLowerCase();
      if (!p.product_name.toLowerCase().includes(search) && 
          !p.buyer_sku_code.toLowerCase().includes(search)) {
        return false;
      }
    }
    return true;
  });

  // Get brands for selected category
  const filteredBrands = importFilter.category
    ? [...new Set(cacheProducts.filter(p => p.category === importFilter.category).map(p => p.brand).filter(Boolean))].sort()
    : brands;

  const toggleSelectSku = (sku: string) => {
    const newSelected = new Set(selectedSkus);
    if (newSelected.has(sku)) {
      newSelected.delete(sku);
    } else {
      newSelected.add(sku);
    }
    setSelectedSkus(newSelected);
  };

  const selectAllFiltered = () => {
    const newSelected = new Set(selectedSkus);
    filteredCacheProducts
      .filter(p => !existingSkus.has(p.buyer_sku_code))
      .forEach(p => newSelected.add(p.buyer_sku_code));
    setSelectedSkus(newSelected);
  };

  const deselectAllFiltered = () => {
    const newSelected = new Set(selectedSkus);
    filteredCacheProducts.forEach(p => newSelected.delete(p.buyer_sku_code));
    setSelectedSkus(newSelected);
  };

  const handleImport = async () => {
    if (selectedSkus.size === 0) {
      toast({ title: 'Peringatan', description: 'Pilih minimal 1 produk untuk diimport', variant: 'destructive' });
      return;
    }

    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('digiflazz-import-products', {
        body: { skus: Array.from(selectedSkus), mode: 'selected' }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to import');
      }

      toast({ 
        title: 'Import Berhasil', 
        description: data.message 
      });

      setShowImportDialog(false);
      fetchProducts();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const productData = {
        name: formData.name,
        description: formData.description || null,
        type: formData.type,
        ppob_type: formData.type === 'ppob' ? formData.ppob_type : null,
        digiflazz_sku: formData.type === 'ppob' ? formData.digiflazz_sku : null,
        cost_price: formData.cost_price,
        point_price: formData.point_price,
        stock: formData.type === 'physical' ? formData.stock : -1,
        is_active: formData.is_active,
        requires_shipping: formData.type === 'physical',
        requires_input: formData.requires_input || null,
        image_url: formData.image_url || null
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Produk berhasil diupdate' });
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);
        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Produk berhasil ditambahkan' });
      }

      setShowForm(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      type: product.type,
      ppob_type: product.ppob_type || '',
      digiflazz_sku: product.digiflazz_sku || '',
      cost_price: product.cost_price,
      point_price: product.point_price,
      stock: product.stock,
      is_active: product.is_active,
      requires_shipping: product.requires_shipping,
      requires_input: product.requires_input || '',
      image_url: product.image_url || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus produk ini?')) return;
    
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) {
        // Check for foreign key constraint error
        if (error.message.includes('violates foreign key constraint') || 
            error.code === '23503') {
          toast({ 
            title: 'Tidak dapat menghapus', 
            description: 'Produk ini memiliki order yang terkait. Nonaktifkan produk saja jika tidak ingin dijual lagi.', 
            variant: 'destructive' 
          });
          return;
        }
        throw error;
      }
      
      toast({ title: 'Berhasil', description: 'Produk berhasil dihapus' });
      fetchProducts();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const toggleActive = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);
      if (error) throw error;
      fetchProducts();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      type: 'ppob',
      ppob_type: '',
      digiflazz_sku: '',
      cost_price: 0,
      point_price: 0,
      stock: -1,
      is_active: true,
      requires_shipping: false,
      requires_input: '',
      image_url: ''
    });
  };

  // Extract brands for selected PPOB category
  const brandsForPpobCategory = useMemo(() => {
    if (!selectedPpobCategory) return [];
    
    const categoryProducts = products.filter(p => 
      p.type === 'ppob' && p.ppob_type === selectedPpobCategory
    );
    
    const brandSet = new Set<string>();
    categoryProducts.forEach(p => {
      brandSet.add(getPpobBrandFromProductName(p.name));
    });
    
    return Array.from(brandSet).sort();
  }, [products, selectedPpobCategory]);

  // Filtered products for PPOB based on hierarchy
  const filteredPpobProducts = useMemo(() => {
    if (ppobMenuLevel !== 'products') return [];
    
    let filtered = products.filter(p => p.type === 'ppob');
    
    if (selectedPpobCategory) {
      filtered = filtered.filter(p => p.ppob_type === selectedPpobCategory);
    }
    
    if (selectedPpobBrand) {
      const selected = canonicalizePpobBrand(selectedPpobBrand);
      filtered = filtered.filter(p => {
        return getPpobBrandFromProductName(p.name) === selected;
      });
    }
    
    // Sort by point price ascending
    return filtered.sort((a, b) => a.point_price - b.point_price);
  }, [products, ppobMenuLevel, selectedPpobCategory, selectedPpobBrand]);

  const filteredPhysicalProducts = products.filter(p => p.type === 'physical')
    .sort((a, b) => a.point_price - b.point_price);

  // PPOB navigation handlers
  const handlePpobCategorySelect = (categoryId: string) => {
    setSelectedPpobCategory(categoryId);
    if (categoryId === 'token_pln') {
      // PLN only has one "brand", go directly to products
      setSelectedPpobBrand('PLN');
      setPpobMenuLevel('products');
    } else {
      setPpobMenuLevel('brand');
    }
  };

  const handlePpobBrandSelect = (brand: string) => {
    setSelectedPpobBrand(brand);
    setPpobMenuLevel('products');
  };

  const handlePpobBack = () => {
    if (ppobMenuLevel === 'products') {
      if (selectedPpobCategory === 'token_pln') {
        setPpobMenuLevel('category');
        setSelectedPpobCategory(null);
        setSelectedPpobBrand(null);
      } else {
        setPpobMenuLevel('brand');
        setSelectedPpobBrand(null);
      }
    } else if (ppobMenuLevel === 'brand') {
      setPpobMenuLevel('category');
      setSelectedPpobCategory(null);
    }
  };

  const getPpobPageTitle = () => {
    if (ppobMenuLevel === 'category') return 'Pilih Kategori PPOB';
    if (ppobMenuLevel === 'brand') {
      const cat = ppobCategories.find(c => c.id === selectedPpobCategory);
      return `Pilih Provider ${cat?.label || ''}`;
    }
    if (ppobMenuLevel === 'products') {
      return selectedPpobBrand || 'Produk';
    }
    return 'PPOB';
  };

  const getBrandIcon = (brand: string) => {
    return <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
      {brand.charAt(0)}
    </div>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Manajemen Produk</h2>
          <p className="text-muted-foreground">Kelola produk PPOB dan fisik</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={syncFromDigiflazz} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sync Digiflazz
          </Button>
          <Button variant="outline" onClick={openImportDialog}>
            <Download className="w-4 h-4 mr-2" />
            Import dari Digiflazz
          </Button>
          <Button onClick={() => { 
            resetForm(); 
            setFormData(prev => ({ ...prev, type: activeTab === 'physical' ? 'physical' : 'ppob' }));
            setShowForm(true); 
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Produk {activeTab === 'physical' ? 'Fisik' : 'PPOB'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ppob">PPOB</TabsTrigger>
          <TabsTrigger value="physical">Produk Fisik</TabsTrigger>
        </TabsList>

        <TabsContent value="ppob" className="mt-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                {ppobMenuLevel !== 'category' && (
                  <Button variant="ghost" size="icon" onClick={handlePpobBack}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                )}
                <CardTitle className="text-lg">{getPpobPageTitle()}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {/* Category Selection */}
              {ppobMenuLevel === 'category' && (
                <div className="grid grid-cols-3 gap-4">
                  {ppobCategories.map((cat) => (
                    <Card 
                      key={cat.id}
                      className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                      onClick={() => handlePpobCategorySelect(cat.id)}
                    >
                      <CardContent className="p-6 flex flex-col items-center text-center">
                        <div className="p-4 bg-primary/10 rounded-xl text-primary mb-3">
                          {cat.icon}
                        </div>
                        <span className="font-medium">{cat.label}</span>
                        <span className="text-sm text-muted-foreground mt-1">
                          {products.filter(p => p.type === 'ppob' && p.ppob_type === cat.ppob_type).length} produk
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground mt-2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Brand Selection */}
              {ppobMenuLevel === 'brand' && (
                <div className="grid grid-cols-4 gap-3">
                  {brandsForPpobCategory.map((brand) => (
                    <Card 
                      key={brand}
                      className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                      onClick={() => handlePpobBrandSelect(brand)}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        {getBrandIcon(brand)}
                        <div className="flex-1">
                          <span className="font-medium">{brand}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                  {brandsForPpobCategory.length === 0 && (
                    <div className="col-span-4 text-center py-8 text-muted-foreground">
                      Belum ada produk di kategori ini
                    </div>
                  )}
                </div>
              )}

              {/* Products Table */}
              {ppobMenuLevel === 'products' && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>SKU Digiflazz</TableHead>
                      <TableHead>Harga Modal</TableHead>
                      <TableHead>Harga Poin</TableHead>
                      <TableHead>Margin</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredPpobProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Belum ada produk di brand ini
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPpobProducts.map((product, index) => (
                        <TableRow key={product.id}>
                          <TableCell className="text-muted-foreground font-medium">{index + 1}</TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{product.digiflazz_sku || '-'}</TableCell>
                          <TableCell>{formatCurrency(product.cost_price)}</TableCell>
                          <TableCell>{product.point_price.toLocaleString()} poin</TableCell>
                          <TableCell>{formatCurrency(product.point_price - product.cost_price)}</TableCell>
                          <TableCell>
                            <Switch 
                              checked={product.is_active} 
                              onCheckedChange={() => toggleActive(product)}
                              disabled={!isSuperAdmin}
                            />
                          </TableCell>
                          <TableCell>
                            {isSuperAdmin && (
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="physical" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Harga Modal</TableHead>
                    <TableHead>Harga Poin</TableHead>
                    <TableHead>Margin</TableHead>
                    <TableHead>Stok</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredPhysicalProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Belum ada produk fisik
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPhysicalProducts.map((product, index) => (
                      <TableRow key={product.id}>
                        <TableCell className="text-muted-foreground font-medium">{index + 1}</TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{product.description || '-'}</TableCell>
                        <TableCell>{formatCurrency(product.cost_price)}</TableCell>
                        <TableCell>{product.point_price.toLocaleString()} poin</TableCell>
                        <TableCell>{formatCurrency(product.point_price - product.cost_price)}</TableCell>
                        <TableCell>{product.stock === -1 ? '∞' : product.stock}</TableCell>
                        <TableCell>
                          <Switch 
                            checked={product.is_active} 
                            onCheckedChange={() => toggleActive(product)}
                            disabled={!isSuperAdmin}
                          />
                        </TableCell>
                        <TableCell>
                          {isSuperAdmin && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Product Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Produk' : 'Tambah Produk'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipe Produk</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ppob">PPOB</SelectItem>
                  <SelectItem value="physical">Produk Fisik</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nama Produk</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required 
              />
            </div>

            {formData.type === 'ppob' && (
              <>
                <div className="space-y-2">
                  <Label>Tipe PPOB</Label>
                  <Select 
                    value={formData.ppob_type} 
                    onValueChange={(v) => setFormData({ ...formData, ppob_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pulsa">Pulsa</SelectItem>
                      <SelectItem value="data">Paket Data</SelectItem>
                      <SelectItem value="pln">Token PLN</SelectItem>
                      <SelectItem value="emoney">E-Money</SelectItem>
                      <SelectItem value="game">Voucher Game</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>SKU Digiflazz</Label>
                  <Input 
                    value={formData.digiflazz_sku} 
                    onChange={(e) => setFormData({ ...formData, digiflazz_sku: e.target.value })}
                    placeholder="xld10, gopay25k, etc"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Input Yang Diperlukan</Label>
                  <Input 
                    value={formData.requires_input} 
                    onChange={(e) => setFormData({ ...formData, requires_input: e.target.value })}
                    placeholder="phone, meter_number, etc"
                  />
                </div>
              </>
            )}

            {formData.type === 'physical' && (
              <>
                <div className="space-y-2">
                  <Label>Deskripsi</Label>
                  <Textarea 
                    value={formData.description} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Stok (-1 untuk unlimited)</Label>
                  <Input 
                    type="number"
                    value={formData.stock} 
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>URL Gambar</Label>
                  <Input 
                    value={formData.image_url} 
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Harga Modal (Rp)</Label>
                <Input 
                  type="number"
                  value={formData.cost_price} 
                  onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Harga Poin</Label>
                <Input 
                  type="number"
                  value={formData.point_price} 
                  onChange={(e) => setFormData({ ...formData, point_price: parseFloat(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch 
                checked={formData.is_active} 
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
              <Label>Aktif</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Batal
              </Button>
              <Button type="submit">
                {editingProduct ? 'Update' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Produk dari Digiflazz</DialogTitle>
          </DialogHeader>

          {importLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2">Memuat data produk...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4 py-4">
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Select 
                    value={importFilter.category || '__all__'} 
                    onValueChange={(v) => setImportFilter({ ...importFilter, category: v === '__all__' ? '' : v, brand: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Semua kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Semua kategori</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <Select 
                    value={importFilter.brand || '__all__'} 
                    onValueChange={(v) => setImportFilter({ ...importFilter, brand: v === '__all__' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Semua brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Semua brand</SelectItem>
                      {filteredBrands.map(brand => (
                        <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cari</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      value={importFilter.search}
                      onChange={(e) => setImportFilter({ ...importFilter, search: e.target.value })}
                      placeholder="Cari nama atau SKU..."
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              {/* Selection info and buttons */}
              <div className="flex items-center justify-between py-2 border-y">
                <div className="text-sm text-muted-foreground">
                  Menampilkan {filteredCacheProducts.length} produk, {selectedSkus.size} terpilih
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllFiltered}>
                    <Check className="w-4 h-4 mr-1" />
                    Pilih Semua
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAllFiltered}>
                    Batal Pilih Semua
                  </Button>
                </div>
              </div>

              {/* Product list */}
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Nama Produk</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Harga Modal</TableHead>
                      <TableHead>Harga Poin</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCacheProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Tidak ada produk ditemukan. Klik "Sync Digiflazz" terlebih dahulu.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCacheProducts.map(product => {
                        const isExisting = existingSkus.has(product.buyer_sku_code);
                        const isSelected = selectedSkus.has(product.buyer_sku_code);
                        const pointPrice = calculatePointPrice(product.price);
                        
                        return (
                          <TableRow 
                            key={product.buyer_sku_code}
                            className={isExisting ? 'opacity-50' : 'cursor-pointer hover:bg-muted/50'}
                            onClick={() => !isExisting && toggleSelectSku(product.buyer_sku_code)}
                          >
                            <TableCell>
                              <Checkbox 
                                checked={isSelected}
                                disabled={isExisting}
                                onCheckedChange={() => toggleSelectSku(product.buyer_sku_code)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{product.product_name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{product.buyer_sku_code}</TableCell>
                            <TableCell>{product.category}</TableCell>
                            <TableCell>{product.brand}</TableCell>
                            <TableCell>{formatCurrency(product.price)}</TableCell>
                            <TableCell className="text-primary font-medium">{pointPrice.toLocaleString()} poin</TableCell>
                            <TableCell>
                              {isExisting ? (
                                <span className="text-xs bg-muted px-2 py-1 rounded">Sudah ada</span>
                              ) : (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Baru</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setShowImportDialog(false)}>
                  Batal
                </Button>
                <Button onClick={handleImport} disabled={importing || selectedSkus.size === 0}>
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Mengimport...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Import {selectedSkus.size} Produk
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductManagement;
