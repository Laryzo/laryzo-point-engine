# Perbaiki Pendaftaran Mitra Gagal

## Masalah
Form daftar mitra menampilkan "Failed to send a request to the Edge Function". Diagnosis:
- Tidak ada satu pun log untuk edge function `merchant-register` (fungsi lain seperti `merchant-login` punya log), artinya fungsi tidak menerima request — kemungkinan besar gagal deploy / gagal boot.
- Import di file masih memakai `https://esm.sh/@supabase/supabase-js@2.52.0`, yang secara pengalaman kadang bikin edge function gagal boot (redirect/integrity drift esm.sh).

## Perbaikan
1. Ganti import di `supabase/functions/merchant-register/index.ts`:
   - `https://esm.sh/@supabase/supabase-js@2.52.0` → `npm:@supabase/supabase-js@2` (selaras dengan panduan Lovable & lebih stabil).
   - Biarkan `bcryptjs` tetap `npm:bcryptjs@2.4.3`.
2. Redeploy fungsi `merchant-register` via `supabase--deploy_edge_functions` agar versi baru aktif.
3. Uji ulang dengan `supabase--curl_edge_functions` menggunakan email dummy untuk memastikan respons 201, lalu cek log via `supabase--edge_function_logs` untuk konfirmasi fungsi ter-boot.

## Tidak diubah
- Logika bisnis pendaftaran (validasi, pembuatan merchant, `merchant_auth`, auth user, sign-in otomatis) tetap sama.
- File frontend `MerchantRegister.tsx` tidak diubah.
- Fungsi lain (`merchant-login`, dsb.) tidak disentuh.
