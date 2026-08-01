
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, HelpCircle, Home } from 'lucide-react';
import AdminRegister from '@/components/AdminRegister';
import { ForgotPasswordModal } from '@/components/ForgotPasswordModal';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { login, isFirstAdmin } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Show admin register if no admins exist
  if (isFirstAdmin) {
    return <AdminRegister />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await login(email, password);
    
    if (error) {
      toast({
        title: t("Login Gagal", "Login Failed"),
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: t("Login Berhasil", "Login Successful"),
        description: t("Selamat datang di Laryzo Point Engine", "Welcome to Laryzo Point Engine"),
      });
      navigate('/dashboard');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
      
      <div className="absolute top-4 left-4 z-10">
        <Button asChild size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0 hover:from-cyan-600 hover:to-blue-600 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-300 font-medium">
          <Link to="/">
            <Home className="w-4 h-4 mr-2" />
            {t("Home", "Home")}
          </Link>
        </Button>
      </div>
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/50 backdrop-blur-xl shadow-2xl z-10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            <LogIn className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl text-white">{t("Laryzo Point Engine", "Laryzo Point Engine")}</CardTitle>
          <CardDescription className="text-slate-400">{t("Login Admin Dashboard", "Admin Dashboard Login")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("Email", "Email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@laryzo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("Password", "Password")}</Label>
              <PasswordInput
                id="password"
                placeholder={t("Masukkan password", "Enter your password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/20" disabled={loading}>
              {loading ? t("Memproses...", "Logging in...") : t("Masuk", "Login")}
            </Button>
          </form>
          
          {/* Forgot Password Links */}
          <div className="mt-4 flex justify-center">
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowForgotPassword(true)}
              className="p-0 h-auto font-normal text-sm text-slate-400 hover:text-cyan-400"
            >
              <HelpCircle className="w-4 h-4 mr-1" />
              {t("Lupa Password atau Email?", "Forgot Password or Email?")}
            </Button>
          </div>
          
        </CardContent>
      </Card>
      
      {/* Forgot Password Modal */}
      <ForgotPasswordModal 
        open={showForgotPassword} 
        onOpenChange={setShowForgotPassword} 
      />
    </div>
  );
};

export default Login;
