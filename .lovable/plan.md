

# Fase 1: Database & Scaling — Fondasi SuperApp Laryzo

## Ringkasan
Memperkuat fondasi database dan performa aplikasi dengan memperluas tabel `orders`, menambahkan index, menerapkan pagination, dan mengoptimalkan dashboard agar siap untuk ekspansi modul delivery, wallet, dan marketplace.

## Perubahan yang Dilakukan

### 1. Migrasi Database

Tambahkan kolom baru pada tabel `orders` yang sudah ada (TANPA membuat tabel baru):

```text
orders (kolom baru):
  + order_type       TEXT DEFAULT 'ppob'    -- 'ppob' | 'food' | 'product'
  + delivery_type    TEXT DEFAULT 'none'    -- 'none' | 'pickup' | 'external_ojol'
  + delivery_status  TEXT                   -- 'waiting_driver' | 'picked_up' | 'delivered'
  + merchant_id      UUID (nullable, FK -> merchants.id)
  + pickup_address   TEXT (nullable)
  + delivery_address TEXT (nullable)
  + delivery_notes   TEXT (nullable)
```

Tambahkan index performa:
- `idx_orders_created_at` pada `orders(created_at DESC)`
- `idx_orders_status` pada `orders(status)`
- `idx_orders_merchant_id` pada `orders(merchant_id)` 
- `idx_orders_order_type` pada `orders(order_type)`
- `idx_merchant_transactions_merchant_id` pada `merchant_transactions(merchant_id)`
- `idx_merchant_transactions_created_at` pada `merchant_transactions(created_at DESC)`

Persiapan tabel wallet (struktur saja, belum aktif):
- `wallet_balances` — `id, user_id, user_type, balance, updated_at`
- `wallet_transactions` — `id, wallet_id, amount, type (debit/credit), reference_order_id, description, created_at`

### 2. Optimasi Admin Dashboard (`src/pages/Dashboard.tsx`)

Saat ini dashboard mengambil SEMUA data (`select('*')`) untuk menghitung statistik. Akan diubah menjadi:
- Gunakan `select('id', { count: 'exact', head: true })` untuk menghitung total tanpa mengunduh semua baris
- Tambahkan filter tanggal hari ini untuk statistik harian
- Tambahkan kartu: "Order Hari Ini", "Rasio PPOB vs UMKM", "Merchant Aktif"

### 3. Optimasi Merchant Dashboard (`src/pages/MerchantDashboard.tsx`)

- Limit transaksi dari 100 menjadi 10 di halaman utama POS
- Tambahkan statistik ringkas: total pendapatan hari ini, jumlah order hari ini
- Tampilkan hanya 10 order terakhir di riwayat

### 4. Pagination pada Order Management (`src/pages/OrderManagement.tsx`)

- Terapkan pagination server-side (20 order per halaman)
- Tambahkan navigasi halaman (Previous/Next)
- Ganti `fetchOrders` dari mengambil semua menjadi mengambil per halaman dengan `.range()`

### 5. Migrasi Data Existing

Semua order yang sudah ada akan otomatis mendapat `order_type = 'ppob'` dan `delivery_type = 'none'` dari DEFAULT value, sehingga tidak ada data yang rusak.

---

## Detail Teknis

### File yang Diubah
| File | Perubahan |
|------|-----------|
| `supabase/migrations/` (baru) | Migrasi SQL: kolom baru, index, tabel wallet |
| `src/pages/Dashboard.tsx` | Optimasi query stats, tambah kartu analytics harian |
| `src/pages/MerchantDashboard.tsx` | Limit query, tambah stats ringkas harian |
| `src/pages/OrderManagement.tsx` | Pagination server-side 20/halaman |
| `src/integrations/supabase/types.ts` | Auto-update dari migrasi |

### Yang TIDAK Diubah
- Flow PPOB (Digiflazz) tetap utuh
- Flow checkout merchant-checkout tetap utuh
- Autentikasi admin/customer/merchant tetap sama
- RLS policies existing tidak dimodifikasi (hanya tambah policy untuk kolom baru jika diperlukan)

### RLS untuk Wallet (Persiapan)
- `wallet_balances`: user hanya bisa baca milik sendiri
- `wallet_transactions`: user hanya bisa baca milik sendiri
- Admin bisa baca semua

