import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useCustomerIdentity } from '@/hooks/useCustomerIdentity';
import { uploadIdentityDocument } from '@/lib/identity-documents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Clock3, LockKeyhole, RefreshCw, ShieldCheck, Upload, XCircle } from 'lucide-react';

const CustomerIdentityVerification = () => {
  const { customer } = useCustomerAuth();
  const { customer_identity: identity, loading, error, refresh } = useCustomerIdentity();
  const { toast } = useToast();
  const [legalName, setLegalName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!identity) return;
    setLegalName(identity.legal_name || '');
    setNationalId(identity.national_id || '');
  }, [identity]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customer?.id) return;
    if (!/^\d{16}$/.test(nationalId)) {
      toast({ title: 'NIK belum valid', description: 'Masukkan 16 angka sesuai KTP.', variant: 'destructive' });
      return;
    }
    if (!ktpFile) {
      toast({ title: 'Foto KTP diperlukan', description: 'Pilih foto atau PDF KTP yang terlihat jelas.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      await supabase.auth.refreshSession();
      const ktpPath = await uploadIdentityDocument(customer.id, 'customer-kyc', 'ktp', ktpFile);
      const { data, error: submitError } = await supabase.functions.invoke('identity-verification', {
        body: { action: 'submit_customer', legal_name: legalName.trim(), national_id: nationalId, ktp_path: ktpPath },
      });
      if (submitError) throw new Error(submitError.message || 'Pengajuan tidak dapat dikirim.');
      if (!data?.success) throw new Error(data?.error || 'Pengajuan tidak dapat dikirim.');
      setKtpFile(null);
      toast({ title: 'Pengajuan terkirim', description: 'Verifikasi KTP menunggu pemeriksaan Admin.' });
      await refresh();
    } catch (submitError) {
      toast({
        title: 'Pengajuan belum berhasil',
        description: submitError instanceof Error ? submitError.message : 'Silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const status = identity?.status;
  const statusBadge = status === 'approved'
    ? <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Full Service</Badge>
    : status === 'pending'
      ? <Badge variant="outline" className="gap-1"><Clock3 className="h-3.5 w-3.5" /> Menunggu pemeriksaan</Badge>
      : status === 'rejected'
        ? <Badge variant="destructive" className="gap-1"><XCircle className="h-3.5 w-3.5" /> Perlu diperbaiki</Badge>
        : <Badge variant="outline">Belum terverifikasi</Badge>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Verifikasi Identitas
            </CardTitle>
            <CardDescription>Verifikasi satu kali untuk membuka layanan Full Service.</CardDescription>
          </div>
          {statusBadge}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <LockKeyhole className="h-4 w-4" />
          <AlertDescription>
            Data KTP hanya digunakan untuk keamanan akun dan diperiksa oleh Super Admin. Verifikasi tidak memberikan bonus poin.
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>{error}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
                <RefreshCw className="mr-2 h-4 w-4" /> Coba lagi
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {status === 'approved' ? (
          <div className="flex items-start gap-3 rounded-md border p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium">Akun Full Service aktif</p>
              <p className="text-sm text-muted-foreground">Akun Anda dapat menggunakan fitur yang memerlukan verifikasi identitas.</p>
            </div>
          </div>
        ) : status === 'pending' ? (
          <div className="rounded-md border p-4">
            <p className="font-medium">Berkas sedang diperiksa</p>
            <p className="mt-1 text-sm text-muted-foreground">Anda tetap dapat menggunakan layanan digital dan menerima poin jaringan selama menunggu.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {identity?.review_notes && (
              <Alert variant="destructive">
                <AlertDescription>Catatan pemeriksaan: {identity.review_notes}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="identity-legal-name">Nama lengkap sesuai KTP</Label>
                <Input
                  id="identity-legal-name"
                  autoComplete="name"
                  maxLength={120}
                  value={legalName}
                  onChange={(event) => setLegalName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="identity-national-id">NIK (16 angka)</Label>
                <Input
                  id="identity-national-id"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={16}
                  pattern="[0-9]{16}"
                  value={nationalId}
                  onChange={(event) => setNationalId(event.target.value.replace(/\D/g, '').slice(0, 16))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="identity-ktp-file">Foto KTP yang jelas</Label>
              <Input
                id="identity-ktp-file"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => setKtpFile(event.target.files?.[0] || null)}
                required
              />
              <p className="text-xs text-muted-foreground">JPG, PNG, WebP, atau PDF; maksimal 8 MB.</p>
              {ktpFile && <p className="text-sm text-muted-foreground">Berkas dipilih: {ktpFile.name}</p>}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="max-w-xl text-sm text-muted-foreground">
                Full Service diperlukan untuk belanja fisik mitra dengan poin dan layanan driver.
              </p>
              <Button type="submit" disabled={submitting || loading || Boolean(error)}>
                {submitting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {submitting ? 'Mengirim...' : status === 'rejected' ? 'Kirim ulang verifikasi' : 'Kirim verifikasi'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerIdentityVerification;