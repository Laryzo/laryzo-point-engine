import { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { Plus, RefreshCw, Edit, Trash2, Loader2 } from 'lucide-react';

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

interface ProductManagementProps {
  isSuperAdmin?: boolean;
}

const ProductManagement = ({ isSuperAdmin = false }: ProductManagementProps) => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState('ppob');

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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
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
        body: { cmd: 'prepaid' }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to sync');
      }

      toast({ 
        title: 'Sync Berhasil', 
        description: `Ditemukan ${data.count} produk dari Digiflazz. Silakan tambahkan produk yang diinginkan secara manual.` 
      });

      console.log('Digiflazz products:', data.data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
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
      if (error) throw error;
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

  const filteredProducts = products.filter(p => 
    activeTab === 'ppob' ? p.type === 'ppob' : p.type === 'physical'
  );

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
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>SKU Digiflazz</TableHead>
                    <TableHead>Tipe</TableHead>
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
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Belum ada produk PPOB
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map(product => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.digiflazz_sku || '-'}</TableCell>
                        <TableCell>{product.ppob_type || '-'}</TableCell>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="physical" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
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
                      <TableCell colSpan={8} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Belum ada produk fisik
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map(product => (
                      <TableRow key={product.id}>
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
    </div>
  );
};

export default ProductManagement;
