import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMerchantAuth } from '@/hooks/useMerchantAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Store, Home } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const MerchantLogin = () => {
  const navigate = useNavigate();
  const { login } = useMerchantAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(email, password);
    
    if (result.error) {
      toast({
        title: t('Login Gagal', 'Login Failed'),
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('Login Berhasil', 'Login Successful'),
        description: t('Selamat datang, Mitra!', 'Welcome, Partner!'),
      });
      navigate('/mitra');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden p-4">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />

      <div className="absolute top-4 left-4 z-10">
        <Button asChild size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0 hover:from-cyan-600 hover:to-blue-600 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-300 font-medium">
          <Link to="/">
            <Home className="w-4 h-4 mr-2" />
            {t('Home', 'Home')}
          </Link>
        </Button>
      </div>
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/50 backdrop-blur-xl shadow-2xl z-10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Store className="h-8 w-8 text-cyan-400" />
            </div>
          </div>
          <CardTitle className="text-2xl text-white">{t('Laryzo Mitra', 'Laryzo Partner')}</CardTitle>
          <CardDescription className="text-slate-400">{t('Portal POS untuk Mitra UMKM', 'POS Portal for SME Partners')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('Email', 'Email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('Password', 'Password')}</Label>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/20" disabled={loading}>
              {loading ? t('Memproses...', 'Processing...') : t('Masuk', 'Login')}
            </Button>
          </form>
          <div className="text-sm text-center mt-4 space-y-2">
            <p className="text-slate-400">
              {t('Belum punya akun mitra?', "Don't have a partner account?")}{' '}
              <Link to="/mitra/register" className="text-cyan-400 font-medium hover:underline">
                {t('Daftar di sini', 'Register here')}
              </Link>
            </p>
            <p className="text-xs text-muted-foreground">
              {t('Atau hubungi admin untuk bantuan pendaftaran', 'Or contact admin for registration help')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MerchantLogin;
