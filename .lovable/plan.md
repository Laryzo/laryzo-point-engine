## Tujuan

Memperluas akun Mitra agar bisa dipakai usaha jasa (laundry, bengkel, jahit, dll) dengan harga dinamis berdasarkan satuan (kg, jam, meter, pcs) — bukan hanya produk fisik dengan harga tetap. Sistem tetap **hybrid POS**: katalog tersedia sebagai shortcut, tapi kasir bisa edit qty (desimal) saat checkout.

Margin Laryzo 5% tetap berjalan sesuai pola yang sudah ada — mitra input harga yang ingin diterima, sistem otomatis up harga jual ke customer agar mitra tetap menerima penuh setelah dipotong 5%.

---

## Perubahan Database

### `merchant_products` — tambah kolom:
- `item_type` text — `'product'` (default) | `'service'`
- `unit` text — `'pcs'` (default), `'kg'`, `'gram'`, `'jam'`, `'menit'`, `'meter'`, `'liter'`, dll
- `unit_price` numeric — tarif per satuan (untuk jasa). Untuk produk tetap pakai `price`.
- `allow_qty_decimal` boolean — default `false` untuk produk, `true` untuk jasa
- `min_qty` numeric nullable — minimum qty (mis. laundry min 1 kg)

### `merchant_transactions` — tambah kolom:
- `unit` text nullable — satuan saat transaksi (snapshot)
- `qty_decimal` numeric nullable — qty asli sebagai desimal (kolom `qty` lama tetap dipertahankan, di-round untuk kompatibilitas laporan lama)

### `orders` — tambah kolom:
- `qty_decimal` numeric nullable
- `unit` text nullable

(Diperlukan agar pembelian jasa lewat customer portal juga akurat)

---

## Perubahan Form Produk Mitra

`src/components/MerchantProductForm.tsx`:
- Toggle **"Jenis Item: Produk / Jasa"**
- Jika **Jasa**:
  - Field "Satuan" (dropdown: kg, gram, jam, menit, meter, liter, pcs, custom)
  - Field "Tarif per [satuan]" (mengganti label "Harga")
  - Field "Min. qty" (opsional)
  - Stok disembunyikan/auto-set `-1` (jasa unlimited)
- Jika **Produk**: form tetap seperti sekarang
- Preview harga jual otomatis (harga mitra ÷ 0.95, dibulatkan) ditampilkan agar mitra paham yang dilihat customer

---

## Perubahan POS Kasir Mitra

`src/pages/MerchantDashboard.tsx` (atau halaman POS terkait):
- Saat klik item bertipe **jasa**, popup input qty desimal (mis. `3.75`) dengan satuan terlihat ("3.75 kg")
- Total per baris = `unit_price × qty_decimal`, mendukung 2 desimal
- Tetap bisa **override harga manual** untuk kasus khusus (sesuai pilihan hybrid)
- Tombol **"Item Cepat"** untuk tambah baris ad-hoc (nama + harga + qty) tanpa harus ada di katalog — berguna untuk jasa baru/satu kali

---

## Perubahan Edge Functions

### `merchant-checkout`:
- Terima `qty` sebagai number (desimal diperbolehkan)
- Hitung `total = price × qty` dengan presisi desimal
- Margin Laryzo 5%, distribusi poin 1% ke customer + 10 upline tetap sama
- Simpan `qty_decimal` dan `unit` ke `merchant_transactions`

### `merchant-product-purchase` (pembelian customer dari customer shop):
- Dukung produk bertipe jasa dengan qty desimal dari payload
- Validasi `min_qty`
- Hitung `pointPrice × qty_decimal` untuk total

---

## Perubahan UI Customer Shop

`src/pages/CustomerShop.tsx`:
- Item jasa tampilkan "Rp X.XXX / kg" alih-alih "Rp X.XXX"
- Tombol "Beli" buka modal input qty desimal untuk jasa
- Total dihitung live sebelum checkout

---

## Detail Teknis

**Formula harga jual untuk customer** (tetap, sudah ada):
```
selling_price = Math.ceil((mitra_price / 0.95) / 500) * 500
laryzo_fee = selling_price - mitra_price
```

**Untuk jasa**: formula diterapkan pada `unit_price`, bukan total. Total = `selling_unit_price × qty_decimal`.

**Distribusi poin** (tetap):
- 1% × `laryzo_fee_total` ke customer (level 0)
- 1% × `laryzo_fee_total` ke setiap upline (1–10)
- Skip jika `points_blocked`

**Kompatibilitas mundur**: produk lama (tanpa `item_type`) diperlakukan sebagai `'product'` default — tidak ada perubahan perilaku.

---

## File yang Diubah

- Migration baru: tambah kolom di `merchant_products`, `merchant_transactions`, `orders`
- `src/components/MerchantProductForm.tsx` — toggle produk/jasa + field satuan/tarif
- `src/pages/MerchantDashboard.tsx` (atau komponen POS) — qty desimal + item cepat
- `src/pages/CustomerShop.tsx` — tampilan & input qty untuk jasa
- `supabase/functions/merchant-checkout/index.ts` — dukungan qty desimal
- `supabase/functions/merchant-product-purchase/index.ts` — dukungan qty desimal
- Update memory: tambah catatan jenis item produk/jasa untuk Mitra