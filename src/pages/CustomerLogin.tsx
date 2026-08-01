import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Coins, Home } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const CustomerLogin = () => {
  const navigate = useNavigate();
  const { login, register } = useCustomerAuth();
  const { t } = useLanguage();
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regWhatsapp, setRegWhatsapp] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    const result = await login(loginEmail, loginPassword);
    
    if (result.error) {
      toast({
        title: t('Login Gagal', 'Login Failed'),
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('Login Berhasil', 'Login Successful'),
        description: t('Selamat datang kembali!', 'Welcome back!'),
      });
      navigate('/portal');
    }
    
    setLoginLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (regPassword !== regConfirmPassword) {
      toast({
        title: t('Error', 'Error'),
        description: t('Password tidak cocok', 'Passwords do not match'),
        variant: 'destructive',
      });
      return;
    }

    if (regPassword.length < 6) {
      toast({
        title: t('Error', 'Error'),
        description: t('Password minimal 6 karakter', 'Password must be at least 6 characters'),
        variant: 'destructive',
      });
      return;
    }

    setRegLoading(true);

    const result = await register(regName, regEmail, regPassword, regWhatsapp);
    
    if (result.error) {
      toast({
        title: t('Registrasi Gagal', 'Registration Failed'),
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('Registrasi Berhasil', 'Registration Successful'),
        description: t('Akun Anda telah dibuat!', 'Your account has been created!'),
      });
      navigate('/portal');
    }
    
    setRegLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tl from-indigo-500/20 to-purple-500/10 rounded-full blur-[150px]" />
      <div className="absolute top-[50%] left-[50%] w-[40%] h-[40%] bg-gradient-to-br from-cyan-400/10 to-blue-500/5 rounded-full blur-[120px]" />
      
      <div className="absolute top-4 left-4 z-20">
        <Button asChild size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 font-medium">
          <Link to="/">
            <Home className="w-4 h-4 mr-2" />
            {t('Home', 'Home')}
          </Link>
        </Button>
      </div>
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-md border-slate-700 bg-slate-800/60 backdrop-blur-2xl shadow-2xl z-10 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/10 shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-emerald-500/30">
              <Coins className="h-8 w-8 text-emerald-400" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Laryzo Point
          </CardTitle>
          <CardDescription className="text-slate-400 mt-2">{t('Customer Portal - Kelola Poin Anda', 'Customer Portal - Manage Your Points')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-700/50 border border-slate-600">
              <TabsTrigger 
                value="login"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white transition-all duration-200"
              >
                {t('Masuk', 'Login')}
              </TabsTrigger>
              <TabsTrigger 
                value="register"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white transition-all duration-200"
              >
                {t('Daftar', 'Register')}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-slate-300">{t('Email', 'Email')}</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="email@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/30 transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-slate-300">{t('Password', 'Password')}</Label>
                  <PasswordInput
                    id="login-password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/30"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-200"
                  disabled={loginLoading}
                >
                  {loginLoading ? t('Memproses...', 'Processing...') : t('Masuk', 'Login')}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register" className="mt-6">
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="reg-name" className="text-slate-300">{t('Nama Lengkap', 'Full Name')}</Label>
                  <Input
                    id="reg-name"
                    type="text"
                    placeholder={t('Nama Anda', 'Your Name')}
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/30 transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email" className="text-slate-300">{t('Email', 'Email')}</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="email@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/30 transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-whatsapp" className="text-slate-300">{t('WhatsApp', 'WhatsApp')}</Label>
                  <Input
                    id="reg-whatsapp"
                    type="tel"
                    placeholder={t('08xxxxxxxxxx', '08xxxxxxxxxx')}
                    value={regWhatsapp}
                    onChange={(e) => setRegWhatsapp(e.target.value)}
                    required
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/30 transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="text-slate-300">{t('Password', 'Password')}</Label>
                  <PasswordInput
                    id="reg-password"
                    placeholder={t('Minimal 6 karakter', 'Min. 6 characters')}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-confirm" className="text-slate-300">{t('Konfirmasi Password', 'Confirm Password')}</Label>
                  <PasswordInput
                    id="reg-confirm"
                    placeholder={t('Ulangi password', 'Repeat password')}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    required
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/30"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-200"
                  disabled={regLoading}
                >
                  {regLoading ? t('Memproses...', 'Processing...') : t('Daftar', 'Register')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerLogin;
