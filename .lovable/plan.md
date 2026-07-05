## Landing Page Builder untuk Multibeauty

Membuat sistem CMS (Content Management System) drag-and-drop di dalam admin Laryzo untuk mengelola landing page `/multibeauty` secara penuh — teks, warna, gambar, urutan section, dan fitur — tanpa perlu edit kode.

### Arsitektur

```text
┌─────────────────────────────────────────────────┐
│  Admin Laryzo → Menu "Landing Page Builder"     │
│  ┌──────────────┬──────────────────────────┐    │
│  │ Section List │  Live Preview            │    │
│  │ (drag & drop)│  (iframe /multibeauty)   │    │
│  │              │                          │    │
│  │ [☰] Hero     │                          │    │
│  │ [☰] Bahan    │  ← klik untuk edit       │    │
│  │ [☰] Manfaat  │                          │    │
│  │ [☰] Galeri   │                          │    │
│  │ [☰] Legal    │                          │    │
│  │ [☰] Checkout │                          │    │
│  │ [+ Section]  │                          │    │
│  └──────────────┴──────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

### Database (Lovable Cloud)

Tabel baru `landing_pages`:
- `id`, `slug` (unique, default `multibeauty`)
- `title`, `theme` (jsonb: `{ primary, secondary, background, text, font }`)
- `sections` (jsonb array — sumber utama urutan & konten)
- `updated_at`, `updated_by`

Struktur satu section dalam `sections`:
```json
{
  "id": "uuid",
  "type": "hero | text | image | gallery | features | testimonials | legal | checkout | video | spacer",
  "visible": true,
  "props": { "title": "...", "subtitle": "...", "bg": "#fff", "images": [...], "items": [...] }
}
```

Storage bucket `landing-assets` untuk gambar upload admin (public read).

RLS: Super Admin & Admin full access. Anon `SELECT` untuk halaman publik.

### Halaman Builder Admin (`/admin/landing-builder`)

- **Panel kiri**: daftar section dengan handle drag (pakai `@dnd-kit/sortable` — sudah ringan & compatible). Toggle visibility, duplicate, delete, tambah section dari library.
- **Panel tengah**: live preview iframe `/multibeauty?preview=1` dengan hot-reload via postMessage saat data berubah.
- **Panel kanan**: inspector edit properti section aktif — text field, color picker, image uploader (multi), toggle, reorder item dalam section (mis. urutan gambar galeri, list bahan/manfaat).
- **Global theme**: primary color, background, font family, logo — apply ke semua section.
- **Tombol**: Save, Preview, Publish (versi draft vs published disimpan di kolom `sections_draft` + `sections_published`).

### Halaman Publik `/multibeauty` (refactor)

- Load `landing_pages` where `slug='multibeauty'` (published version).
- Render tiap section berdasarkan `type` lewat map komponen:
  - `HeroSection`, `TextSection`, `ImageSection`, `GallerySection`, `FeaturesSection`, `TestimonialsSection`, `LegalSection`, `CheckoutSection`, `VideoSection`, `SpacerSection`
- Semua styling ambil dari `theme` + `section.props`.
- Section `checkout` tetap terhubung ke edge function `multibeauty-checkout` yang sudah ada (tidak diubah).
- Mode `?preview=1` load draft & listen postMessage untuk update realtime dari builder.

### Section Library (default saat pertama kali)

Migrasi seed mengisi `sections` dengan konten Multibeauty existing (hero, 3 bahan, manfaat, galeri testimoni, legal, form checkout) supaya halaman langsung sama seperti sekarang, lalu admin bebas edit.

### Files yang dibuat / diubah

**Baru:**
- `supabase/migrations/xxx_landing_pages.sql` — tabel + RLS + GRANT + seed multibeauty
- `src/pages/admin/LandingBuilder.tsx` — UI builder
- `src/components/landing-builder/SectionList.tsx` — daftar drag-drop
- `src/components/landing-builder/SectionInspector.tsx` — form edit properti
- `src/components/landing-builder/ThemeEditor.tsx`
- `src/components/landing-builder/ImageUploader.tsx`
- `src/components/landing/sections/*.tsx` — 10 komponen section renderer
- `src/hooks/useLandingPage.ts` — fetch & save

**Diubah:**
- `src/pages/Multibeauty.tsx` — refactor jadi renderer dinamis dari DB
- `src/App.tsx` — tambah route `/admin/landing-builder`
- Menu navigasi admin — tambah link "Landing Page Builder" (Super Admin & Admin)

### Dependency
- `@dnd-kit/core` + `@dnd-kit/sortable` (drag & drop ringan, React-friendly)
- `react-colorful` (color picker kecil)

### Alur admin
1. Buka menu **Landing Page Builder**
2. Drag section untuk atur urutan
3. Klik section → edit teks/warna/gambar di panel kanan
4. Upload gambar baru langsung di editor
5. Save → Publish → perubahan live di `/multibeauty`
