import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail, Phone, Key, Clock } from 'lucide-react';

interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ForgotPasswordModal = ({ open, onOpenChange }: ForgotPasswordModalProps) => {
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const { toast } = useToast();

  const handleRequestReset = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Masukkan email Anda",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('auth-reset-request', {
        body: { email }
      });

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Token reset password telah dikirim ke email Anda. Token berlaku selama 15 menit.",
      });
      
      setStep('reset');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal mengirim reset password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverEmail = async () => {
    if (!whatsapp) {
      toast({
        title: "Error",
        description: "Masukkan nomor WhatsApp Anda",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('auth-recover-email', {
        body: { whatsapp }
      });

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Email terkait nomor WhatsApp Anda telah dikirim (jika nomor ditemukan).",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal mencari email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetToken || !newPassword) {
      toast({
        title: "Error",
        description: "Masukkan token dan password baru",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Konfirmasi password tidak sesuai",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password minimal 6 karakter",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('auth-reset-password', {
        body: { 
          token: resetToken,
          newPassword,
          email 
        }
      });

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Password berhasil direset. Silakan login dengan password baru.",
      });
      
      onOpenChange(false);
      setStep('request');
      setEmail('');
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal mereset password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setWhatsapp('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setStep('request');
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      onOpenChange(newOpen);
      if (!newOpen) resetForm();
    }}>
      <DialogContent className="sm:max-w-[500px]">
        {step === 'request' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Lupa Password/Email
              </DialogTitle>
              <DialogDescription>
                Pilih metode untuk memulihkan akses Anda
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="password" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="password">Lupa Password</TabsTrigger>
                <TabsTrigger value="email">Lupa Email</TabsTrigger>
              </TabsList>
              
              <TabsContent value="password">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Mail className="w-4 h-4" />
                      Reset Password
                    </CardTitle>
                    <CardDescription>
                      Masukkan email Anda untuk menerima token reset password
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="admin@laryzo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      Token berlaku selama 15 menit
                    </div>
                    <Button 
                      onClick={handleRequestReset}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? "Mengirim..." : "Kirim Token Reset"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="email">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Phone className="w-4 h-4" />
                      Pulihkan Email
                    </CardTitle>
                    <CardDescription>
                      Masukkan nomor WhatsApp untuk mencari email terkait
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="recover-whatsapp">Nomor WhatsApp</Label>
                      <Input
                        id="recover-whatsapp"
                        type="tel"
                        placeholder="08123456789"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                      />
                    </div>
                    <Button 
                      onClick={handleRecoverEmail}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? "Mencari..." : "Cari Email"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Reset Password
              </DialogTitle>
              <DialogDescription>
                Masukkan token yang dikirim ke email dan password baru Anda
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="reset-token">Token Reset</Label>
                <Input
                  id="reset-token"
                  placeholder="Masukkan token dari email"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="new-password">Password Baru</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Konfirmasi Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Ulangi password baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                Token berlaku selama 15 menit dari waktu dikirim
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('request')}>
                Kembali
              </Button>
              <Button 
                onClick={handleResetPassword}
                disabled={loading}
              >
                {loading ? "Mereset..." : "Reset Password"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};