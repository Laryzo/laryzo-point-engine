## Landing Page Multibeauty Soap + Checkout Terintegrasi Laryzo

Membangun landing page publik ala `id.tapsite.ai/multibeauty-soap` di route baru `/multibeauty`, lengkap dengan form pembelian yang otomatis membuat akun customer Laryzo, menempatkan pembeli di titik kosong jaringan (BFS random upline), dan membuat order produk fisik senilai Rp 75.000/pcs.

### 1. Aset konten dari PPTX
- Ekstrak semua gambar testimoni & legalitas dari `Sabun_Multibeauty-2.pptx` → simpan di `src/assets/multibeauty/` (gambar produk, 37 slide foto testimoni, dokumen legalitas).
- Kelompokkan kategori testimoni: Jerawat, Luka Bakar, Herpes, Rambut, Diabetes, Body Odor, dll (berdasarkan caption pptx).

### 2. Route & struktur halaman
Route baru `/multibeauty` (publik, tidak diblok auth). Struktur mengikuti tapsite.ai:
1. **Hero** — headline "Transformasi Kulit: Cerah Alami & Bebas Masalah", foto produk, CTA "Beli Sekarang – Rp 75.000".
2. **Masalah kulit** — copy empati.
3. **Solusi Multibeauty Soap** — deskripsi produk.
4. **Kekuatan bahan alami** — Madu · Spirulina · Gamat (3 kartu ikon).
5. **Manfaat multi-guna** — grid (Wajah / Rambut / Tubuh).
6. **Bukti alami** — foto "sabun dikerubungi semut".
7. **Galeri Testimoni** — carousel/grid dari foto pptx dengan kategori & caption.
8. **Legalitas & Perusahaan** — logo/nomor izin PT Angkasa Wijaya Internasional + dokumen (thumbnail bisa diklik → dialog).
9. **CTA akhir + Form Pemesanan** (section id `#order`).
10. **Footer** — kontak, alamat perusahaan.

### 3. Form pemesanan (di landing)
Field:
- Nama lengkap
- WhatsApp (format 62)
- Email
- Qty (default 1, min 1)
- Alamat (text)
- **Pin lokasi GPS** via komponen `MapLocationPicker` (Leaflet) — wajib, sesuai standar Laryzo
- Catatan (opsional)

Ringkasan: Subtotal = qty × 75.000, ongkir "Bayar langsung ke kurir Ojol" (sesuai model Laryzo external ojol).

Setelah submit → panggil edge function baru `multibeauty-checkout`, tampilkan halaman konfirmasi berisi:
- Email + password akun yang otomatis dibuat (agar pembeli bisa login ke `/portal`)
- Nomor order + status
- Tombol "Login ke Portal Saya"

### 4. Backend — edge function `multibeauty-checkout` (public, `verify_jwt = false`)
Alur:
1. Validasi input dengan zod (nama, WA, email, lat/long, qty ≥ 1).
2. Cek email sudah ada di `customers` → jika ada, pakai customer eksisting (skip create + placement).
3. Jika baru:
   - Generate password 8 char, simpan di `customers.plain_password` (sesuai konvensi memory).
   - BFS cari titik kosong upline (reuse logika binary tree placement yang sudah ada di project).
   - Insert `customers` (name, email, whatsapp, address, lat, lng, upline_id, level, password_hash, plain_password).
   - Insert `customer_auth` (email + password hash) supaya bisa login.
4. Buat order di tabel `orders`:
   - `type = 'product'`
   - `product_id` = ID produk Multibeauty Soap dari `system_settings` (`multibeauty_product_id`)
   - `quantity`, `total_price = qty * 75000`, `customer_id`, alamat + GPS, `status = 'pending'`
   - `admin_notes` privat, `item_notes` = catatan pembeli
5. Trigger `sync_points_on_history_change` yang sudah ada akan urus distribusi poin (1% margin ke pembeli + 10 level upline) via mekanisme normal saat order diselesaikan admin.
6. Kirim email selamat datang via Resend (kredensial email + link portal).
7. Notifikasi admin manual order (reuse `notify-admin-manual-order` pattern).

CORS `*`, `refreshSession()` tidak diperlukan karena publik.

### 5. Konfigurasi produk (via System Settings)
Tambah 2 key baru di `system_settings`:
- `multibeauty_product_id` (uuid produk Multibeauty Soap di tabel `products`)
- `multibeauty_price` (default 75000)

Admin memilih produk via UI System Settings existing (tambah section "Multibeauty Landing"). Tidak buat produk otomatis — Anda pilih manual sesuai jawaban.

### 6. Placement upline "random slot kosong"
Reuse fungsi BFS binary-tree placement yang sudah ada. Jika belum diekspos sebagai RPC yang bisa dipanggil edge function tanpa upline seed, tambahkan RPC `find_next_open_binary_slot()` (search_path public, security definer) yang mengembalikan customer_id sebagai upline kandidat. Edge function panggil RPC ini dan set sebagai `upline_id`.

### 7. Navigasi
- Tambah link "Multibeauty" kecil di `Index.tsx` (opsional) — atau biarkan `/multibeauty` sebagai landing terpisah yang dishare via URL/QR.

### Detail teknis singkat
- Aset: `src/assets/multibeauty/hero.jpg`, `testimoni-01..37.jpg`, `legal-*.jpg`.
- Halaman: `src/pages/Multibeauty.tsx` + subkomponen di `src/components/multibeauty/` (Hero, Ingredients, Benefits, Testimonials, Legality, OrderForm, Footer).
- Edge fn: `supabase/functions/multibeauty-checkout/index.ts` (+ config verify_jwt=false).
- Migrasi: RPC `find_next_open_binary_slot()` + 2 row system_settings.
- Route: daftar di `src/App.tsx` di luar provider auth (publik).
- Toaster + validasi zod + rate limit sederhana (cek email/WA duplikat < 5 menit).

### Yang TIDAK dilakukan
- Tidak menyentuh alur admin/mitra existing.
- Tidak menambah pembayaran online — status order `pending`, admin proses manual (sama seperti order manual lain di Laryzo).
- Tidak membuat produk otomatis; Anda pilih produk existing lewat System Settings.
