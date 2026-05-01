## Perbaikan Alur Fallback PPOB → WhatsApp Admin

### Masalah yang ditemukan pada implementasi sebelumnya

1. **Tidak ada notifikasi ke admin** — saat order dialihkan ke `manual_pending`, edge function hanya update database. Admin tidak tahu ada order baru kecuali buka halaman Manajemen Pesanan secara manual.
2. **Customer harus mencari sendiri** — setelah toast "Dialihkan ke Admin", customer harus navigate manual ke menu Pesanan, scroll, baru lihat tombol WhatsApp. Banyak yang tidak tahu harus ke mana.
3. **Tidak ada loop konfirmasi** — customer tidak punya tombol untuk menyatakan "saya sudah terima produknya" atau "admin sudah balas saya". Status `manual_pending` hanya bisa diubah oleh admin.

### Konsep alur baru

```text
Customer checkout PPOB
        │
        ▼
Order dibuat, poin dipotong
        │
        ▼
digiflazz-topup gagal/timeout
        │
        ├── Fallback aktif?
        │       │
        │       ▼
        │   1. Update order → manual_pending
        │   2. KIRIM EMAIL ke admin (Resend) berisi
        │      detail order + link WA customer
        │   3. Return manual_fallback=true + admin_wa
        │       │
        │       ▼
        │   Customer otomatis di-REDIRECT ke
        │   halaman konfirmasi khusus:
        │   /portal/orders/{id}/manual
        │   - Detail pesanan
        │   - Tombol BESAR "Buka WhatsApp Admin"
        │     (sudah dibuka otomatis di tab baru)
        │   - Tombol "Saya sudah terima produk"
        │     → memberitahu admin via realtime
        │   - Tombol "Batalkan & Refund poin"
        │     (jika belum diproses admin)
        │
        ▼
Admin terima email + lihat badge merah
"Manual Pending" di OrderManagement
(realtime counter di sidebar)
        │
        ▼
Admin proses manual di Digiflazz dashboard,
balas WA customer, lalu klik "Tandai Sukses"
di OrderManagement → poin didistribusi
```

### Yang akan dibuat / diubah

#### 1. Edge function baru: `notify-admin-manual-order`
File: `supabase/functions/notify-admin-manual-order/index.ts`

- Dipanggil dari `digiflazz-topup` saat fallback diaktifkan.
- Ambil semua admin dari tabel `admins` (email).
- Kirim email via Resend (sudah ada `RESEND_API_KEY`) dari `no-reply@laryzo.biz.id` dengan:
  - Subject: `[URGENT] Order PPOB Manual - {nama_customer}`
  - Body: detail order (produk, nomor tujuan, customer, WA customer), link WA customer (`wa.me/...`), link langsung ke `/admin/orders` filter manual_pending.
- `verify_jwt = false` di config.toml, validasi via internal call (header `X-Internal-Secret` dari env).

#### 2. Modifikasi `supabase/functions/digiflazz-topup/index.ts`
- Setelah `tryWhatsAppFallback` return `applied: true`, **invoke** `notify-admin-manual-order` (fire-and-forget, jangan block response ke customer).
- Tambahkan order detail (produk, customer name, customer wa) di payload notifikasi.

#### 3. Halaman baru: `src/pages/CustomerOrderManual.tsx`
Route baru: `/portal/orders/:orderId/manual`

UI:
- Header status: badge orange "Menunggu Admin"
- Card detail order (produk, nomor tujuan, total poin, waktu)
- **CTA besar (full width, hijau)** "Buka WhatsApp Admin Sekarang" — auto-trigger pada mount juga (window.open) sehingga customer langsung ditarik ke WA.
- Tombol secondary "Saya sudah terima produknya" → set order field baru `customer_confirmed_at` (akan dipantau admin di OrderManagement sebagai indikator visual).
- Tombol tertiary "Batalkan & Minta Refund" → hanya aktif jika order masih `manual_pending` >5 menit, set status `failed` dan refund poin via edge function `ppob-manual-resolve` action `customer_cancel`.
- Polling realtime ke order tsb — jika status berubah jadi `completed` tampilkan konfirmasi sukses + SN, jika `failed` tampilkan info refund.

#### 4. Modifikasi `src/pages/CustomerShop.tsx`
- Saat respon `manual_fallback: true`, **navigate(`/portal/orders/${order.id}/manual`)** alih-alih hanya menampilkan toast.

#### 5. Modifikasi `src/pages/CustomerOrders.tsx`
- Untuk order `manual_pending`, ubah tombol "Hubungi Admin" jadi link ke halaman `/portal/orders/:id/manual` (single source of truth untuk konfirmasi).

#### 6. Modifikasi `src/pages/OrderManagement.tsx`
- Tambah counter realtime: jumlah order `manual_pending` (badge merah berkedip di tab PPOB).
- Auto-refresh saat ada `INSERT/UPDATE` ke `orders` dengan status `manual_pending` (via `supabase.channel`).
- Jika `customer_confirmed_at` terisi, tampilkan badge biru kecil "Customer konfirmasi diterima" di baris tersebut — sinyal kuat bagi admin untuk klik "Tandai Sukses".

#### 7. Modifikasi `supabase/functions/ppob-manual-resolve/index.ts`
- Tambah action baru: `customer_cancel` — divalidasi via JWT customer (bukan admin). Hanya boleh untuk order yang dimiliki customer ybs dan masih `manual_pending`. Lakukan refund poin dan set status `failed`.

#### 8. Tambahan tipe & navigasi
- Tambah route di `src/App.tsx` untuk `CustomerOrderManual`.
- Tambah icon notifikasi (titik merah) di tab navigasi `Pesanan` di portal customer jika ada `manual_pending`.

### Database changes

Hanya satu kolom baru, lewat migration:
```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_confirmed_at timestamptz;
```
RLS sudah cukup (customer bisa update order sendiri lewat edge function service-role; tidak perlu policy baru). Realtime untuk `orders` aktifkan jika belum:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
```

### File summary

**Dibuat:**
- `supabase/functions/notify-admin-manual-order/index.ts`
- `src/pages/CustomerOrderManual.tsx`
- `supabase/migrations/<timestamp>_manual_order_confirmation.sql`

**Diubah:**
- `supabase/functions/digiflazz-topup/index.ts` — invoke notifikasi
- `supabase/functions/ppob-manual-resolve/index.ts` — action `customer_cancel`
- `supabase/config.toml` — daftarkan function baru (`verify_jwt = false`)
- `src/App.tsx` — route baru
- `src/pages/CustomerShop.tsx` — redirect saat fallback
- `src/pages/CustomerOrders.tsx` — link ke halaman manual
- `src/pages/OrderManagement.tsx` — realtime counter + badge customer_confirmed_at

### Yang TIDAK berubah
- Logika sukses normal Digiflazz tetap utuh
- Distribusi poin 1% (formula sama)
- Refund otomatis untuk skenario non-fallback
- Toggle `ppob_fallback_enabled` di System Settings (sudah ada)

Setelah Anda setujui, saya implementasikan + deploy edge function-nya langsung.