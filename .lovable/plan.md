## Masalah

Tombol-tombol yang dijanjikan secara teknis sudah ada di kode, tapi tidak terlihat oleh user karena:

1. **Admin (`OrderManagement.tsx`)**: tombol "Tandai Sukses / Tandai Gagal / Hubungi Customer" hanya berupa **ikon kecil** (`variant="ghost"`, `size="sm"`, tanpa label teks) di kolom aksi tabel. Admin yang tidak hover tooltip tidak tahu artinya.
2. **Customer (`CustomerOrders.tsx`)**: dulu direncanakan tombol hijau "Hubungi Admin via WhatsApp" langsung dengan template otomatis di kartu pesanan. Implementasi terbaru malah menggantinya jadi "Buka Halaman Konfirmasi WhatsApp" yang mengarahkan ke route `/portal/orders/:id/manual`. User merasa tombol WA langsung yang dijanjikan hilang.

## Perubahan

### 1. `src/pages/CustomerOrders.tsx`
Pada blok `order.status === 'manual_pending' && order.order_type === 'ppob'`:

- Tambahkan **tombol hijau utama**: "Hubungi Admin via WhatsApp" — gunakan helper `buildWaLink(order)` yang **sudah ada** (template berisi produk, nomor tujuan, order ID, nama customer). `<a target="_blank">` ke `wa.me/...`. Disable kalau `adminWa` belum di-set.
- Pertahankan tombol sekunder (outline) "Buka Halaman Konfirmasi" → tetap navigate ke `/portal/orders/:id/manual` untuk fitur konfirmasi terima / batalkan.

### 2. `src/pages/OrderManagement.tsx`
Untuk baris dengan `status === 'manual_pending'`:

- Render tombol-tombol **dengan label teks**, bukan hanya ikon. Contoh:
  - `<Button size="sm" className="bg-green-600 ...">✓ Tandai Sukses</Button>`
  - `<Button size="sm" variant="destructive">✗ Tandai Gagal</Button>`
  - `<Button size="sm" variant="outline" className="text-green-700 border-green-600">WhatsApp Customer</Button>`
- Bungkus dalam `flex flex-wrap gap-2` agar rapi di mobile.
- Tambahkan banner kecil di atas baris (atau badge mencolok di kolom status): "Perlu tindakan manual" agar admin langsung sadar saat melihat tabel.

### 3. Tidak ada perubahan database / edge function
Logika back-end (`ppob-manual-resolve`, distribusi poin, refund) sudah benar — hanya UI yang perlu dipertegas.

## File yang diubah
- `src/pages/CustomerOrders.tsx`
- `src/pages/OrderManagement.tsx`

## Yang TIDAK berubah
- Edge functions, database schema, halaman `CustomerOrderManual.tsx`, alur notifikasi email admin, realtime channel — semua tetap.
