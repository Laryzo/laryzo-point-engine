import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, AlertTriangle, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import BankAccountManagement from '@/components/BankAccountManagement';

interface Setting {
  id: string;
  key: string;
  value: string;
  description: string | null;
}

const SystemSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Setting[]>([]);
  
  const [formData, setFormData] = useState<Record<string, string>>({
    point_to_rupiah: '100',
    min_order_points: '1000',
    digiflazz_mode: 'development',
    digiflazz_username: '',
    digiflazz_api_key: '',
    ppob_fallback_enabled: 'false',
    admin_ppob_wa_number: '',
    merchant_app_fee_percent: '5',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*');

      if (error) throw error;
      
      setSettings(data || []);
      
      // Map settings to form data
      const settingsMap = (data || []).reduce((acc: Record<string, string>, s: Setting) => {
        acc[s.key] = s.value;
        return acc;
      }, {});
      
      setFormData({
        point_to_rupiah: settingsMap.point_to_rupiah || '100',
        min_order_points: settingsMap.min_order_points || '1000',
        digiflazz_mode: settingsMap.digiflazz_mode || 'development',
        digiflazz_username: settingsMap.digiflazz_username || '',
        digiflazz_api_key: settingsMap.digiflazz_api_key || '',
        ppob_fallback_enabled: settingsMap.ppob_fallback_enabled || 'false',
        admin_ppob_wa_number: settingsMap.admin_ppob_wa_number || '',
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update or insert each setting
      for (const [key, value] of Object.entries(formData)) {
        // Try to update first
        const { data: existingData } = await supabase
          .from('system_settings')
          .select('id')
          .eq('key', key)
          .single();

        if (existingData) {
          // Update existing
          const { error } = await supabase
            .from('system_settings')
            .update({ value })
            .eq('key', key);
          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from('system_settings')
            .insert({ key, value, description: `Setting for ${key}` });
          if (error) throw error;
        }
      }
      
      toast({ title: 'Berhasil', description: 'Pengaturan berhasil disimpan' });
      fetchSettings();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const isDevelopment = formData.digiflazz_mode === 'development';
  const [showUsername, setShowUsername] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Pengaturan Sistem</h2>
          <p className="text-muted-foreground">Konfigurasi sistem dan integrasi</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Simpan
        </Button>
      </div>

      <BankAccountManagement />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Point Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Pengaturan Poin</CardTitle>
            <CardDescription>Konfigurasi nilai dan minimum poin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nilai 1 Poin (Rupiah)</Label>
              <Input 
                type="number"
                value={formData.point_to_rupiah}
                onChange={(e) => setFormData({ ...formData, point_to_rupiah: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Contoh: 1 poin = Rp {parseInt(formData.point_to_rupiah).toLocaleString()}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Minimum Poin untuk Order</Label>
              <Input 
                type="number"
                value={formData.min_order_points}
                onChange={(e) => setFormData({ ...formData, min_order_points: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Customer harus memiliki minimal {parseInt(formData.min_order_points).toLocaleString()} poin untuk melakukan order
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Digiflazz Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Pengaturan Digiflazz</CardTitle>
            <CardDescription>Konfigurasi API Digiflazz untuk PPOB</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Mode Production</Label>
                <p className="text-sm text-muted-foreground">
                  {isDevelopment ? 'Saat ini: Mode Testing' : 'Saat ini: Mode Production'}
                </p>
              </div>
              <Switch 
                checked={!isDevelopment}
                onCheckedChange={(checked) => setFormData({ 
                  ...formData, 
                  digiflazz_mode: checked ? 'production' : 'development' 
                })}
              />
            </div>

            {isDevelopment && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Mode testing aktif. Transaksi tidak akan diproses secara nyata oleh Digiflazz.
                </AlertDescription>
              </Alert>
            )}

            {!isDevelopment && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Mode production aktif. Semua transaksi akan diproses secara nyata dan menggunakan saldo Digiflazz Anda.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Digiflazz Credentials */}
        <Card>
          <CardHeader>
            <CardTitle>Kredensial Digiflazz API</CardTitle>
            <CardDescription>Masukkan kredensial API Digiflazz Anda di bawah ini</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                <strong>Keamanan Kredensial:</strong>
                <ul className="list-disc list-inside mt-2 text-sm">
                  <li>Jangan bagikan kredensial dengan siapapun</li>
                  <li>Matikan screen sharing saat memasukkan kredensial</li>
                  <li>Rotasi API Key secara berkala</li>
                </ul>
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label>Username Digiflazz</Label>
              <div className="relative">
                <Input 
                  type={showUsername ? "text" : "password"}
                  value={formData.digiflazz_username || ''}
                  onChange={(e) => setFormData({ ...formData, digiflazz_username: e.target.value })}
                  placeholder="Masukkan username Digiflazz"
                  autoComplete="off"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowUsername(!showUsername)}
                >
                  {showUsername ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Username dari akun Digiflazz Anda
              </p>
            </div>
            <div className="space-y-2">
              <Label>API Key Digiflazz</Label>
              <div className="relative">
                <Input 
                  type={showApiKey ? "text" : "password"}
                  value={formData.digiflazz_api_key || ''}
                  onChange={(e) => setFormData({ ...formData, digiflazz_api_key: e.target.value })}
                  placeholder="Masukkan API Key Digiflazz"
                  autoComplete="off"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                API Key dari akun Digiflazz Anda (Production/Development sesuai mode)
              </p>
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Pastikan menggunakan API Key yang sesuai dengan mode yang dipilih. Gunakan API Key Development untuk testing dan API Key Production untuk transaksi nyata.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* PPOB WhatsApp Fallback */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Fallback PPOB ke WhatsApp Admin</CardTitle>
            <CardDescription>
              Jika Digiflazz tidak bisa diakses (jaringan/IP whitelist), pesanan customer akan dialihkan ke admin via WhatsApp untuk diproses manual — bukan langsung digagalkan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Aktifkan Fallback WhatsApp</Label>
                <p className="text-sm text-muted-foreground">
                  Saat aktif: order PPOB yang gagal ke Digiflazz akan berstatus "Menunggu Admin" dan poin tidak di-refund otomatis.
                </p>
              </div>
              <Switch
                checked={formData.ppob_fallback_enabled === 'true'}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, ppob_fallback_enabled: checked ? 'true' : 'false' })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Nomor WhatsApp Admin PPOB</Label>
              <Input
                type="tel"
                value={formData.admin_ppob_wa_number || ''}
                onChange={(e) =>
                  setFormData({ ...formData, admin_ppob_wa_number: e.target.value.replace(/[^0-9]/g, '') })
                }
                placeholder="628xxxxxxxxxx"
                inputMode="numeric"
              />
              <p className="text-sm text-muted-foreground">
                Format internasional tanpa +, contoh: 6281234567890. Customer akan diarahkan ke nomor ini.
              </p>
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Setelah memproses manual, admin wajib menandai order sebagai "Sukses" atau "Gagal" di menu Pesanan agar poin terdistribusi atau direfund.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Point Distribution Info */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Formula Distribusi Poin</CardTitle>
            <CardDescription>Bagaimana poin didistribusikan dari setiap transaksi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Customer (Level 0)</h4>
                <p className="text-2xl font-bold text-primary">1%</p>
                <p className="text-sm text-muted-foreground">dari profit transaksi</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Upline (Level 1-10)</h4>
                <p className="text-2xl font-bold text-primary">1% per level</p>
                <p className="text-sm text-muted-foreground">maksimal 10 level upline</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Total Distribusi</h4>
                <p className="text-2xl font-bold text-primary">Max 11%</p>
                <p className="text-sm text-muted-foreground">1% customer + 10% upline</p>
              </div>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <p><strong>Contoh:</strong> Jika profit dari transaksi adalah Rp 10.000:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Customer mendapat: Rp 100 (1%)</li>
                <li>Upline level 1 mendapat: Rp 100 (1%)</li>
                <li>Upline level 2 mendapat: Rp 100 (1%)</li>
                <li>... dan seterusnya hingga level 10</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemSettings;
