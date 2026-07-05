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
