import { useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import MapLocationPicker from "@/components/MapLocationPicker";
import {
  Leaf, Droplets, Sparkles, ShieldCheck, Award, CheckCircle2,
  Loader2, MessageCircle, MapPin, Copy, ArrowRight,
} from "lucide-react";

const PRICE = 75000;

// Auto-import all testimoni/legality images
const imageModules = import.meta.glob("@/assets/multibeauty/*.{png,jpeg,jpg}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const orderedImages = Object.entries(imageModules)
  .sort(([a], [b]) => {
    const na = parseInt(a.match(/image(\d+)/)?.[1] || "0");
    const nb = parseInt(b.match(/image(\d+)/)?.[1] || "0");
    return na - nb;
  })
  .map(([, url]) => url);

// image1 = hero cover, image3 = ants proof, the rest = testimoni gallery
const heroImage = orderedImages[0];
const antsImage = orderedImages[2];
const testimonials = orderedImages.slice(3);

const formSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  whatsapp: z.string().trim().min(10, "Nomor WhatsApp tidak valid").max(20),
  email: z.string().trim().email("Email tidak valid").max(255),
  qty: z.number().int().min(1).max(999),
  address: z.string().trim().min(5, "Alamat wajib diisi").max(500),
  latitude: z.string().min(1, "Pilih lokasi di peta"),
  longitude: z.string().min(1, "Pilih lokasi di peta"),
  notes: z.string().max(500).optional(),
});

const formatIDR = (n: number) => "Rp " + n.toLocaleString("id-ID");

