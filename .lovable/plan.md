
# Update Alamat Pengirim Email ke no-reply@laryzo.biz.id

## Ringkasan
Mengubah alamat pengirim email di 3 edge function dari domain lama ke `no-reply@laryzo.biz.id`.

## Perubahan

### 1. `supabase/functions/auth-reset-request/index.ts` (baris 122)
- Dari: `"Laryzo <onboarding@resend.dev>"`
- Ke: `"Laryzo <no-reply@laryzo.biz.id>"`

### 2. `supabase/functions/auth-recover-email/index.ts` (baris 98)
- Dari: `"Laryzo <onboarding@resend.dev>"`
- Ke: `"Laryzo <no-reply@laryzo.biz.id>"`

### 3. `supabase/functions/merchant-register-customer/index.ts` (baris 80)
- Dari: `'Laryzo <no-reply@laryzo.com>'`
- Ke: `'Laryzo <no-reply@laryzo.biz.id>'`

## Detail Teknis
- Total 3 file, masing-masing hanya 1 baris yang berubah (string `from`)
- Setelah perubahan, edge function akan otomatis di-deploy ulang
- Domain `laryzo.biz.id` sudah terverifikasi di Resend, jadi email akan langsung bisa terkirim
