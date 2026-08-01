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
import { useLanguage } from '@/context/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const MerchantRegister = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
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
      console.log('Sending registration request for:', formData.email);
      const { data, error } = await supabase.functions.invoke('merchant-register', {
        body: formData
      });

      if (error) {
        console.error('Edge Function invocation error:', error);
        toast({
          title: t('Pendaftaran Gagal', 'Registration Failed'),
          description: error.message || t('Terjadi kesalahan saat mendaftar', 'An error occurred during registration'),
          variant: 'destructive',
        });
      } else if (data?.error) {
        toast({
          title: t('Pendaftaran Gagal', 'Registration Failed'),
          description: data.error,
          variant: 'destructive',
        });
      } else {
        if (data?.session) {
          // If the function returned a session, we could potentially log them in immediately
          // But for now, let's stick to the manual login to ensure all state is correctly initialized
          console.log('Session received, but redirecting to login for clean state');
        }
        toast({
          title: t('Pendaftaran Berhasil', 'Registration Successful'),
          description: t('Akun mitra Anda telah dibuat. Silakan login.', 'Your partner account has been created. Please login.'),
        });
        navigate('/mitra/login');
      }
    } catch (err) {
      console.error('Registration exception:', err);
      toast({
        title: t('Kesalahan Sistem', 'System Error'),
        description: t('Gagal menghubungi server', 'Failed to contact server'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-500/10 via-background to-amber-500/10 p-4 py-12">
      <div className="absolute top-4 left-4 flex gap-2">
        <Button asChild size="sm" className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-300 font-medium">
          <Link to="/">
            <Home className="w-4 h-4 mr-2" />
            {t('Home', 'Home')}
          </Link>
        </Button>
        <Button asChild size="sm" className="bg-slate-600/80 text-white border-0 hover:bg-slate-700 shadow-md hover:shadow-lg transition-all duration-300 font-medium">
          <Link to="/mitra/login">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('Kembali ke Login', 'Back to Login')}
          </Link>
        </Button>
      </div>
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-orange-500/10">
              <Store className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">{t('Daftar Mitra Laryzo', 'Register as Laryzo Partner')}</CardTitle>
          <CardDescription>{t('Bergabunglah sebagai mitra UMKM dan mulai kelola poin pelanggan Anda', 'Join as an SME partner and start managing customer points')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('Nama Lengkap', 'Full Name')}</Label>
                <Input
                  id="name"
                  placeholder={t('Nama Anda', 'Your Name')}
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">{t('No. WhatsApp', 'WhatsApp No.')}</Label>
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
                <Label htmlFor="email">{t('Email', 'Email')}</Label>
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
                <Label htmlFor="password">{t('Password', 'Password')}</Label>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-medium mb-3">{t('Informasi Bisnis', 'Business Information')}</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="business_name">{t('Nama Bisnis / Toko', 'Business / Store Name')}</Label>
                  <Input
                    id="business_name"
                    placeholder={t('Nama Toko Anda', 'Your Store Name')}
                    value={formData.business_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_address">{t('Alamat Bisnis', 'Business Address')}</Label>
                  <Textarea
                    id="business_address"
                    placeholder={t('Alamat lengkap toko', 'Full store address')}
                    value={formData.business_address}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={loading}>
              {loading ? t('Mendaftarkan...', 'Registering...') : t('Daftar Sekarang', 'Register Now')}
            </Button>
          </form>
          
          <div className="text-sm text-center mt-6">
            <span className="text-muted-foreground">{t('Sudah punya akun? ', 'Already have an account? ')}</span>
            <Link to="/mitra/login" className="text-orange-600 font-medium hover:underline">
              {t('Masuk di sini', 'Login here')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MerchantRegister;
