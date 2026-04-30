## Diagnosis: Kenapa Admin Tidak Bisa Login

Pesan error di layar login adalah:

> "Failed to send a request to the Edge Function"

Ini **bukan** masalah email/password salah, dan **bukan** bug di kode `admin-login`. Hasil pengecekan:

1. Saat dipanggil langsung, endpoint backend memberikan error DNS:
   `dial tcp: lookup ...supabase.co ... no such host`
2. **Tidak ada satu pun log edge function** yang muncul (artinya request browser tidak pernah sampai ke server).
3. Hostname project tidak bisa di-resolve dari mana pun.

### Kesimpulan
Backend Lovable Cloud project ini sedang **tidak aktif / di-pause** (atau masuk state error). Selama backend tidak aktif:
- Login admin gagal (seperti yang Anda alami sekarang)
- Login mitra & customer juga akan gagal
- PPOB / Digiflazz juga tidak akan jalan
- Semua query database & edge function tidak bisa dipanggil

Kondisi ini **tidak bisa diperbaiki dengan mengubah kode** — yang harus dilakukan adalah me-resume / mengaktifkan kembali backend-nya.

---

## Rencana Perbaikan

### Langkah 1 — Aktifkan kembali Lovable Cloud
Anda buka **Connectors → Lovable Cloud** di sidebar Lovable, lalu klik tombol **Resume / Enable** untuk backend project ini.
- Tunggu sampai status backend menjadi **Active / Healthy** (biasanya 30–90 detik).

### Langkah 2 — Verifikasi backend sudah hidup
Setelah Anda klik Resume, beri tahu saya. Saya akan:
1. Cek status backend (DNS hostname & ping).
2. Panggil edge function `admin-login` secara langsung untuk memastikan sudah merespons.
3. Cek log edge function untuk memastikan request masuk dengan normal.

### Langkah 3 — Tes login admin
Setelah backend sehat, Anda coba login lagi dengan `rodaaset@gmail.com` di halaman `/login`. Seharusnya langsung berhasil tanpa perubahan kode apa pun.

### Langkah 4 (opsional) — Jika password lupa
Jika setelah backend aktif Anda masih dapat error "Email atau password salah" (bukan "Failed to send a request..."), saya akan reset password admin Anda lewat database/edge function `admin-reset-password`.

---

## Yang TIDAK perlu diubah
- Kode `admin-login`, `useAuth`, dan halaman `Login.tsx` semuanya sudah benar.
- Tidak ada perubahan database / migration yang dibutuhkan.
- Tidak ada perubahan CORS / konfigurasi.

Masalahnya murni di tingkat **status backend**, bukan di kode aplikasi.