const Multibeauty = () => {
  const [form, setForm] = useState({
    name: "", whatsapp: "", email: "", qty: 1,
    address: "", latitude: "", longitude: "", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [success, setSuccess] = useState<null | {
    orderId: string;
    isNew: boolean;
    email?: string;
    password?: string;
    total: number;
    qty: number;
  }>(null);

  const total = useMemo(() => PRICE * (form.qty || 1), [form.qty]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Data belum lengkap", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("multibeauty-checkout", {
        body: {
          ...form,
          latitude: parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSuccess({
        orderId: data.order_id,
        isNew: data.is_new_account,
        email: data.credentials?.email,
        password: data.credentials?.password,
        total: data.total,
        qty: data.qty,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast({
        title: "Gagal membuat pesanan",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Tersalin", description: text });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-amber-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-lg w-full p-8 space-y-6 border-emerald-200 shadow-xl">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-emerald-900">Pesanan Diterima!</h1>
            <p className="text-muted-foreground">
              Terima kasih. Admin akan segera menghubungi Anda via WhatsApp untuk konfirmasi pembayaran & pengiriman.
            </p>
          </div>

          <div className="rounded-lg border bg-emerald-50/50 p-4 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">No. Order</span><span className="font-mono font-semibold">{success.orderId.slice(0, 8)}…</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Jumlah</span><span className="font-semibold">{success.qty} pcs</span></div>
            <div className="flex justify-between text-base pt-1 border-t mt-2"><span>Total</span><span className="font-bold text-emerald-700">{formatIDR(success.total)}</span></div>
          </div>

          {success.isNew && success.email && success.password && (
            <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-semibold">
                <Sparkles className="w-4 h-4" /> Akun Laryzo Anda Siap!
              </div>
              <p className="text-sm text-amber-900/80">
                Anda otomatis terdaftar di jaringan Laryzo dan berhak mendapatkan poin bonus. Simpan kredensial berikut:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-white rounded border px-3 py-2 text-sm">
                  <span className="text-muted-foreground w-16">Email</span>
                  <span className="flex-1 font-mono truncate">{success.email}</span>
                  <button type="button" onClick={() => copy(success.email!)} className="text-amber-700 hover:text-amber-900"><Copy className="w-4 h-4" /></button>
                </div>
                <div className="flex items-center gap-2 bg-white rounded border px-3 py-2 text-sm">
                  <span className="text-muted-foreground w-16">Password</span>
                  <span className="flex-1 font-mono font-bold tracking-wider">{success.password}</span>
                  <button type="button" onClick={() => copy(success.password!)} className="text-amber-700 hover:text-amber-900"><Copy className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
              <a href="/portal/login">Login ke Portal Saya <ArrowRight className="w-4 h-4 ml-1" /></a>
            </Button>
            <Button variant="outline" onClick={() => { setSuccess(null); setForm({ name:"", whatsapp:"", email:"", qty:1, address:"", latitude:"", longitude:"", notes:"" }); }}>
              Pesan Lagi
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky top bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-emerald-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-emerald-500 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-emerald-900">Multibeauty Soap</span>
          </div>
          <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700">
            <a href="#order">Beli Sekarang</a>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-100 via-amber-50 to-emerald-50">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
              🌿 100% Herbal · Bebas Bahan Kimia
            </span>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight text-emerald-950">
              Transformasi Kulit:<br />
              <span className="text-emerald-600">Cerah Alami</span> & Bebas Masalah
            </h1>
            <p className="text-lg text-muted-foreground">
              <strong className="text-emerald-900">Multibeauty Soap</strong> — Sabun kesehatan alami multifungsi untuk wajah, rambut & tubuh. Perpaduan dahsyat <strong>Madu, Spirulina, dan Gamat</strong>.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 shadow-lg">
                <a href="#order">Beli Sekarang · {formatIDR(PRICE)}</a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50">
                <a href="#testimoni">Lihat Testimoni</a>
              </Button>
            </div>
            <div className="flex items-center gap-4 pt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Aman & Alami</div>
              <div className="flex items-center gap-1"><Award className="w-4 h-4 text-amber-600" /> Terbukti</div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400/20 to-amber-400/20 blur-3xl rounded-full" />
            <img
              src={heroImage}
              alt="Multibeauty Soap"
              className="relative rounded-2xl shadow-2xl w-full object-cover aspect-square"
            />
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-3xl md:text-4xl font-bold text-emerald-950">Lelah dengan Masalah Kulit yang Tak Kunjung Usai?</h2>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Jerawat membandel, flek hitam, kulit kusam, gatal-gatal, luka bakar, atau rambut rontok. Anda sudah mencoba berbagai produk namun hasilnya kurang memuaskan bahkan menimbulkan efek samping. <strong className="text-emerald-800">Saatnya beralih ke solusi alami yang efektif.</strong>
        </p>
      </section>

      {/* Ingredients */}
      <section className="bg-gradient-to-b from-emerald-50 to-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10 space-y-2">
            <h2 className="text-3xl md:text-4xl font-bold text-emerald-950">Kekuatan 3 Bahan Alami</h2>
            <p className="text-muted-foreground">Sinergi ampuh yang tidak dimiliki sabun biasa</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "🍯", title: "Madu Murni", desc: "Antibakteri alami, melembapkan dan menutrisi kulit secara mendalam.", color: "amber" },
              { icon: "🌱", title: "Spirulina", desc: "Superfood tinggi antioksidan, membantu detoksifikasi & meregenerasi sel kulit.", color: "emerald" },
              { icon: "🌊", title: "Ekstrak Gamat", desc: "Kaya kolagen laut, mempercepat penyembuhan luka, herpes, dan luka bakar.", color: "sky" },
            ].map((item) => (
              <Card key={item.title} className="p-6 text-center hover:shadow-lg transition-shadow border-emerald-100">
                <div className="text-5xl mb-3">{item.icon}</div>
                <h3 className="text-xl font-bold mb-2 text-emerald-900">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold text-emerald-950">Satu Sabun, Segudang Manfaat</h2>
          <p className="text-muted-foreground">Solusi multi-guna untuk seluruh keluarga</p>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            "Menghilangkan Jerawat",
            "Menyamarkan Flek Hitam",
            "Menyembuhkan Herpes",
            "Meredakan Luka Bakar",
            "Menumbuhkan Rambut",
            "Menghilangkan Bau Badan",
            "Menyembuhkan Luka",
            "Kulit Cerah & Sehat",
          ].map((b) => (
            <div key={b} className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50/50 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-sm font-medium text-emerald-900">{b}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Ants proof */}
      <section className="bg-amber-50 py-16">
        <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">
          <img
            src={antsImage}
            alt="Bukti alami — dikerubungi semut"
            className="rounded-2xl shadow-xl w-full object-cover cursor-pointer"
            onClick={() => setLightbox(antsImage)}
          />
          <div className="space-y-4">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-200 text-amber-900 text-xs font-semibold">
              BUKTI 100% ALAMI
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-emerald-950">Dikerubungi Semut = Bebas Bahan Kimia</h2>
            <p className="text-muted-foreground text-lg">
              Semut adalah detektor alami. Mereka hanya menghampiri bahan yang benar-benar alami dan mengandung nutrisi asli. Multibeauty Soap terbukti bebas dari bahan kimia berbahaya.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimoni" className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold text-emerald-950">Bukti Nyata Pengguna</h2>
          <p className="text-muted-foreground">Ribuan testimoni dari pengguna yang telah merasakan manfaatnya</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {testimonials.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setLightbox(src)}
              className="group relative aspect-square overflow-hidden rounded-lg bg-muted hover:shadow-lg transition-shadow"
            >
              <img
                src={src}
                alt={`Testimoni ${i + 1}`}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </button>
          ))}
        </div>
      </section>

      {/* Legality */}
      <section className="bg-gradient-to-b from-white to-emerald-50 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-4">
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            LEGALITAS RESMI
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-emerald-950">Diproduksi oleh Perusahaan Resmi</h2>
          <p className="text-lg text-muted-foreground">
            Multibeauty Soap diproduksi dan didistribusikan oleh <strong className="text-emerald-900">PT. Angkasa Wijaya Internasional</strong>, perusahaan terdaftar resmi dengan standar produksi yang terjamin.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-6 text-sm">
            <div className="p-4 rounded-lg bg-white border border-emerald-100">
              <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <div className="font-semibold text-emerald-900">Perusahaan Legal</div>
            </div>
            <div className="p-4 rounded-lg bg-white border border-emerald-100">
              <Award className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <div className="font-semibold text-emerald-900">Formula Terjamin</div>
            </div>
            <div className="p-4 rounded-lg bg-white border border-emerald-100">
              <Sparkles className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <div className="font-semibold text-emerald-900">Bahan Alami</div>
            </div>
          </div>
        </div>
      </section>

      {/* Order form */}
      <section id="order" className="py-16 bg-gradient-to-br from-emerald-600 to-emerald-800">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-8 text-white space-y-2">
            <h2 className="text-3xl md:text-4xl font-bold">Pesan Sekarang</h2>
            <p className="text-emerald-50">Isi formulir & dapatkan akun Laryzo otomatis + bonus poin jaringan</p>
          </div>

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
                <Label className="flex items-center gap-1"><MapPin className="w-4 h-4" /> Pin Lokasi di Peta *</Label>
                <p className="text-xs text-muted-foreground mb-2">Geser marker atau klik peta untuk menandai titik lokasi (wajib untuk pengiriman ojol)</p>
                <MapLocationPicker
                  latitude={form.latitude}
                  longitude={form.longitude}
                  onSave={(lat, lng) => {
                    setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
                    toast({ title: "Lokasi tersimpan", description: `${lat}, ${lng}` });
                  }}
                />
                {form.latitude && form.longitude && (
                  <p className="text-xs text-emerald-700 mt-1">✓ Lokasi: {form.latitude}, {form.longitude}</p>
                )}
              </div>
              <div>
                <Label htmlFor="notes">Catatan (opsional)</Label>
                <Textarea id="notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={500} />
              </div>

              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Harga per pcs</span><span>{formatIDR(PRICE)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Jumlah</span><span>{form.qty || 1} pcs</span></div>
                <div className="flex justify-between text-base font-bold pt-2 border-t border-emerald-200"><span>Total</span><span className="text-emerald-700">{formatIDR(total)}</span></div>
                <p className="text-xs text-muted-foreground pt-2">💡 Ongkos kirim ojol dibayarkan langsung ke kurir saat barang diterima.</p>
              </div>

              <Button type="submit" disabled={submitting} size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700">
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...</> : <>Kirim Pesanan · {formatIDR(total)}</>}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Dengan mengirim pesanan, akun Laryzo akan otomatis dibuat & Anda mendapat bonus poin jaringan.
              </p>
            </form>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-emerald-950 text-emerald-100 py-10">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-emerald-500 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">Multibeauty Soap</span>
          </div>
          <p className="text-sm text-emerald-200/80">
            Diproduksi oleh PT. Angkasa Wijaya Internasional
          </p>
          <p className="text-xs text-emerald-300/60">
            © {new Date().getFullYear()} Multibeauty. Distribusi via Laryzo.
          </p>
        </div>
      </footer>

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={(v) => !v && setLightbox(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/95">
          {lightbox && <img src={lightbox} alt="Preview" className="w-full h-auto max-h-[85vh] object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Multibeauty;
