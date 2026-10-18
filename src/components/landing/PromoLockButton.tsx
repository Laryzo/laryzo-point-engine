import { useEffect, useState } from "react";
import { z } from "zod";
import { CalendarClock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export const PROMO_LOCK_EVENT = "open-promo-lock";

const PACKAGES = ["Paket 1 pcs", "Paket 6 pcs"];

function toWa62(raw: string) {
  const c = raw.replace(/[^0-9]/g, "");
  if (c.startsWith("0")) return "62" + c.slice(1);
  if (c.startsWith("62")) return c;
  return "62" + c;
}

const schema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 huruf").max(100),
  whatsapp: z.string().regex(/^62[0-9]{8,13}$/, "Nomor WhatsApp tidak valid"),
  package: z.string().min(1),
  pay_date: z.string().min(1, "Pilih tanggal rencana bayar"),
});

const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

export default function PromoLockButton({ adminWa }: { adminWa?: string | null }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", whatsapp: "", package: PACKAGES[0], pay_date: "" });

  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener(PROMO_LOCK_EVENT, h);
    return () => window.removeEventListener(PROMO_LOCK_EVENT, h);
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const max = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);

  const submit = async () => {
    const parsed = schema.safeParse({ ...form, whatsapp: toWa62(form.whatsapp) });
    if (!parsed.success) {
      toast({ title: "Periksa data", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("promo_reservations").insert(parsed.data as any);
    setLoading(false);
    if (error) {
      toast({ title: "Gagal menyimpan", description: "Silakan coba lagi.", variant: "destructive" });
      return;
    }
    const msg = `Halo Admin, saya mau amankan promo Sabun Multibeauty (${parsed.data.package}). Saya berencana bayar dan selesaikan pesanan pada tanggal ${fmtDate(parsed.data.pay_date)}. Mohon slot promonya dikunci atas nama ${parsed.data.name}. Terima kasih!`;
    setOpen(false);
    toast({ title: "Promo berhasil dikunci!", description: "Admin akan menghubungi Kakak di tanggal tersebut." });
    if (adminWa) window.open(`https://api.whatsapp.com/send?phone=${toWa62(adminWa)}&text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <>
      <div className="fixed bottom-4 left-4 z-40">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold shadow-lg hover:opacity-90"
        >
          <CalendarClock className="h-4 w-4" /> Belum Gajian? Kunci Promo
        </button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kunci Promo Sampai Gajian</DialogTitle>
            <DialogDescription>Harga promo Kakak kami amankan sampai tanggal rencana bayar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama Lengkap</Label><Input maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Nomor WhatsApp</Label><Input inputMode="tel" maxLength={16} placeholder="08xxxxxxxxxx" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
            <div>
              <Label>Pilihan Paket</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {PACKAGES.map((p) => (
                  <button key={p} type="button" onClick={() => setForm({ ...form, package: p })}
                    className={`rounded-md border px-2 py-2 text-xs ${form.package === p ? "border-primary bg-primary/10 font-semibold" : ""}`}>{p}</button>
                ))}
              </div>
            </div>
            <div><Label>Rencana Tanggal Bayar / Gajian</Label><Input type="date" min={today} max={max} value={form.pay_date} onChange={(e) => setForm({ ...form, pay_date: e.target.value })} /></div>
            <Button className="w-full" onClick={submit} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Amankan Promo via WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
