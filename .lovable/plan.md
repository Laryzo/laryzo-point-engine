
# Perbaiki Rumus Harga Jual Produk Mitra

## Masalah
Rumus saat ini: `harga_jual = harga_asli * 1.1` (markup 10%)
- Contoh: Harga asli 15.000 → 15.000 * 1.1 = 16.500

Ini **salah** karena fee 10% dihitung dari harga jual, bukan dari harga asli. Artinya harga asli harus = harga jual - 10% dari harga jual = harga jual * 0.9.

## Rumus yang Benar
`harga_jual = harga_asli / 0.9`, dibulatkan ke atas per 500.
- Contoh: 15.000 / 0.9 = 16.666,67 → dibulatkan ke 17.000

## Perubahan

### 1. `src/components/MerchantProductForm.tsx`
- **Baris 29** — Ubah rumus harga jual:
  - Dari: `Math.ceil((costNum * 1.1) / 500) * 500`
  - Ke: `Math.ceil((costNum / 0.9) / 500) * 500`
- **Baris 36** — Ubah rumus balik (reverse) saat edit produk:
  - Dari: `Math.round(Number(product.price ?? 0) / 1.1)`
  - Ke: `Math.round(Number(product.price ?? 0) * 0.9)`
- Update label/keterangan: "Harga Asli + 10% fee" menjadi penjelasan yang lebih akurat

### 2. `supabase/functions/merchant-checkout/index.ts`
- **Baris 62** — Fee tetap `total * 0.1` (10% dari harga jual). Ini sudah benar karena fee memang dihitung dari harga jual.
- Tidak perlu diubah.

## Contoh Perhitungan Baru

| Harga Asli | Harga Jual (sebelum) | Harga Jual (sesudah) |
|-----------|---------------------|---------------------|
| 10.000 | 11.000 | 11.500 |
| 15.000 | 16.500 | 17.000 |
| 20.000 | 22.000 | 22.500 |

## Detail Teknis
- 2 baris kode di 1 file frontend yang perlu diubah
- Edge function checkout tidak perlu diubah (fee calculation sudah benar)
- Produk yang sudah ada di database tidak berubah otomatis; merchant perlu edit ulang jika ingin harga baru
