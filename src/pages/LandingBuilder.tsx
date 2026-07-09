import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader as Loader2, Plus, Save, Send, ExternalLink, MessageSquare, ShoppingBag, Palette, LayoutGrid as Layout } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Section, SectionType, Theme, LandingPageRow, LandingSettings } from "@/lib/landing/types";
import { SECTION_LIBRARY } from "@/lib/landing/types";
import { defaultMultibeautySections, defaultTheme } from "@/lib/landing/defaults";
import { saveLandingPage, publishLandingPage } from "@/hooks/useLandingPage";
import SectionList from "@/components/landing-builder/SectionList";
import SectionInspector from "@/components/landing-builder/SectionInspector";
import ColorField from "@/components/landing-builder/ColorField";
import ChatbotSettingsPanel from "@/components/landing-builder/ChatbotSettingsPanel";

const SLUG = "multibeauty";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const emptyProps = (t: SectionType): any => {
  switch (t) {
    case "hero": return { title: "Judul Hero", subtitle: "Deskripsi singkat", ctaPrimary: "Beli Sekarang", ctaPrimaryHref: "#order", bg: "#f0fdf4" };
    case "text": return { title: "Judul", body: "Isi teks...", align: "center", bg: "#ffffff" };
    case "features": return { title: "Fitur", columns: 3, bg: "#ffffff", items: [{ icon: "✨", title: "Fitur 1", desc: "Deskripsi" }] };
    case "checklist": return { title: "Manfaat", columns: 4, bg: "#ffffff", items: ["Item 1", "Item 2"] };
    case "imageText": return { title: "Judul", body: "Teks...", imagePosition: "left", bg: "#ffffff" };
    case "usage": return { title: "Multi-guna", subtitle: "Bisa digunakan sebagai:", bg: "#fffbeb", items: [{ icon: "🧼", label: "Fungsi 1" }, { icon: "🚿", label: "Fungsi 2" }] };
    case "comparison": return { title: "Perbandingan", bg: "#ffffff", leftTitle: "Cara Lama", leftItems: [{ icon: "💊", label: "Produk", price: "Rp 0" }], leftTotalLabel: "Total", leftTotal: "Rp 0", rightTitle: "Solusi", rightPriceLabel: "Hanya", rightPrice: "Rp 0", rightBenefits: ["Manfaat 1"] };
    case "beforeAfter": return { title: "Before & After", bg: "#ffffff", items: [{ before: "", after: "", caption: "", duration: "" }] };
    case "testimonials": return { title: "Testimoni", columns: 2, bg: "#ffffff", items: [{ photo: "", quote: "Sangat bagus!", name: "Nama", location: "Kota" }] };
    case "countdown": return { title: "Penawaran Terbatas", endsAt: new Date(Date.now() + 86400000).toISOString(), ctaText: "Pesan Sekarang", ctaHref: "#order", bg: "linear-gradient(135deg, #065f46, #047857)" };
    case "gallery": return { title: "Galeri", columns: 5, bg: "#ffffff", images: [] };
    case "legal": return { title: "Legalitas", bg: "#ffffff", items: [{ icon: "🛡️", title: "Legal" }] };
    case "checkout": return { title: "Pesan Sekarang", price: 75000, buttonText: "Kirim Pesanan", bg: "linear-gradient(135deg, #059669, #065f46)" };
    case "footer": return { brand: "Brand", text: "Deskripsi", copyright: "© {year}", bg: "#111827" };
  }
};

