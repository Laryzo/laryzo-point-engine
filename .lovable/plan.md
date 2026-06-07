## Tujuan
Menampilkan logo resmi untuk semua brand PPOB (Telkomsel, Indosat, XL, Axis, Smartfren, Tri, PLN, LinkAja, Maxim, dll.) yang saat ini masih jatuh ke fallback badge inisial karena tidak tersedia di simple-icons CDN.

## Langkah

### 1. Anda upload file logo ke chat
Upload file gambar logo (PNG/SVG, latar transparan lebih baik) untuk brand-brand berikut. Nama file bebas, nanti saya rapikan:

- Telkomsel
- Indosat (IM3)
- XL
- Axis
- Smartfren
- Tri (3)
- PLN
- LinkAja
- Maxim
- (Opsional) brand lain yang ingin ditambah

Brand yang sudah ada di simple-icons (GoPay, OVO, Dana, ShopeePay, Grab) tidak perlu di-upload kecuali Anda mau ganti ke versi resmi sendiri.

### 2. Saya simpan ke `src/assets/ppob-logos/`
Setiap file disimpan dengan nama kanonis, mis. `telkomsel.png`, `indosat.png`, `xl.png`, dst.

### 3. Refactor `src/lib/ppob-brand-logo.ts`
- Tambahkan field `localLogo?: string` ke `BrandMeta`, di-import dari `src/assets/ppob-logos/*`.
- Isi `localLogo` untuk tiap brand yang sudah Anda upload.
- Ubah `getBrandLogoUrl(brand)` agar:
  1. Prioritas pertama: `localLogo` (file lokal yang baru di-upload).
  2. Prioritas kedua: simple-icons CDN (`slug`).
  3. Kalau dua-duanya tidak ada → return `null` (tetap fallback inisial).

### 4. Tidak ada perubahan di `CustomerShop.tsx`
Komponen `getProductBrandLogo` sudah memanggil `getBrandLogoUrlFromProductName`, jadi otomatis ikut terpakai.

### 5. Verifikasi
Buka `/portal/shop`, klik tiap kategori PPOB, pastikan logo brand muncul dengan benar dan tidak ada layout shift.

## Catatan
- Tidak ada perubahan logika bisnis, database, atau edge function — murni UI/asset.
- Kalau ada brand yang Anda lewati upload-nya, brand itu akan tetap memakai badge inisial berwarna sebagai fallback (tidak akan broken image).

## Action selanjutnya
Silakan upload file logo-nya di pesan berikutnya, lalu saya implementasikan dalam satu langkah.