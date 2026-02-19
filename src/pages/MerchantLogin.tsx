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

const MerchantLogin = () => {
  const navigate = useNavigate();
  const { login } = useMerchantAuth();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(email, password);
    
    if (result.error) {
      toast({
        title: 'Login Gagal',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Login Berhasil',
        description: 'Selamat datang, Mitra!',
      });
      navigate('/mitra');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-500/10 via-background to-amber-500/10 p-4">
      <div className="absolute top-4 left-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/">
            <Home className="w-4 h-4 mr-2" />
            Home
          </Link>
        </Button>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-orange-500/10">
              <Store className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Laryzo Mitra</CardTitle>
          <CardDescription>Portal POS untuk Mitra UMKM</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={loading}>
              {loading ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground text-center mt-4">
            Hubungi admin untuk mendaftarkan akun Mitra
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MerchantLogin;
