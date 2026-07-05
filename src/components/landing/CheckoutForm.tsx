import { useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import MapLocationPicker from "@/components/MapLocationPicker";
import { CheckCircle2, Loader2, MapPin, Copy, ArrowRight, Sparkles } from "lucide-react";

const formSchema = z.object({
  name: z.string().trim().min(2).max(100),
  whatsapp: z.string().trim().min(10).max(20),
  email: z.string().trim().email().max(255),
  qty: z.number().int().min(1).max(999),
  address: z.string().trim().min(5).max(500),
  latitude: z.string().min(1),
  longitude: z.string().min(1),
  notes: z.string().max(500).optional(),
});

const idr = (n: number) => "Rp " + n.toLocaleString("id-ID");

export default function CheckoutForm({
  price,
  buttonText,
  primaryColor,
  disabled,
}: {
  price: number;
  buttonText: string;
  primaryColor: string;
  disabled?: boolean;
}) {
  const [form, setForm] = useState({
    name: "", whatsapp: "", email: "", qty: 1,
    address: "", latitude: "", longitude: "", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<null | {
    orderId: string; isNew: boolean; email?: string; password?: string; total: number; qty: number;
  }>(null);

  const total = useMemo(() => price * (form.qty || 1), [price, form.qty]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) {
      toast({ title: "Mode preview", description: "Form dinonaktifkan di mode preview." });
      return;
    }
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Data belum lengkap", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("multibeauty-checkout", {
        body: { ...form, latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSuccess({
        orderId: data.order_id, isNew: data.is_new_account,
        email: data.credentials?.email, password: data.credentials?.password,
        total: data.total, qty: data.qty,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast({ title: "Gagal membuat pesanan", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const copy = (t: string) => { navigator.clipboard.writeText(t); toast({ title: "Tersalin", description: t }); };

  if (success) {
    return (
      <Card className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-bold">Pesanan Diterima!</h3>
          <p className="text-muted-foreground">Admin akan segera menghubungi Anda via WhatsApp.</p>
        </div>
        <div className="rounded-lg border bg-emerald-50/50 p-4 space-y-1 text-sm">
          <div className="flex justify-between"><span>No. Order</span><span className="font-mono font-semibold">{success.orderId.slice(0,8)}…</span></div>
          <div className="flex justify-between"><span>Jumlah</span><span className="font-semibold">{success.qty} pcs</span></div>
          <div className="flex justify-between text-base pt-1 border-t mt-2"><span>Total</span><span className="font-bold">{idr(success.total)}</span></div>
        </div>
        {success.isNew && success.email && success.password && (
          <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-amber-900"><Sparkles className="w-4 h-4"/> Akun Laryzo Siap!</div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 bg-white rounded border px-3 py-2">
                <span className="w-16 text-muted-foreground">Email</span>
                <span className="flex-1 font-mono truncate">{success.email}</span>
                <button onClick={() => copy(success.email!)}><Copy className="w-4 h-4"/></button>
              </div>
              <div className="flex items-center gap-2 bg-white rounded border px-3 py-2">
                <span className="w-16 text-muted-foreground">Password</span>
                <span className="flex-1 font-mono font-bold">{success.password}</span>
                <button onClick={() => copy(success.password!)}><Copy className="w-4 h-4"/></button>
              </div>
            </div>
          </div>
        )}
        <Button asChild size="lg" style={{ backgroundColor: primaryColor }} className="w-full text-white">
          <a href="/portal/login">Login ke Portal <ArrowRight className="w-4 h-4 ml-1"/></a>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 md:p-8 shadow-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Nama Lengkap *</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={100} />
          </div>
          <div>
            <Label htmlFor="wa">WhatsApp *</Label>
            <Input id="wa" placeholder="08xxxxxxxxxx" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} required />
          </div>
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required maxLength={255} />
          <p className="text-xs text-muted-foreground mt-1">Digunakan untuk login portal Laryzo</p>
        </div>
        <div>
          <Label htmlFor="qty">Jumlah (pcs) *</Label>
          <Input id="qty" type="number" min={1} max={999} value={form.qty} onChange={(e) => setForm({ ...form, qty: parseInt(e.target.value) || 1 })} required />
        </div>
        <div>
          <Label htmlFor="address">Alamat Pengiriman *</Label>
          <Textarea id="address" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required maxLength={500} />
        </div>
        <div>
          <Label className="flex items-center gap-1"><MapPin className="w-4 h-4"/> Pin Lokasi *</Label>
          <MapLocationPicker
            latitude={form.latitude}
            longitude={form.longitude}
            onSave={(lat, lng) => { setForm((f) => ({ ...f, latitude: lat, longitude: lng })); toast({ title: "Lokasi tersimpan" }); }}
          />
          {form.latitude && form.longitude && <p className="text-xs text-emerald-700 mt-1">✓ {form.latitude}, {form.longitude}</p>}
        </div>
        <div>
          <Label htmlFor="notes">Catatan (opsional)</Label>
          <Textarea id="notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={500} />
        </div>
        <div className="rounded-lg bg-emerald-50 border p-4 space-y-1 text-sm">
          <div className="flex justify-between"><span>Harga per pcs</span><span>{idr(price)}</span></div>
          <div className="flex justify-between"><span>Jumlah</span><span>{form.qty || 1} pcs</span></div>
          <div className="flex justify-between text-base font-bold pt-2 border-t"><span>Total</span><span>{idr(total)}</span></div>
        </div>
        <Button type="submit" disabled={submitting} size="lg" style={{ backgroundColor: primaryColor }} className="w-full text-white">
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Memproses...</> : <>{buttonText} · {idr(total)}</>}
        </Button>
      </form>
    </Card>
  );
}
