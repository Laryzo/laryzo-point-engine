import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Check, ExternalLink, FileText, Loader2, RefreshCw, ShieldCheck, X } from 'lucide-react';

interface PendingCustomerIdentity {
  id: string;
  customer_id: string;
  legal_name: string;
  national_id: string;
  status: string;
  submitted_at: string;
  documents: Record<string, string | null>;
}

interface PendingDriverApplication {
  id: string;
  customer_id: string;
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
  vehicle_year: number;
  vehicle_plate: string;
  stnk_number: string;
  stnk_expiry: string;
  skck_number: string;
  skck_expiry: string;
  submitted_at: string;
  documents: Record<string, string | null>;
}

const IdentityReviewManagement = () => {
  const { toast } = useToast();
  const [customerRows, setCustomerRows] = useState<PendingCustomerIdentity[]>([]);
  const [driverRows, setDriverRows] = useState<PendingDriverApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const loadPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await supabase.auth.refreshSession();
      const { data, error: functionError } = await supabase.functions.invoke('identity-verification', {
        body: { action: 'admin_list_pending' },
      });
      if (functionError) throw new Error(functionError.message || 'Daftar verifikasi tidak dapat dimuat.');
      if (!data?.success) throw new Error(data?.error || 'Daftar verifikasi tidak dapat dimuat.');
      setCustomerRows(data.customer_submissions || []);
      setDriverRows(data.driver_applications || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Daftar verifikasi tidak dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPending(); }, [loadPending]);

  const review = async (recordType: 'customer' | 'driver', recordId: string, status: 'approved' | 'rejected') => {
    const key = `${recordType}:${recordId}`;
    const reviewNotes = notes[key]?.trim() || '';
    if (status === 'rejected' && reviewNotes.length < 5) {
      toast({ title: 'Alasan penolakan diperlukan', description: 'Tuliskan catatan minimal 5 karakter.', variant: 'destructive' });
      return;
    }

    setBusyId(key);
    try {
      await supabase.auth.refreshSession();
      const { data, error: functionError } = await supabase.functions.invoke('identity-verification', {
        body: { action: 'admin_review', record_type: recordType, record_id: recordId, status, review_notes: reviewNotes },
      });
      if (functionError) throw new Error(functionError.message || 'Perubahan status tidak dapat disimpan.');
      if (!data?.success) throw new Error(data?.error || 'Perubahan status tidak dapat disimpan.');
      toast({ title: status === 'approved' ? 'Berkas disetujui' : 'Berkas ditolak' });
      await loadPending();
    } catch (reviewError) {
      toast({
        title: 'Pemeriksaan belum tersimpan',
        description: reviewError instanceof Error ? reviewError.message : 'Silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const documentLinks = (documents: Record<string, string | null>) => (
    <div className="flex flex-wrap gap-2">
      {Object.entries(documents).map(([label, url]) => url && (
        <Button key={label} type="button" variant="outline" size="sm" asChild>
          <a href={url} target="_blank" rel="noreferrer">
            <FileText className="mr-2 h-4 w-4" /> {label} <ExternalLink className="ml-2 h-3.5 w-3.5" />
          </a>
        </Button>
      ))}
    </div>
  );

  const rejectionField = (key: string) => (
    <Textarea
      rows={2}
      maxLength={500}
      placeholder="Catatan untuk pemohon jika berkas perlu diperbaiki"
      value={notes[key] || ''}
      onChange={(event) => setNotes((current) => ({ ...current, [key]: event.target.value }))}
    />
  );

  const reviewButtons = (recordType: 'customer' | 'driver', recordId: string) => {
    const key = `${recordType}:${recordId}`;
    const busy = busyId === key;
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" disabled={busy || loading} onClick={() => void review(recordType, recordId, 'rejected')}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />} Tolak
        </Button>
        <Button type="button" disabled={busy || loading} onClick={() => void review(recordType, recordId, 'approved')}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Setujui
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold"><ShieldCheck className="h-6 w-6 text-primary" /> Verifikasi Identitas</h2>
          <p className="mt-1 text-sm text-muted-foreground">Berkas identitas hanya tersedia untuk pemeriksa berwenang.</p>
        </div>
        <Button variant="outline" onClick={() => void loadPending()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Muat ulang
        </Button>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers">KTP Customer <Badge variant="secondary" className="ml-2">{customerRows.length}</Badge></TabsTrigger>
          <TabsTrigger value="drivers">Pendaftaran Driver <Badge variant="secondary" className="ml-2">{driverRows.length}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-4">
          {loading && <p className="py-8 text-center text-sm text-muted-foreground">Memuat berkas...</p>}
          {!loading && customerRows.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Tidak ada verifikasi KTP yang menunggu.</p>}
          {customerRows.map((row) => {
            const key = `customer:${row.id}`;
            return (
              <Card key={row.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{row.legal_name}</CardTitle>
                      <CardDescription className="mt-1">NIK {row.national_id} · Diajukan {new Date(row.submitted_at).toLocaleString('id-ID')}</CardDescription>
                    </div>
                    <Badge variant="outline">Menunggu</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {documentLinks(row.documents || {})}
                  {rejectionField(key)}
                  {reviewButtons('customer', row.id)}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="drivers" className="space-y-4">
          {loading && <p className="py-8 text-center text-sm text-muted-foreground">Memuat berkas...</p>}
          {!loading && driverRows.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Tidak ada pendaftaran driver yang menunggu.</p>}
          {driverRows.map((row) => {
            const key = `driver:${row.id}`;
            return (
              <Card key={row.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{row.legal_name}</CardTitle>
                      <CardDescription className="mt-1">NIK {row.national_id} · {row.whatsapp} · {row.email}</CardDescription>
                    </div>
                    <Badge variant="outline">Menunggu</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    <div><dt className="text-muted-foreground">Alamat</dt><dd>{row.address}</dd></div>
                    <div><dt className="text-muted-foreground">SIM</dt><dd>{row.sim_type} · {row.sim_number} · sampai {row.sim_expiry}</dd></div>
                    <div><dt className="text-muted-foreground">Kendaraan</dt><dd>{row.vehicle_type} · {row.vehicle_make} {row.vehicle_model} ({row.vehicle_year}) · {row.vehicle_plate}</dd></div>
                    <div><dt className="text-muted-foreground">STNK / pajak</dt><dd>{row.stnk_number} · sampai {row.stnk_expiry}</dd></div>
                    <div><dt className="text-muted-foreground">SKCK</dt><dd>{row.skck_number} · sampai {row.skck_expiry}</dd></div>
                    <div><dt className="text-muted-foreground">Dikirim</dt><dd>{new Date(row.submitted_at).toLocaleString('id-ID')}</dd></div>
                  </dl>
                  {documentLinks(row.documents || {})}
                  {rejectionField(key)}
                  {reviewButtons('driver', row.id)}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IdentityReviewManagement;