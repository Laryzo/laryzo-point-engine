import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, User, Mail, Phone, Lock, Save, Loader2, MapPin, Navigation, Home } from 'lucide-react';

const CustomerProfile = () => {
  const navigate = useNavigate();
  const { customer, refreshCustomer } = useCustomerAuth();
  const { toast } = useToast();

  const [name, setName] = useState(customer?.name || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [whatsapp, setWhatsapp] = useState(customer?.whatsapp || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [latitude, setLatitude] = useState<string>(customer?.latitude?.toString() || '');
  const [longitude, setLongitude] = useState<string>(customer?.longitude?.toString() || '');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: 'Error', description: 'Browser tidak mendukung GPS', variant: 'destructive' });
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGettingLocation(false);
        toast({ title: 'Berhasil', description: 'Lokasi GPS berhasil diambil' });
      },
      (err) => {
        setGettingLocation(false);
        toast({ title: 'Error', description: 'Gagal mengambil lokasi: ' + err.message, variant: 'destructive' });
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    // Validate required fields
    if (!name.trim() || !email.trim() || !whatsapp.trim() || !address.trim()) {
      toast({ title: 'Error', description: 'Semua field wajib diisi', variant: 'destructive' });
      return;
    }

    if (!latitude || !longitude) {
      toast({ title: 'Error', description: 'Titik lokasi GPS wajib diisi. Gunakan tombol "Gunakan Lokasi Saya" atau tentukan di Google Maps.', variant: 'destructive' });
      return;
    }

    setSavingProfile(true);

    try {
      const { error: customerError } = await supabase
        .from('customers')
        .update({ 
          name, 
          email, 
          whatsapp,
          address,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
        })
        .eq('id', customer.id);

      if (customerError) throw customerError;

      if (email !== customer.email) {
        const { error: authError } = await supabase
          .from('customer_auth')
          .update({ email })
          .eq('customer_id', customer.id);

        if (authError) throw authError;
      }

      await refreshCustomer();
      
      toast({
        title: 'Berhasil',
        description: 'Profil berhasil diperbarui',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Password baru tidak cocok', variant: 'destructive' });
      return;
    }

    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password minimal 6 karakter', variant: 'destructive' });
      return;
    }

    setSavingPassword(true);

    try {
      const { data, error } = await supabase.functions.invoke('customer-change-password', {
        body: { currentPassword, newPassword }
      });

      if (error) throw new Error(error.message || 'Gagal mengubah password');
      if (!data.success) throw new Error(data.error || 'Gagal mengubah password');

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      toast({ title: 'Berhasil', description: 'Password berhasil diubah' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSavingPassword(false);
    }
  };

  const googleMapsPickerUrl = latitude && longitude
    ? `https://www.google.com/maps?q=${latitude},${longitude}`
    : 'https://www.google.com/maps';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/portal')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Profil Saya</h1>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informasi Profil
            </CardTitle>
            <CardDescription>Lengkapi data profil Anda. Semua field wajib diisi.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nama Lengkap <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama lengkap Anda"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Nomor WhatsApp Aktif <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  required
                />
              </div>

              {/* Alamat Lengkap */}
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Alamat Lengkap <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Tulis alamat lengkap termasuk RT/RW, kelurahan, kecamatan, kota, dan kode pos agar driver mudah menemukan lokasi Anda
                </p>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Contoh: Jl. Melati No. 10 RT 03/RW 05, Kel. Sukamaju, Kec. Cibeunying, Kota Bandung 40123"
                  rows={3}
                  required
                />
              </div>

              {/* GPS Location */}
              <div className="space-y-2 border-t pt-4">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Titik Lokasi di Google Maps <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Tentukan titik lokasi rumah Anda agar saat memesan tinggal klik alamat rumah tanpa perlu mengetik ulang. Driver juga bisa navigasi langsung ke lokasi Anda.
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGetLocation}
                    disabled={gettingLocation}
                  >
                    {gettingLocation ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Mengambil Lokasi...
                      </>
                    ) : (
                      <>
                        <Navigation className="mr-2 h-4 w-4" />
                        Gunakan Lokasi Saya (GPS Otomatis)
                      </>
                    )}
                  </Button>
                  <a
                    href={googleMapsPickerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 text-sm text-primary underline hover:no-underline"
                  >
                    <MapPin className="h-4 w-4" />
                    Buka Google Maps untuk pilih titik lokasi manual
                  </a>
                </div>
                {latitude && longitude && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Latitude</Label>
                      <Input
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        className="text-xs"
                        placeholder="-6.2088"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Longitude</Label>
                      <Input
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        className="text-xs"
                        placeholder="106.8456"
                      />
                    </div>
                  </div>
                )}
                {latitude && longitude && (
                  <a
                    href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline flex items-center gap-1"
                  >
                    <MapPin className="h-3 w-3" /> Lihat lokasi saya di Google Maps
                  </a>
                )}
                {!latitude && !longitude && (
                  <p className="text-xs text-destructive">
                    ⚠️ Titik lokasi belum ditentukan. Klik tombol di atas untuk mengisi koordinat GPS.
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={savingProfile}>
                {savingProfile ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Simpan Perubahan
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Ubah Password
            </CardTitle>
            <CardDescription>Amankan akun dengan password baru</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Password Saat Ini</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Password Baru</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  required
                />
              </div>
              <Button type="submit" variant="secondary" className="w-full" disabled={savingPassword}>
                {savingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mengubah...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Ubah Password
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CustomerProfile;
