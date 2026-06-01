import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Disetujui', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-800' },
};

const AdminTopupRequests = () => {
  const { admin } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [selected, setSelected] = useState<any>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from('topup_requests')
      .select('*, customers:customer_id (name, email, whatsapp)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (filter === 'pending') q = q.eq('status', 'pending');
    const { data } = await q;
    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(Number(n || 0));
  const fmtDate = (s: string) => new Date(s).toLocaleString('id-ID');

  const submit = async () => {
    if (!selected || !action || !admin?.email) return;
    setProcessing(true);
    try {
      await supabase.auth.refreshSession();
      const { data, error } = await supabase.functions.invoke('wallet-topup-resolve', {
        body: { request_id: selected.id, action, admin_email: admin.email, admin_notes: notes },
      });
      if (error || !data?.success) {
        toast.error(data?.error || error?.message || 'Gagal');
        return;
      }
      toast.success(action === 'approve' ? 'Disetujui & saldo masuk' : 'Ditolak');
      setSelected(null); setAction(null); setNotes('');
      load();
    } finally {
      setProcessing(false);
    }
  };
  const isSuperAdmin = admin?.role === 'super_admin';

  const handleDelete = async (r: any) => {
    if (!isSuperAdmin) return;
    if (!confirm(`Hapus riwayat top up ${r.customers?.name || ''} (Rp ${fmt(r.amount)})? Tindakan ini tidak dapat dibatalkan.`)) return;
    const { error } = await supabase.from('topup_requests').delete().eq('id', r.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Riwayat top up dihapus');
    setRequests((prev) => prev.filter((x) => x.id !== r.id));
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Permintaan Top Up</h2>
        <div className="flex gap-2">
          <Button variant={filter === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('pending')}>
            Menunggu
          </Button>
          <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>
            Semua
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin inline" /></div>
      ) : requests.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Tidak ada permintaan</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const s = statusMap[r.status] || statusMap.pending;
            const bank = r.bank_snapshot || {};
            return (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{r.customers?.name}</p>
                      <p className="text-xs text-muted-foreground">{r.customers?.email} · {r.customers?.whatsapp}</p>
                    </div>
                    <Badge className={s.color}>{s.label}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Transfer</p>
                      <p className="font-bold text-primary">Rp {fmt(r.transfer_amount)} <span className="text-xs">(unik {r.unique_code})</span></p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Bank Tujuan</p>
                      <p className="text-sm">{bank.bank_name} {bank.account_number} a.n. {bank.account_holder}</p>
                    </div>
                    <div className="col-span-2 text-xs text-muted-foreground">
                      Dibuat: {fmtDate(r.created_at)}
                      {r.customer_confirmed_at && <> · Konfirmasi: {fmtDate(r.customer_confirmed_at)}</>}
                      {r.processed_at && <> · Diproses: {fmtDate(r.processed_at)} oleh {r.processed_by}</>}
                    </div>
                    {r.admin_notes && <div className="col-span-2 text-xs italic">Catatan: {r.admin_notes}</div>}
                  </div>
                  {r.status === 'pending' ? (
                    <div className="flex gap-2 pt-2 border-t flex-wrap">
                      <Button size="sm" className="flex-1" onClick={() => { setSelected(r); setAction('approve'); }}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" className="flex-1" onClick={() => { setSelected(r); setAction('reject'); }}>
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                      {isSuperAdmin && (
                        <Button size="sm" variant="outline" onClick={() => handleDelete(r)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ) : isSuperAdmin && (
                    <div className="flex pt-2 border-t">
                      <Button size="sm" variant="outline" className="ml-auto" onClick={() => handleDelete(r)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Hapus Riwayat
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected && !!action} onOpenChange={(v) => { if (!v) { setSelected(null); setAction(null); setNotes(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action === 'approve' ? 'Setujui Top Up' : 'Tolak Top Up'}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <p className="text-sm">
                {selected.customers?.name} - Rp {fmt(selected.amount)} (transfer Rp {fmt(selected.transfer_amount)})
              </p>
              <Textarea
                placeholder="Catatan (opsional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              {action === 'approve' && (
                <p className="text-xs text-green-700 bg-green-50 p-2 rounded">
                  Saldo customer akan otomatis bertambah Rp {fmt(selected.amount)}.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelected(null); setAction(null); setNotes(''); }}>Batal</Button>
            <Button onClick={submit} disabled={processing} variant={action === 'reject' ? 'destructive' : 'default'}>
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTopupRequests;