export default function LandingBuilder() {
  const [sections, setSections] = useState<Section[]>([]);
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [title, setTitle] = useState("Multibeauty Soap");
  const [settings, setSettings] = useState<LandingSettings>({
    chatbot: { enabled: true, welcomeMessage: "", waNumber: "", aiPrompt: "" },
    checkout: { productId: "", price: 0, successMessage: "" }
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeRightTab, setActiveRightTab] = useState("chatbot");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeSection = useMemo(() => sections.find((s) => s.id === activeId) || null, [sections, activeId]);

  // Load
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("landing_pages").select("*").eq("slug", SLUG).maybeSingle();
      const r = data as any as LandingPageRow | null;
      if (r) {
        setSections(r.sections_draft?.length ? r.sections_draft : (r.sections_published?.length ? r.sections_published : defaultMultibeautySections));
        setTheme({ ...defaultTheme, ...(r.theme_draft || r.theme_published || {}) });
        setTitle(r.title || "Multibeauty Soap");
        setSettings(r.settings_draft || r.settings_published || {
          chatbot: { enabled: true, welcomeMessage: "", waNumber: "", aiPrompt: "" },
          checkout: { productId: "", price: 0, successMessage: "" }
        });
      } else {
        setSections(defaultMultibeautySections);
      }
      setLoading(false);
    })();
  }, []);

  // Push live updates to preview iframe
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "LANDING_PREVIEW_UPDATE", payload: { sections, theme, title, settings } },
      "*"
    );
  }, [sections, theme, title, settings]);

  // Send initial payload when iframe signals ready
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "LANDING_PREVIEW_READY") {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "LANDING_PREVIEW_UPDATE", payload: { sections, theme, title, settings } },
          "*"
        );
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [sections, theme, title, settings]);

  const updateSectionProps = (id: string, patch: any) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, props: { ...(s.props as any), ...patch } } as Section : s)));
  };

  const addSection = (t: SectionType) => {
    const s = { id: uid(), type: t, visible: true, props: emptyProps(t) } as Section;
    setSections((prev) => [...prev, s]);
    setActiveId(s.id);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveLandingPage(SLUG, { title, theme_draft: theme, sections_draft: sections, settings_draft: settings });
      toast({ title: "Draft tersimpan" });
    } catch (e) {
      toast({ title: "Gagal simpan", description: (e as Error).message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await saveLandingPage(SLUG, { title, theme_draft: theme, sections_draft: sections, settings_draft: settings });
      await publishLandingPage(SLUG);
      toast({ title: "Landing page dipublish", description: "Perubahan sudah live di /multibeauty" });
    } catch (e) {
      toast({ title: "Gagal publish", description: (e as Error).message, variant: "destructive" });
    } finally { setPublishing(false); }
  };

  if (loading) {
    return <div className="p-6 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Memuat...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b p-3 flex items-center gap-3 flex-wrap bg-card">
        <div className="flex-1 min-w-[200px]">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul halaman" className="max-w-sm" />
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/multibeauty" target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5 mr-1" /> Buka Live</a>
        </Button>
        <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
          Simpan Draft
        </Button>
        <Button size="sm" onClick={handlePublish} disabled={publishing}>
          {publishing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
          Publish
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-12 min-h-0">
        {/* Left: Sections + Add */}
        <div className="col-span-3 border-r flex flex-col min-h-0">
          <div className="p-3 border-b">
            <div className="text-xs font-semibold mb-2">SECTION</div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full"><Plus className="w-3.5 h-3.5 mr-1" /> Tambah Section</Button>
              </PopoverTrigger>
              <PopoverContent className="p-2 w-56">
                <div className="space-y-1">
                  {SECTION_LIBRARY.map((s) => (
                    <button key={s.type} onClick={() => addSection(s.type)} className="w-full text-left px-2 py-1.5 rounded hover:bg-accent text-sm flex items-center gap-2">
                      <span>{s.icon}</span> {s.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <ScrollArea className="flex-1 p-3">
            <SectionList
              sections={sections}
              activeId={activeId}
              onReorder={setSections}
              onSelect={(id) => { setActiveId(id); setActiveRightTab("section"); }}
              onToggle={(id) => setSections((prev) => prev.map((s) => s.id === id ? { ...s, visible: !s.visible } : s))}
              onDup={(id) => {
                const s = sections.find((x) => x.id === id);
                if (!s) return;
                const copy = { ...s, id: uid(), props: JSON.parse(JSON.stringify(s.props)) } as Section;
                const idx = sections.findIndex((x) => x.id === id);
                setSections([...sections.slice(0, idx + 1), copy, ...sections.slice(idx + 1)]);
              }}
              onDelete={(id) => {
                setSections((prev) => prev.filter((s) => s.id !== id));
                if (activeId === id) setActiveId(null);
              }}
            />
          </ScrollArea>
        </div>

        {/* Center: Preview */}
        <div className="col-span-6 bg-muted/40 flex flex-col min-h-0">
          <div className="p-2 text-xs text-muted-foreground border-b bg-card">Live preview (perubahan langsung terlihat)</div>
          <iframe
            ref={iframeRef}
            src="/multibeauty?preview=1"
            className="flex-1 w-full bg-white"
            title="Landing Preview"
          />
        </div>

        {/* Right: Inspector with Tabs */}
        <div className="col-span-3 border-l flex flex-col min-h-0">
          <Tabs value={activeRightTab} onValueChange={setActiveRightTab} className="flex flex-col flex-1 min-h-0">
            <TabsList className="rounded-none border-b shrink-0 grid grid-cols-4 h-9">
              <TabsTrigger value="tema" className="text-[10px] px-1 data-[state=active]:bg-background">
                <Palette className="w-3 h-3 mr-1" />Tema
              </TabsTrigger>
              <TabsTrigger value="chatbot" className="text-[10px] px-1 data-[state=active]:bg-background">
                <MessageSquare className="w-3 h-3 mr-1" />Chatbot
              </TabsTrigger>
              <TabsTrigger value="order" className="text-[10px] px-1 data-[state=active]:bg-background">
                <ShoppingBag className="w-3 h-3 mr-1" />Order
              </TabsTrigger>
              <TabsTrigger value="section" className="text-[10px] px-1 data-[state=active]:bg-background">
                <Layout className="w-3 h-3 mr-1" />Section
              </TabsTrigger>
            </TabsList>

            {/* TEMA TAB */}
            <TabsContent value="tema" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-full p-3">
                <div className="space-y-3 pb-4">
                  <ColorField label="Warna Utama" value={theme.primary} onChange={(v) => setTheme((t) => ({ ...t, primary: v }))} />
                  <ColorField label="Warna Utama (gelap)" value={theme.primaryDark} onChange={(v) => setTheme((t) => ({ ...t, primaryDark: v }))} />
                  <ColorField label="Warna Aksen" value={theme.accent} onChange={(v) => setTheme((t) => ({ ...t, accent: v }))} />
                  <ColorField label="Background Halaman" value={theme.bg} onChange={(v) => setTheme((t) => ({ ...t, bg: v }))} />
                  <ColorField label="Warna Teks" value={theme.text} onChange={(v) => setTheme((t) => ({ ...t, text: v }))} />
                  <div>
                    <Label className="text-xs">Font</Label>
                    <Input value={theme.font || ""} onChange={(e) => setTheme((t) => ({ ...t, font: e.target.value }))} placeholder="'Inter', sans-serif" />
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* CHATBOT TAB */}
            <TabsContent value="chatbot" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-full p-3">
                <div className="pb-4">
                  <ChatbotSettingsPanel
                    settings={settings?.chatbot || {}}
                    onChange={(patch) =>
                      setSettings((s) => ({ ...s, chatbot: { ...(s?.chatbot || {}), ...patch } }))
                    }
                    primaryColor={theme.primary}
                  />
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ORDER TAB */}
            <TabsContent value="order" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-full p-3">
                <div className="space-y-4 pb-4">
                  <div className="text-xs font-semibold flex items-center gap-2 uppercase text-orange-800 mb-1">
                    <ShoppingBag className="w-3 h-3" /> Pengaturan Order
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">ID Produk</Label>
                    <Input
                      className="bg-white"
                      value={settings?.checkout?.productId || ""}
                      onChange={(e) => setSettings((s) => ({ ...s, checkout: { ...(s?.checkout || {}), productId: e.target.value } }))}
                      placeholder="ID Produk dari tabel products"
                    />
                    <p className="text-[10px] text-muted-foreground">UUID produk yang akan dibuat saat customer order dari landing page.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Harga Tampil (Rp)</Label>
                    <Input
                      className="bg-white"
                      type="number"
                      value={settings?.checkout?.price || ""}
                      onChange={(e) => setSettings((s) => ({ ...s, checkout: { ...(s?.checkout || {}), price: parseInt(e.target.value) || 0 } }))}
                      placeholder="450000"
                    />
                    <p className="text-[10px] text-muted-foreground">Harga yang ditampilkan di tombol order pada section Checkout.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pesan Sukses</Label>
                    <Textarea
                      className="bg-white text-xs min-h-[80px] resize-none"
                      value={settings?.checkout?.successMessage || ""}
                      onChange={(e) => setSettings((s) => ({ ...s, checkout: { ...(s?.checkout || {}), successMessage: e.target.value } }))}
                      placeholder="Terima kasih! Pesanan Anda sedang diproses oleh admin..."
                    />
                    <p className="text-[10px] text-muted-foreground">Pesan yang muncul setelah customer berhasil submit form order.</p>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* SECTION TAB */}
            <TabsContent value="section" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-full p-3">
                <div className="pb-4">
                  {activeSection ? (
                    <div>
                      <div className="text-xs font-semibold mb-3 uppercase text-blue-800 flex items-center gap-1">
                        <Layout className="w-3 h-3" /> Edit: {activeSection.type}
                      </div>
                      <SectionInspector
                        section={activeSection}
                        onChange={(patch) => updateSectionProps(activeSection.id, patch)}
                      />
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground text-center py-10 border-2 border-dashed rounded-lg">
                      <Layout className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Pilih section di panel kiri untuk mulai edit
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
