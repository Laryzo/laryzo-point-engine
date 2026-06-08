import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Store, Home, ArrowLeft } from 'lucide-react';

const MerchantRegister = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    whatsapp: '',
    business_name: '',
    business_address: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('merchant-register', {
        body: formData
      });

      if (error) {
        const errorAny = error as unknown as { context?: { status?: number } };
        const status = errorAny?.context?.status;
        const description =
          error.message === 'Failed to send a request to the Edge Function'
            ? 'Gagal menghubungi server pendaftaran. Pastikan koneksi internet dan konfigurasi Supabase sudah benar.'
            : status
              ? `${error.message} (HTTP ${status})`
              : (error.message || 'Terjadi kesalahan saat mendaftar');

        toast({
          title: 'Pendaftaran Gagal',
          description,
          variant: 'destructive',
        });
      } else if (data?.error) {
        toast({
          title: 'Pendaftaran Gagal',
          description: data.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Pendaftaran Berhasil',
          description: 'Akun mitra Anda telah dibuat. Silakan login.',
        });
        navigate('/mitra/login');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal menghubungi server';
      toast({
        title: 'Kesalahan Sistem',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-500/10 via-background to-amber-500/10 p-4 py-12">
      <div className="absolute top-4 left-4 flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/">
            <Home className="w-4 h-4 mr-2" />
            Home
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to="/mitra/login">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Login
          </Link>
        </Button>
      </div>
      
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-orange-500/10">
              <Store className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Daftar Mitra Laryzo</CardTitle>
          <CardDescription>Bergabunglah sebagai mitra UMKM dan mulai kelola poin pelanggan Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input
                  id="name"
                  placeholder="Nama Anda"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">No. WhatsApp</Label>
                <Input
                  id="whatsapp"
                  placeholder="08123456789"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-medium mb-3">Informasi Bisnis</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="business_name">Nama Bisnis / Toko</Label>
                  <Input
                    id="business_name"
                    placeholder="Nama Toko Anda"
                    value={formData.business_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_address">Alamat Bisnis</Label>
                  <Textarea
                    id="business_address"
                    placeholder="Alamat lengkap toko"
                    value={formData.business_address}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={loading}>
              {loading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
            </Button>
          </form>
          
          <div className="text-sm text-center mt-6">
            <span className="text-muted-foreground">Sudah punya akun? </span>
            <Link to="/mitra/login" className="text-orange-600 font-medium hover:underline">
              Masuk di sini
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MerchantRegister;
