import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import ImageUploader from "./ImageUploader";
import ColorField from "./ColorField";
import type { Section } from "@/lib/landing/types";

type Props = {
  section: Section;
  onChange: (patch: Partial<Section["props"]>) => void;
};

// Helper
const setItem = <T,>(arr: T[], i: number, patch: Partial<T>): T[] =>
  arr.map((x, idx) => (idx === i ? { ...x, ...patch } : x));

export default function SectionInspector({ section, onChange }: Props) {
  const p: any = section.props;

  const Text = ({ k, label, rows }: { k: string; label: string; rows?: number }) =>
    rows ? (
      <div>
        <Label>{label}</Label>
        <Textarea rows={rows} value={p[k] || ""} onChange={(e) => onChange({ [k]: e.target.value } as any)} />
      </div>
    ) : (
      <div>
        <Label>{label}</Label>
        <Input value={p[k] || ""} onChange={(e) => onChange({ [k]: e.target.value } as any)} />
      </div>
    );

  return (
    <div className="space-y-4">
      {section.type === "hero" && (
        <>
          <Text k="badge" label="Badge" />
          <Text k="title" label="Judul" />
          <Text k="titleAccent" label="Judul (aksen warna)" />
          <Text k="subtitle" label="Subjudul" rows={3} />
          <div className="grid grid-cols-2 gap-2">
            <Text k="ctaPrimary" label="Tombol utama" />
            <Text k="ctaPrimaryHref" label="Link tombol utama" />
            <Text k="ctaSecondary" label="Tombol kedua" />
            <Text k="ctaSecondaryHref" label="Link tombol kedua" />
          </div>
          <ImageUploader label="Gambar hero" value={p.image} onChange={(url) => onChange({ image: url } as any)} />
          <ColorField label="Background" value={p.bg} onChange={(v) => onChange({ bg: v } as any)} />
        </>
      )}

      {section.type === "text" && (
        <>
          <Text k="title" label="Judul" />
          <Text k="subtitle" label="Sub-judul (aksen)" />
          <Text k="body" label="Teks" rows={5} />
          <div>
            <Label>Rata</Label>
            <select className="w-full border rounded h-9 px-2" value={p.align || "center"} onChange={(e) => onChange({ align: e.target.value } as any)}>
              <option value="center">Tengah</option>
              <option value="left">Kiri</option>
            </select>
          </div>
          <ColorField label="Background" value={p.bg} onChange={(v) => onChange({ bg: v } as any)} />
        </>
      )}

      {section.type === "usage" && (
        <>
          <Text k="title" label="Judul" />
          <Text k="subtitle" label="Subjudul" rows={2} />
          <Text k="footer" label="Teks bawah" rows={2} />
          <ColorField label="Background" value={p.bg} onChange={(v) => onChange({ bg: v } as any)} />
          <div className="space-y-2">
            <Label>Item</Label>
            {(p.items || []).map((it: any, i: number) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Icon" className="w-20" value={it.icon || ""} onChange={(e) => onChange({ items: setItem(p.items, i, { icon: e.target.value }) } as any)} />
                <Input placeholder="Label" value={it.label || ""} onChange={(e) => onChange({ items: setItem(p.items, i, { label: e.target.value }) } as any)} />
                <Button type="button" size="icon" variant="ghost" onClick={() => onChange({ items: p.items.filter((_: any, idx: number) => idx !== i) } as any)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => onChange({ items: [...(p.items || []), { icon: "✨", label: "Fungsi baru" }] } as any)}>
              <Plus className="w-3 h-3 mr-1" /> Tambah
            </Button>
          </div>
        </>
      )}

      {section.type === "comparison" && (
        <>
          <Text k="title" label="Judul" />
          <Text k="subtitle" label="Subjudul" rows={2} />
          <ColorField label="Background" value={p.bg} onChange={(v) => onChange({ bg: v } as any)} />
          <div className="p-3 border rounded space-y-2 bg-red-50/50">
            <Label className="font-bold">Kolom Kiri (Cara Lama)</Label>
            <Text k="leftTitle" label="Judul" />
            <Text k="leftSubtitle" label="Subjudul" />
            {(p.leftItems || []).map((it: any, i: number) => (
              <div key={i} className="flex gap-1">
                <Input placeholder="Icon" className="w-14" value={it.icon || ""} onChange={(e) => onChange({ leftItems: setItem(p.leftItems, i, { icon: e.target.value }) } as any)} />
                <Input placeholder="Label" value={it.label || ""} onChange={(e) => onChange({ leftItems: setItem(p.leftItems, i, { label: e.target.value }) } as any)} />
                <Input placeholder="Harga" className="w-24" value={it.price || ""} onChange={(e) => onChange({ leftItems: setItem(p.leftItems, i, { price: e.target.value }) } as any)} />
                <Button type="button" size="icon" variant="ghost" onClick={() => onChange({ leftItems: p.leftItems.filter((_: any, idx: number) => idx !== i) } as any)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => onChange({ leftItems: [...(p.leftItems || []), { icon: "💊", label: "Produk", price: "Rp 0" }] } as any)}>
              <Plus className="w-3 h-3 mr-1" /> Tambah Item
            </Button>
            <Text k="leftTotalLabel" label="Label total" />
            <Text k="leftTotal" label="Total" />
          </div>
          <div className="p-3 border rounded space-y-2 bg-emerald-50/50">
            <Label className="font-bold">Kolom Kanan (Solusi)</Label>
            <Text k="rightTitle" label="Judul" />
            <Text k="rightSubtitle" label="Subjudul" />
            <ImageUploader label="Gambar produk" value={p.rightImage} onChange={(url) => onChange({ rightImage: url } as any)} />
            <Text k="rightPriceLabel" label="Label harga" />
            <Text k="rightPrice" label="Harga" />
            {(p.rightBenefits || []).map((b: string, i: number) => (
              <div key={i} className="flex gap-2">
                <Input value={b} onChange={(e) => { const arr = [...p.rightBenefits]; arr[i] = e.target.value; onChange({ rightBenefits: arr } as any); }} />
                <Button type="button" size="icon" variant="ghost" onClick={() => onChange({ rightBenefits: p.rightBenefits.filter((_: any, idx: number) => idx !== i) } as any)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => onChange({ rightBenefits: [...(p.rightBenefits || []), "Manfaat baru"] } as any)}>
              <Plus className="w-3 h-3 mr-1" /> Tambah Manfaat
            </Button>
            <Text k="rightFooter" label="Teks bawah" />
          </div>
        </>
      )}

      {section.type === "beforeAfter" && (
        <>
          <Text k="title" label="Judul" />
          <Text k="subtitle" label="Subjudul" />
          <Text k="disclaimer" label="Disclaimer" />
          <ColorField label="Background" value={p.bg} onChange={(v) => onChange({ bg: v } as any)} />
          <div className="space-y-3">
            <Label>Item</Label>
            {(p.items || []).map((it: any, i: number) => (
              <div key={i} className="border rounded p-2 space-y-2 bg-muted/30">
                <div className="grid grid-cols-2 gap-2">
                  <ImageUploader label="Sebelum" value={it.before} onChange={(url) => onChange({ items: setItem(p.items, i, { before: url }) } as any)} />
                  <ImageUploader label="Sesudah" value={it.after} onChange={(url) => onChange({ items: setItem(p.items, i, { after: url }) } as any)} />
                </div>
                <Input placeholder="Caption" value={it.caption || ""} onChange={(e) => onChange({ items: setItem(p.items, i, { caption: e.target.value }) } as any)} />
                <Input placeholder="Durasi" value={it.duration || ""} onChange={(e) => onChange({ items: setItem(p.items, i, { duration: e.target.value }) } as any)} />
                <Button type="button" size="sm" variant="ghost" onClick={() => onChange({ items: p.items.filter((_: any, idx: number) => idx !== i) } as any)}>
                  <Trash2 className="w-4 h-4 mr-1" /> Hapus
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => onChange({ items: [...(p.items || []), { before: "", after: "", caption: "", duration: "" }] } as any)}>
              <Plus className="w-3 h-3 mr-1" /> Tambah Pasangan
            </Button>
          </div>
        </>
      )}

      {section.type === "testimonials" && (
        <>
          <Text k="title" label="Judul" />
          <Text k="subtitle" label="Subjudul" />
          <div>
            <Label>Kolom</Label>
            <Input type="number" min={1} max={4} value={p.columns || 2} onChange={(e) => onChange({ columns: parseInt(e.target.value) || 2 } as any)} />
          </div>
          <ColorField label="Background" value={p.bg} onChange={(v) => onChange({ bg: v } as any)} />
          <div className="space-y-3">
            <Label>Testimoni</Label>
            {(p.items || []).map((it: any, i: number) => (
              <div key={i} className="border rounded p-2 space-y-2 bg-muted/30">
                <ImageUploader label="Foto" value={it.photo} onChange={(url) => onChange({ items: setItem(p.items, i, { photo: url }) } as any)} />
                <Textarea rows={3} placeholder="Kutipan" value={it.quote || ""} onChange={(e) => onChange({ items: setItem(p.items, i, { quote: e.target.value }) } as any)} />
                <div className="flex gap-2">
                  <Input placeholder="Nama" value={it.name || ""} onChange={(e) => onChange({ items: setItem(p.items, i, { name: e.target.value }) } as any)} />
                  <Input placeholder="Kota" value={it.location || ""} onChange={(e) => onChange({ items: setItem(p.items, i, { location: e.target.value }) } as any)} />
                  <Button type="button" size="icon" variant="ghost" onClick={() => onChange({ items: p.items.filter((_: any, idx: number) => idx !== i) } as any)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => onChange({ items: [...(p.items || []), { photo: "", quote: "", name: "", location: "" }] } as any)}>
              <Plus className="w-3 h-3 mr-1" /> Tambah Testimoni
            </Button>
          </div>
        </>
      )}

      {section.type === "countdown" && (
        <>
          <Text k="title" label="Judul" />
          <Text k="subtitle" label="Subjudul" />
          <div>
            <Label>Berakhir pada (ISO datetime)</Label>
            <Input type="datetime-local" value={p.endsAt ? new Date(p.endsAt).toISOString().slice(0,16) : ""} onChange={(e) => onChange({ endsAt: e.target.value ? new Date(e.target.value).toISOString() : "" } as any)} />
          </div>
          <Text k="bonusText" label="Teks bonus" />
          <Text k="ctaText" label="Teks tombol" />
          <Text k="ctaHref" label="Link tombol" />
          <ColorField label="Background" value={p.bg} onChange={(v) => onChange({ bg: v } as any)} />
        </>
      )}

      {section.type === "features" && (
        <>
          <Text k="title" label="Judul" />
          <Text k="subtitle" label="Subjudul" />
          <div>
            <Label>Kolom</Label>
            <Input type="number" min={1} max={4} value={p.columns || 3} onChange={(e) => onChange({ columns: parseInt(e.target.value) || 3 } as any)} />
          </div>
          <ColorField label="Background" value={p.bg} onChange={(v) => onChange({ bg: v } as any)} />
          <div className="space-y-2">
            <Label>Item</Label>
            {(p.items || []).map((it: any, i: number) => (
              <div key={i} className="border rounded p-2 space-y-2 bg-muted/30">
                <div className="flex gap-2">
                  <Input placeholder="Icon (emoji)" className="w-20" value={it.icon || ""} onChange={(e) => onChange({ items: setItem(p.items, i, { icon: e.target.value }) } as any)} />
                  <Input placeholder="Judul" value={it.title || ""} onChange={(e) => onChange({ items: setItem(p.items, i, { title: e.target.value }) } as any)} />
                  <Button type="button" size="icon" variant="ghost" onClick={() => onChange({ items: p.items.filter((_: any, idx: number) => idx !== i) } as any)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <Textarea rows={2} placeholder="Deskripsi" value={it.desc || ""} onChange={(e) => onChange({ items: setItem(p.items, i, { desc: e.target.value }) } as any)} />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => onChange({ items: [...(p.items || []), { icon: "✨", title: "Fitur baru", desc: "Deskripsi..." }] } as any)}>
              <Plus className="w-3 h-3 mr-1" /> Tambah Item
            </Button>
          </div>
        </>
      )}

      {section.type === "checklist" && (
        <>
          <Text k="title" label="Judul" />
          <Text k="subtitle" label="Subjudul" />
          <div>
            <Label>Kolom</Label>
            <Input type="number" min={1} max={4} value={p.columns || 4} onChange={(e) => onChange({ columns: parseInt(e.target.value) || 4 } as any)} />
          </div>
          <ColorField label="Background" value={p.bg} onChange={(v) => onChange({ bg: v } as any)} />
          <div className="space-y-2">
            <Label>Item</Label>
            {(p.items || []).map((it: string, i: number) => (
              <div key={i} className="flex gap-2">
                <Input value={it} onChange={(e) => {
                  const arr = [...p.items]; arr[i] = e.target.value; onChange({ items: arr } as any);
                }} />
                <Button type="button" size="icon" variant="ghost" onClick={() => onChange({ items: p.items.filter((_: any, idx: number) => idx !== i) } as any)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => onChange({ items: [...(p.items || []), "Manfaat baru"] } as any)}>
              <Plus className="w-3 h-3 mr-1" /> Tambah
            </Button>
          </div>
        </>
      )}

      {section.type === "imageText" && (
        <>
          <Text k="badge" label="Badge" />
          <Text k="title" label="Judul" />
          <Text k="body" label="Teks" rows={4} />
          <ImageUploader label="Gambar" value={p.image} onChange={(url) => onChange({ image: url } as any)} />
          <div>
            <Label>Posisi gambar</Label>
            <select className="w-full border rounded h-9 px-2" value={p.imagePosition || "left"} onChange={(e) => onChange({ imagePosition: e.target.value } as any)}>
              <option value="left">Kiri</option>
              <option value="right">Kanan</option>
            </select>
          </div>
          <ColorField label="Background" value={p.bg} onChange={(v) => onChange({ bg: v } as any)} />
        </>
      )}

      {section.type === "gallery" && (
        <>
          <Text k="title" label="Judul" />
          <Text k="subtitle" label="Subjudul" />
          <div>
            <Label>Kolom</Label>
            <Input type="number" min={2} max={6} value={p.columns || 5} onChange={(e) => onChange({ columns: parseInt(e.target.value) || 5 } as any)} />
          </div>
          <ColorField label="Background" value={p.bg} onChange={(v) => onChange({ bg: v } as any)} />
          <div className="space-y-2">
            <Label>Gambar ({(p.images || []).length})</Label>
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-auto">
              {(p.images || []).map((src: string, i: number) => (
                <div key={i} className="relative group">
                  <img src={src} alt="" className="w-full aspect-square object-cover rounded border" />
                  <button type="button" onClick={() => onChange({ images: p.images.filter((_: any, idx: number) => idx !== i) } as any)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <ImageUploader label="Tambah gambar" value="" onChange={(url) => url && onChange({ images: [...(p.images || []), url] } as any)} />
          </div>
        </>
      )}

      {section.type === "legal" && (
        <>
          <Text k="badge" label="Badge" />
          <Text k="title" label="Judul" />
          <Text k="body" label="Teks" rows={3} />
          <ColorField label="Background" value={p.bg} onChange={(v) => onChange({ bg: v } as any)} />
          <div className="space-y-2">
            <Label>Item</Label>
            {(p.items || []).map((it: any, i: number) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Icon" className="w-20" value={it.icon || ""} onChange={(e) => onChange({ items: setItem(p.items, i, { icon: e.target.value }) } as any)} />
                <Input placeholder="Judul" value={it.title || ""} onChange={(e) => onChange({ items: setItem(p.items, i, { title: e.target.value }) } as any)} />
                <Button type="button" size="icon" variant="ghost" onClick={() => onChange({ items: p.items.filter((_: any, idx: number) => idx !== i) } as any)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => onChange({ items: [...(p.items || []), { icon: "✅", title: "Item baru" }] } as any)}>
              <Plus className="w-3 h-3 mr-1" /> Tambah
            </Button>
          </div>
        </>
      )}

      {section.type === "checkout" && (
        <>
          <Text k="title" label="Judul" />
          <Text k="subtitle" label="Subjudul" />
          <div>
            <Label>Harga per pcs (Rp)</Label>
            <Input type="number" value={p.price || 0} onChange={(e) => onChange({ price: parseInt(e.target.value) || 0 } as any)} />
          </div>
          <Text k="buttonText" label="Teks tombol" />
          <ColorField label="Background" value={p.bg} onChange={(v) => onChange({ bg: v } as any)} />
        </>
      )}

      {section.type === "footer" && (
        <>
          <Text k="brand" label="Brand" />
          <Text k="text" label="Teks" />
          <Text k="copyright" label="Copyright (gunakan {year} untuk tahun)" />
          <ColorField label="Background" value={p.bg} onChange={(v) => onChange({ bg: v } as any)} />
        </>
      )}
    </div>
  );
}
