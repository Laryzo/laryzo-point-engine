## Rencana: Fallback PPOB ke WhatsApp Admin Saat Digiflazz Gagal

### Latar belakang
Saat ini Digiflazz tidak bisa diakses karena IP whitelist (perlu VPS proxy). Akibatnya semua order PPOB customer otomatis gagal & poin di-refund. Ide ini menjadikan **WhatsApp admin sebagai jalur cadangan**: jika Digiflazz tidak terhubung atau menolak transaksi, order **tidak digagalkan** — melainkan dialihkan ke admin via WhatsApp untuk diproses manual.

### Konsep alur baru

```text
Customer order PPOB
        │
        ▼
Buat order (status: pending) + potong poin
        │
        ▼
Edge function digiflazz-topup
        │
        ├── Sukses ──► status=completed, distribusi poin (alur lama)
        │
        ├── Pending ─► status=processing (alur lama)
        │
        └── GAGAL / Tidak bisa konek
                │
                ▼
          status = 'manual_pending'
          digiflazz_status = 'manual_fallback'
          (poin TIDAK di-refund — pesanan tetap aktif)
                │
                ▼
          Customer: tampil tombol
          "Hubungi Admin via WhatsApp"
          (deep link wa.me/<no_admin>?text=...)
                │
                ▼
          Admin proses manual di Digiflazz dashboard /
          provider lain, lalu di /admin/orders
          klik "Tandai Sukses" atau "Tandai Gagal & Refund"
```

### Yang ditambahkan

#### 1. Setting baru di System Settings (admin)
Tambahkan 2 field di halaman `SystemSettings.tsx`:
- **Nomor WhatsApp Admin PPOB** (`admin_ppob_wa_number`) — format `628xxxxxxxxxx`
- **Aktifkan Fallback WhatsApp** (`ppob_fallback_enabled`) — toggle on/off

Disimpan di tabel `system_settings` (sudah ada).

#### 2. Status order baru: `manual_pending`
Tambah satu nilai status logis (tidak perlu migration karena kolom `status` bertipe text). Order dengan status ini berarti "menunggu admin proses manual via WhatsApp".

#### 3. Perubahan di `digiflazz-topup` edge function
Pada cabang **failed / network error**:
- Cek apakah `ppob_fallback_enabled = true` dan `admin_ppob_wa_number` terisi.
- Jika ya:
  - Set order: `status = 'manual_pending'`, `digiflazz_status = 'manual_fallback'`, `digiflazz_message = 'Dialihkan ke admin (WhatsApp)'`
  - **Jangan refund poin** (poin tetap terpotong, akan didistribusi saat admin tandai sukses)
  - Return `success: true, manual_fallback: true, admin_wa: '628xxx'`
- Jika tidak: jalankan alur refund lama.

Juga tangkap network error (catch outer) dengan logika yang sama.

#### 4. Customer side — `CustomerShop.tsx` & `CustomerOrders.tsx`
- Saat checkout, jika response berisi `manual_fallback: true`, tampilkan toast "Pesanan dialihkan ke admin" dan navigasi ke halaman pesanan.
- Di `CustomerOrders.tsx`, untuk order PPOB ber-status `manual_pending`:
  - Badge kuning "Menunggu Admin"
  - Tombol **"Hubungi Admin via WhatsApp"** dengan deep link berisi template:
    ```
    Halo Admin, saya order PPOB:
    • Produk: {nama_produk}
    • Nomor tujuan: {input_value}
    • Order ID: {short_id}
    • Customer: {nama}
    Mohon diproses. Terima kasih.
    ```

#### 5. Admin side — `OrderManagement.tsx`
Untuk order ber-status `manual_pending`:
- Badge khusus "Manual (WA)"
- Tombol **"Tandai Sukses"** → set `status='completed'`, `processed_at=now()`, distribusi poin (panggil RPC atau replikasi logika `distributePoints` di edge function baru `ppob-mark-manual`).
- Tombol **"Tandai Gagal & Refund"** → set `status='failed'`, insert `point_history` refund.
- Tombol **"Buka WA Customer"** untuk koordinasi.

Untuk menjaga distribusi poin tetap konsisten, dibuat edge function baru: **`ppob-manual-resolve`** yang menerima `{order_id, action: 'success'|'fail', sn?: string}` dan menjalankan logika yang sama dengan cabang sukses/gagal di `digiflazz-topup`. Ini memastikan distribusi 1% upline tetap berjalan rapi.

#### 6. Tipe & label
- `getStatusLabel`/`getStatusColor` di customer & admin pages ditambah case `manual_pending`.

### File yang akan diubah/dibuat

**Diubah:**
- `supabase/functions/digiflazz-topup/index.ts` — branch fallback
- `src/pages/SystemSettings.tsx` — 2 field setting baru
- `src/pages/CustomerShop.tsx` — handle response `manual_fallback`
- `src/pages/CustomerOrders.tsx` — tombol WA untuk manual_pending
- `src/pages/OrderManagement.tsx` — tombol resolve manual

**Dibuat:**
- `supabase/functions/ppob-manual-resolve/index.ts` — admin tandai sukses/gagal manual

### Yang TIDAK berubah
- Logika sukses normal Digiflazz (alur cepat tetap dipakai begitu proxy aktif)
- Refund otomatis tetap berlaku jika fallback dimatikan
- Distribusi poin 1% (formula sama, dipanggil saat admin tandai sukses)
- Database schema (tidak perlu migration)

### Catatan keamanan
- `ppob-manual-resolve` memvalidasi pemanggil adalah admin (JWT email cocok di tabel `admins`).
- Setting WA admin disimpan di `system_settings` (sudah RLS admin-only).

Setelah Anda setujui, saya akan implementasikan dan langsung deploy edge function-nya.
