# Fitur Top Up Saldo Manual & Pembayaran Saldo/Poin

## Alur Utama

### 1. Top Up Saldo Customer

```
[Wallet Page] → [Form Top Up] → [Halaman Transfer + Nominal Unik] → [Tombol Sudah Transfer] → [Email ke Admin + Halaman Approval Admin]
```

1. Customer buka halaman **Saldo Saya** (`/portal/wallet`)
2. Tekan **TOP UP SALDO** → form: jumlah top up + dropdown rekening tujuan (BCA/Mandiri/dll dari System Settings)
3. Tekan **LANJUT TRANSFER** → sistem generate 3 angka unik random (100-999), tampilkan halaman transfer berisi:
  - Nama bank, no rekening, atas nama
  - Nominal final = `jumlah + 3 angka unik` (misal Rp 100.000 → Rp 100.347)
  - Instruksi transfer + tombol salin no rekening / nominal
4. Setelah transfer, customer tekan **SUDAH TRANSFER**
  - Sistem kirim email ke admin (Resend) berisi: nama customer, WA, jumlah top up, nominal final, bank, waktu
  - Status request = `pending`
5. Admin buka **Permintaan Top Up** di dashboard → review → **Approve** (saldo masuk otomatis) atau **Reject** (dengan alasan)

### 2. Pembayaran Mixed (Poin + Saldo)

Saat checkout di CustomerShop / merchant:

- Tampilkan opsi pembayaran: **Saldo Saja** / **Poin Saja** / **Campuran (Poin dulu, sisanya Saldo)**
- **Logika "Poin dulu, sisanya saldo"**:
  - Jika poin ≥ harga → potong poin saja
  - Jika poin < harga → potong semua poin + sisanya dari saldo
  - Jika poin + saldo masih < harga → tombol **TOP UP SALDO** muncul, redirect ke `/portal/wallet/topup`
- 1 poin = Rp 1

## Database (Migration)

**Tabel baru: `topup_requests**`

- `customer_id`, `amount` (jumlah top up), `unique_code` (3 digit), `transfer_amount` (= amount + unique_code)
- `bank_account_id` (FK ke bank_accounts), `status` (pending/approved/rejected/cancelled)
- `customer_confirmed_at`, `processed_by`, `processed_at`, `admin_notes`

**Tabel baru: `bank_accounts**` (dikelola Super Admin via System Settings)

- `bank_name`, `account_number`, `account_holder`, `is_active`, `display_order`

**Trigger `apply_topup_approval**`: saat status berubah ke `approved`, tambahkan saldo ke `wallet_balances` + insert `wallet_transactions` (type='credit', desc='Top up #ref').

**Kolom baru di `orders` & `merchant_transactions**`: `wallet_used` (numeric default 0). Kolom `points_used` sudah ada di `orders`.

**RLS**: 

- Customer: insert/select own topup_requests
- Admin: select all + update status

## Edge Functions

**Baru:**

- `wallet-topup-create` — validasi jumlah min, generate unique code, insert request
- `wallet-topup-confirm` — customer tekan "sudah transfer" → trigger email ke admin via Resend
- `wallet-topup-resolve` — admin approve/reject (auth admin only)

**Dimodifikasi:**

- `digiflazz-topup` & `merchant-product-purchase`: validasi `wallet_used + points_used ≥ harga`, debit saldo & poin, refund jika gagal

## Frontend

**Halaman baru:**

- `src/pages/CustomerWallet.tsx` — dashboard saldo, riwayat transaksi wallet, tombol Top Up
- `src/pages/CustomerTopupForm.tsx` — form jumlah + dropdown rekening
- `src/pages/CustomerTopupTransfer.tsx` — halaman transfer dengan nominal unik + tombol "Sudah Transfer"
- `src/pages/AdminTopupRequests.tsx` — tabel approval untuk admin
- `src/components/BankAccountManagement.tsx` — CRUD rekening (di SystemSettings, super admin only)

**Komponen baru:**

- `src/components/PaymentMethodSelector.tsx` — radio: saldo / poin / campuran, kalkulasi otomatis kekurangan, tombol "Top Up Saldo" jika kurang

**Dimodifikasi:**

- `App.tsx` — route `/portal/wallet`, `/portal/wallet/topup`, `/portal/wallet/transfer/:id`, `/dashboard/topup-requests`
- `CustomerDashboard.tsx` — card saldo + link
- `CustomerShop.tsx` — integrasi `PaymentMethodSelector`, kirim `wallet_used` & `points_used`
- `useCustomerAuth.tsx` + `customer-refresh` — sertakan `balance` dalam state customer
- `Dashboard.tsx` (admin) — menu "Permintaan Top Up"

## Setup yang Diperlukan

- Min top up default: Rp 10.000 (di system_settings, bisa diubah admin)
- Email admin penerima notifikasi: ambil dari `system_settings.admin_topup_email` (default: email super admin pertama)
- Domain email Resend `no-reply@laryzo.biz.id` sudah aktif

## Catatan Teknis

- Unique code: random 100-999, di-retry jika sudah ada request `pending` dengan transfer_amount sama
- Auto-cancel: top up `pending` > 24 jam otomatis di-cancel via cron (opsional, bisa fase 2)
- Email template: HTML sederhana berisi detail customer + nominal + tombol "Buka Halaman Approval"
- Tambahkan info di halaman transfer + 3 angka unik bahwa: saldo akan terisi beserta 3 angka unik yang ditransfer customer