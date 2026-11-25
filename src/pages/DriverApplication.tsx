import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useCustomerIdentity } from '@/hooks/useCustomerIdentity';
import { DriverDocumentKey, MAX_IDENTITY_FILE_BYTES, uploadIdentityDocument } from '@/lib/identity-documents';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle2, Clock3, FileCheck2, Loader2, ShieldCheck, Upload, XCircle } from 'lucide-react';

interface DriverForm {
  legal_name: string;
  national_id: string;
  whatsapp: string;
  email: string;
  address: string;
  sim_type: string;
  sim_number: string;
  sim_expiry: string;
  vehicle_type: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: string;
  vehicle_plate: string;
  stnk_number: string;
  stnk_expiry: string;
  skck_number: string;
  skck_expiry: string;
}

const emptyForm: DriverForm = {
  legal_name: '', national_id: '', whatsapp: '', email: '', address: '',
  sim_type: '', sim_number: '', sim_expiry: '', vehicle_type: '', vehicle_make: '',
  vehicle_model: '', vehicle_year: '', vehicle_plate: '', stnk_number: '',
  stnk_expiry: '', skck_number: '', skck_expiry: '',
};

const documentFields: { key: DriverDocumentKey; label: string; allowPdf: boolean }[] = [
  { key: 'ktp', label: 'Foto KTP', allowPdf: true },
  { key: 'selfie', label: 'Pas foto diri driver', allowPdf: false },
  { key: 'sim', label: 'Foto SIM', allowPdf: true },
  { key: 'stnk', label: 'Foto STNK', allowPdf: true },
  { key: 'vehicle', label: 'Foto kendaraan dengan plat terlihat', allowPdf: false },
  { key: 'skck', label: 'Foto SKCK yang masih berlaku', allowPdf: true },
];

const today = () => new Date().toISOString().slice(0, 10);

