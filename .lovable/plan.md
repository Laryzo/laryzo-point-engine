# Setup VPS Proxy untuk Digiflazz

## Tujuan
Menyediakan VPS dengan IP static Indonesia yang berfungsi sebagai proxy aman antara aplikasi Laryzo (Lovable Cloud) dan API Digiflazz, karena Digiflazz mewajibkan pemanggilan API dari IP Indonesia yang telah di-whitelist.

## Hasil Akhir yang Diharapkan
1. VPS berjalan dengan IP static Indonesia.
2. Aplikasi proxy meneruskan request dari edge function Laryzo ke `https://api.digiflazz.com/v1/transaction`.
3. Proxy dilindungi secret key sehingga tidak bisa dipakai orang lain.
4. Edge function `digiflazz-topup` (dan fungsi terkait) diarahkan ke URL proxy VPS.
5. Webhook Digiflazz tetap diterima langsung oleh edge function `digiflazz-webhook` di Lovable Cloud.

## Tahapan Pekerjaan

### 1. Siapkan VPS
- Rekomendasikan provider VPS dengan lokasi Indonesia (misalnya IDCloudHost, Niagahoster, Cloudflare RPS, atau DigitalOcean Singapore sebagai fallback).
- Spesifikasi minimum: 1 vCPU, 1 GB RAM, Ubuntu 22.04/24.04 LTS.
- Pastikan IP public static dan port 443 terbuka.

### 2. Pasang Infrastruktur Dasar di VPS
- Update sistem dan install Node.js 20 LTS.
- Install PM2 untuk menjalankan proxy sebagai service.
- Install dan konfigurasi Nginx sebagai reverse proxy dengan SSL (Let's Encrypt/certbot).
- Buka firewall (UFW) hanya untuk 22, 80, dan 443.

### 3. Buat Aplikasi Proxy Digiflazz
- Buat folder project `/opt/digiflazz-proxy`.
- Buat server Express/Node.js yang:
  - Menerima POST di `/digiflazz/v1/transaction`.
  - Memvalidasi header `X-Proxy-Secret`.
  - Meneruskan body request ke `https://api.digiflazz.com/v1/transaction`.
  - Mengembalikan response Digiflazz ke client tanpa modifikasi.
- Sertakan logging dasar (timestamp, ref_id, status response) untuk debug.

### 4. Atur Keamanan Proxy
- Generate secret key acak (misalnya 64 karakter hex).
- Simpan secret key di environment variable VPS (`DIGIFLAZZ_PROXY_SECRET`).
- Pastikan endpoint proxy hanya meneruskan ke path transaction Digiflazz; tolak path lain.

### 5. Konfigurasi Aplikasi Laryzo
- Di edge function `supabase/functions/digiflazz-topup/index.ts`, gunakan environment variable `DIGIFLAZZ_PROXY_URL` dan `DIGIFLAZZ_PROXY_SECRET`.
- Jika environment variable tidak diisi, edge function tetap bisa fallback ke API Digiflazz langsung (untuk development/testing).
- Simpan `DIGIFLAZZ_PROXY_URL` dan `DIGIFLAZZ_PROXY_SECRET` sebagai secret di Lovable Cloud.

### 6. Deploy dan Uji
- Jalankan proxy di VPS menggunakan PM2.
- Uji endpoint proxy dengan curl dari local/edge function.
- Lakukan test transaksi PPOB (dengan mode development/testing) untuk memastikan response Digiflazz sampai ke aplikasi.

## Catatan Penting
- Saya tidak bisa membeli VPS langsung; Anda perlu menyediakan VPS sendiri.
- Setelah VPS siap, saya bisa membuat script instalasi otomatis dan mengonfigurasi aplikasi proxy.
- Biaya VPS sepenuhnya ditanggung Anda ke provider pilihan.
