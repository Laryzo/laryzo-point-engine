

# Fix: Pembelian Produk Mitra & Registrasi Customer

## Masalah yang Ditemukan

### 1. Customer tidak bisa melihat/membeli produk mitra
Semua kebijakan keamanan (RLS) pada tabel `merchant_products` bersifat **RESTRICTIVE** (ketat). Artinya, SEMUA kebijakan harus lolos bersamaan. Saat customer mengakses data:
- Kebijakan admin: GAGAL (bukan admin)
- Kebijakan customer: LOLOS
- Kebijakan merchant: GAGAL (bukan merchant)

Karena ada yang gagal, customer tidak bisa melihat produk mitra sama sekali, sehingga daftar produk mitra selalu kosong.

**Solusi:** Ubah semua kebijakan RLS menjadi PERMISSIVE (longgar), sehingga cukup SATU kebijakan yang lolos.

### 2. Mitra tidak bisa mendaftarkan customer baru
Fungsi `merchant-register-customer` memvalidasi token login menggunakan Service Role client, yang tidak kompatibel dengan sistem signing keys di Lovable Cloud. Token merchant dianggap tidak valid, sehingga fungsi mengembalikan error 401 (Unauthorized).

**Solusi:** Gunakan anonClient dengan header Authorization dari user untuk validasi token, sama seperti fungsi `merchant-product-purchase` yang sudah berjalan.

---

## Langkah Implementasi

### Langkah 1: Perbaiki RLS `merchant_products`
Migrasi database untuk menghapus kebijakan RESTRICTIVE dan membuat ulang sebagai PERMISSIVE:
- Admin: bisa kelola semua produk mitra
- Merchant: bisa kelola produk milik sendiri
- Customer: bisa baca produk aktif saja

### Langkah 2: Perbaiki auth di `merchant-register-customer`
Update fungsi backend untuk menggunakan `anonClient` saat validasi token, bukan service role client.

---

## Detail Teknis

### Database Migration (RLS Fix)
```sql
-- Drop restrictive policies
DROP POLICY IF EXISTS "Admins manage merchant products" ON public.merchant_products;
DROP POLICY IF EXISTS "Customers read active merchant products" ON public.merchant_products;
DROP POLICY IF EXISTS "Merchants manage own products" ON public.merchant_products;

-- Recreate as PERMISSIVE
CREATE POLICY "Admins manage merchant products"
  ON public.merchant_products FOR ALL
  USING (is_authenticated_admin())
  WITH CHECK (is_authenticated_admin());

CREATE POLICY "Customers read active merchant products"
  ON public.merchant_products FOR SELECT
  USING (is_authenticated_customer() AND is_active = true);

CREATE POLICY "Merchants manage own products"
  ON public.merchant_products FOR ALL
  USING (is_authenticated_merchant() AND merchant_id = get_current_merchant_id())
  WITH CHECK (is_authenticated_merchant() AND merchant_id = get_current_merchant_id());
```

### Edge Function Fix (`merchant-register-customer`)
Ubah bagian autentikasi dari:
```typescript
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const { data: { user } } = await supabase.auth.getUser(token)
```

Menjadi:
```typescript
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: authHeader } }
})
const { data: { user } } = await anonClient.auth.getUser(token)
```

### File yang Diubah
1. **Migrasi database** - perbaikan kebijakan RLS merchant_products
2. **supabase/functions/merchant-register-customer/index.ts** - perbaikan validasi token