const DriverApplication = () => {
  const navigate = useNavigate();
  const { customer } = useCustomerAuth();
  const { driver_application: application, loading, error, refresh } = useCustomerIdentity();
  const { toast } = useToast();
  const [form, setForm] = useState<DriverForm>(emptyForm);
  const [files, setFiles] = useState<Partial<Record<DriverDocumentKey, File>>>({});
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (application) {
      setForm({
        legal_name: application.legal_name || '',
        national_id: application.national_id || '',
        whatsapp: application.whatsapp || '',
        email: application.email || '',
        address: application.address || '',
        sim_type: application.sim_type || '',
        sim_number: application.sim_number || '',
        sim_expiry: application.sim_expiry || '',
        vehicle_type: application.vehicle_type || '',
        vehicle_make: application.vehicle_make || '',
        vehicle_model: application.vehicle_model || '',
        vehicle_year: application.vehicle_year ? String(application.vehicle_year) : '',
        vehicle_plate: application.vehicle_plate || '',
        stnk_number: application.stnk_number || '',
        stnk_expiry: application.stnk_expiry || '',
        skck_number: application.skck_number || '',
        skck_expiry: application.skck_expiry || '',
      });
    } else if (customer) {
      setForm((current) => ({
        ...current,
        legal_name: current.legal_name || customer.name || '',
        whatsapp: current.whatsapp || customer.whatsapp || '',
        email: current.email || customer.email || '',
        address: current.address || customer.address || '',
      }));
    }
  }, [application, customer]);

  const updateForm = <K extends keyof DriverForm>(key: K, value: DriverForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const selectedVehicle = useMemo(() => form.vehicle_type, [form.vehicle_type]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customer?.id) return;
    if (!/^\d{16}$/.test(form.national_id)) {
      toast({ title: 'NIK belum valid', description: 'Masukkan 16 angka sesuai KTP.', variant: 'destructive' });
      return;
    }
    if (form.vehicle_year && (Number(form.vehicle_year) < 1980 || Number(form.vehicle_year) > new Date().getFullYear() + 1)) {
      toast({ title: 'Tahun kendaraan belum valid', variant: 'destructive' });
      return;
    }
    if ([form.sim_expiry, form.stnk_expiry, form.skck_expiry].some((date) => !date || date < today())) {
      toast({ title: 'Masa berlaku dokumen sudah lewat', description: 'SIM, STNK, dan SKCK harus masih berlaku.', variant: 'destructive' });
      return;
    }
    const missingDocument = documentFields.find(({ key }) => !files[key]);
    if (missingDocument) {
      toast({ title: 'Dokumen belum lengkap', description: `${missingDocument.label} wajib diunggah saat mendaftar.`, variant: 'destructive' });
      return;
    }
    for (const key of ['selfie', 'vehicle'] as const) {
      if (files[key] && !files[key]?.type.startsWith('image/')) {
        toast({ title: 'Foto diperlukan', description: 'Pas foto dan foto kendaraan harus berupa gambar.', variant: 'destructive' });
        return;
      }
    }
    if (!agree) {
      toast({ title: 'Persetujuan diperlukan', description: 'Konfirmasi kebenaran data sebelum mengirim.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      await supabase.auth.refreshSession();
      for (const { key, label } of documentFields) {
        const file = files[key];
        if (!file) throw new Error(`${label} belum dipilih.`);
        if (file.size > MAX_IDENTITY_FILE_BYTES) throw new Error(`${label} maksimal 8 MB.`);
        await uploadIdentityDocument(customer.id, 'driver-applications', key, file);
      }

      const { data, error: submitError } = await supabase.functions.invoke('identity-verification', {
        body: {
          action: 'submit_driver',
          ...form,
          vehicle_year: Number(form.vehicle_year),
          agree_to_accuracy: agree,
        },
      });
      if (submitError) throw new Error(submitError.message || 'Pendaftaran tidak dapat dikirim.');
      if (!data?.success) throw new Error(data?.error || 'Pendaftaran tidak dapat dikirim.');
      setFiles({});
      setAgree(false);
      toast({ title: 'Pendaftaran terkirim', description: 'Dokumen driver menunggu pemeriksaan Super Admin.' });
      await refresh();
    } catch (submitError) {
      toast({
        title: 'Pendaftaran belum berhasil',
        description: submitError instanceof Error ? submitError.message : 'Silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const status = application?.status;
  const statusBadge = status === 'approved'
    ? <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Disetujui</Badge>
    : status === 'pending'
      ? <Badge variant="outline" className="gap-1"><Clock3 className="h-3.5 w-3.5" /> Menunggu pemeriksaan</Badge>
      : status === 'rejected'
        ? <Badge variant="destructive" className="gap-1"><XCircle className="h-3.5 w-3.5" /> Perlu diperbaiki</Badge>
        : <Badge variant="outline">Belum mendaftar</Badge>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/portal')} aria-label="Kembali ke beranda">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold">Pendaftaran Driver</h1>
            <p className="text-xs text-muted-foreground">Lengkapi seluruh dokumen dalam satu pengajuan</p>
          </div>
          {statusBadge}
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              <span>{error}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>Coba lagi</Button>
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Memuat status pendaftaran...
          </div>
        ) : status === 'approved' || status === 'pending' ? (
          <Card>
            <CardContent className="flex items-start gap-3 p-6">
              {status === 'approved' ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" /> : <Clock3 className="mt-0.5 h-5 w-5 text-muted-foreground" />}
              <div>
                <h2 className="font-semibold">{status === 'approved' ? 'Pendaftaran disetujui' : 'Dokumen sedang diperiksa'}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {status === 'approved'
                    ? 'Anda akan mendapat informasi berikutnya dari Admin mengenai tahap operasional driver.'
                    : 'Semua berkas sudah diterima. Tunggu hasil pemeriksaan sebelum mengirim perubahan.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Data pengemudi</CardTitle>
                <CardDescription>Masukkan data persis seperti yang tercantum pada dokumen resmi.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="driver-legal-name">Nama lengkap sesuai KTP</Label>
                  <Input id="driver-legal-name" maxLength={120} value={form.legal_name} onChange={(event) => updateForm('legal_name', event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driver-national-id">NIK (16 angka)</Label>
                  <Input id="driver-national-id" inputMode="numeric" maxLength={16} pattern="[0-9]{16}" value={form.national_id} onChange={(event) => updateForm('national_id', event.target.value.replace(/\D/g, '').slice(0, 16))} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driver-whatsapp">Nomor WhatsApp</Label>
                  <Input id="driver-whatsapp" type="tel" maxLength={30} value={form.whatsapp} onChange={(event) => updateForm('whatsapp', event.target.value)} required />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="driver-email">Email</Label>
                  <Input id="driver-email" type="email" maxLength={255} value={form.email} onChange={(event) => updateForm('email', event.target.value)} required />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="driver-address">Alamat domisili</Label>
                  <Textarea id="driver-address" maxLength={500} rows={3} value={form.address} onChange={(event) => updateForm('address', event.target.value)} required />
                </div>
              </CardContent>
            </Card>

            {status === 'rejected' && application?.review_notes && (
              <Alert variant="destructive"><AlertDescription>Catatan pemeriksaan: {application.review_notes}</AlertDescription></Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle>SIM dan kendaraan</CardTitle>
                <CardDescription>Masa berlaku harus masih aktif saat pendaftaran.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Jenis SIM</Label>
                  <Select value={form.sim_type} onValueChange={(value) => updateForm('sim_type', value)}>
                    <SelectTrigger><SelectValue placeholder="Pilih jenis SIM" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SIM C">SIM C</SelectItem>
                      <SelectItem value="SIM A">SIM A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driver-sim-number">Nomor SIM</Label>
                  <Input id="driver-sim-number" maxLength={40} value={form.sim_number} onChange={(event) => updateForm('sim_number', event.target.value)} required />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="driver-sim-expiry">Masa berlaku SIM</Label>
                  <Input id="driver-sim-expiry" type="date" min={today()} value={form.sim_expiry} onChange={(event) => updateForm('sim_expiry', event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Jenis kendaraan</Label>
                  <Select value={form.vehicle_type} onValueChange={(value) => {
                    updateForm('vehicle_type', value);
                    updateForm('sim_type', value === 'Motor' ? 'SIM C' : 'SIM A');
                  }}>
                    <SelectTrigger><SelectValue placeholder="Pilih kendaraan" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Motor">Motor</SelectItem>
                      <SelectItem value="Mobil">Mobil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driver-vehicle-make">Merek kendaraan</Label>
                  <Input id="driver-vehicle-make" maxLength={80} value={form.vehicle_make} onChange={(event) => updateForm('vehicle_make', event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driver-vehicle-model">Model/tipe kendaraan</Label>
                  <Input id="driver-vehicle-model" maxLength={80} value={form.vehicle_model} onChange={(event) => updateForm('vehicle_model', event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driver-vehicle-year">Tahun kendaraan</Label>
                  <Input id="driver-vehicle-year" type="number" min="1980" max={new Date().getFullYear() + 1} value={form.vehicle_year} onChange={(event) => updateForm('vehicle_year', event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driver-vehicle-plate">Nomor plat</Label>
                  <Input id="driver-vehicle-plate" maxLength={20} autoCapitalize="characters" value={form.vehicle_plate} onChange={(event) => updateForm('vehicle_plate', event.target.value.toUpperCase())} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driver-stnk-number">Nomor STNK</Label>
                  <Input id="driver-stnk-number" maxLength={40} value={form.stnk_number} onChange={(event) => updateForm('stnk_number', event.target.value)} required />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="driver-stnk-expiry">Masa berlaku pajak kendaraan pada STNK</Label>
                  <Input id="driver-stnk-expiry" type="date" min={today()} value={form.stnk_expiry} onChange={(event) => updateForm('stnk_expiry', event.target.value)} required />
                </div>
                {selectedVehicle && <p className="text-xs text-muted-foreground sm:col-span-2">Pastikan jenis SIM sesuai kendaraan yang didaftarkan.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SKCK dan foto dokumen</CardTitle>
                <CardDescription>Semua berkas wajib dikirim sekarang agar pendaftaran dapat diperiksa lengkap.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="driver-skck-number">Nomor SKCK</Label>
                    <Input id="driver-skck-number" maxLength={60} value={form.skck_number} onChange={(event) => updateForm('skck_number', event.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="driver-skck-expiry">Masa berlaku SKCK</Label>
                    <Input id="driver-skck-expiry" type="date" min={today()} value={form.skck_expiry} onChange={(event) => updateForm('skck_expiry', event.target.value)} required />
                  </div>
                </div>
                <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                  {documentFields.map(({ key, label, allowPdf }) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={`driver-file-${key}`}>{label} *</Label>
                      <Input
                        id={`driver-file-${key}`}
                        type="file"
                        accept={allowPdf ? 'image/jpeg,image/png,image/webp,application/pdf' : 'image/jpeg,image/png,image/webp'}
                        onChange={(event) => setFiles((current) => ({ ...current, [key]: event.target.files?.[0] }))}
                        required
                      />
                      {files[key] && <p className="truncate text-xs text-muted-foreground">{files[key]?.name}</p>}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Ukuran tiap berkas maksimal 8 MB. Foto diri dan kendaraan harus berupa gambar.</p>
                <label className="flex items-start gap-3 border-t pt-4 text-sm">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={agree} onChange={(event) => setAgree(event.target.checked)} />
                  <span>Saya menyatakan data sesuai dokumen asli dan menyetujui pemeriksaan berkas untuk keamanan layanan Laryzo.</span>
                </label>
              </CardContent>
            </Card>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="outline" onClick={() => navigate('/portal')}>Kembali</Button>
              <Button type="submit" disabled={submitting || loading || Boolean(error)}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {submitting ? 'Mengirim dokumen...' : status === 'rejected' ? 'Kirim ulang pendaftaran' : 'Kirim pendaftaran driver'}
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};

export default DriverApplication;