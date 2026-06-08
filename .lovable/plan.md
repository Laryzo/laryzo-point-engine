Rencana perbaikan:

Lingkup terbatas: hanya tampilan di tabel Riwayat Transaksi Mitra. Logika harga di "Produk Saya" (markup 5% + pembulatan Rp500) dan proses checkout tidak diubah.

1. Kolom "Pendapatan Mitra" di Riwayat Transaksi
   - Dihitung dari harga asli mitra (`cost_price` di Produk Saya) × qty.
   - Prioritas sumber harga asli: `merchant_products.cost_price` (data terbaru dari Produk Saya). Jika produk sudah tidak ada (mis. item ad-hoc / sudah dihapus), pakai `merchant_transactions.merchant_price` yang tersimpan saat checkout.

2. Kolom "Biaya Aplikasi" di Riwayat Transaksi
   - Tidak lagi mengikuti 5% atau nilai `laryzo_fee` lama.
   - Selalu dihitung sebagai: `total harga customer − pendapatan mitra` (dari poin 1).
   - Jika hasilnya negatif (kasus harga manual lebih rendah dari harga asli), tampilkan Rp 0.

File yang diubah:
- `src/pages/MerchantDashboard.tsx` (hanya bagian render kolom di `renderHistory`)