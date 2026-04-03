

## Rencana: Tambahkan Tombol Deep Link GoSend, GrabExpress & Maxim di Pesanan Pengiriman Merchant

### Apa yang berubah

Sistem delivery yang ada **tetap dipertahankan** (estimasi ongkir manual, Maps Tujuan, Hubungi Driver). Ditambahkan **3 tombol baru** di setiap order pengiriman ojol: "Pesan GoSend", "Pesan GrabExpress", dan "Pesan Maxim".

### Cara kerja

Ketika merchant klik salah satu tombol, aplikasi ojol terbuka di HP merchant dengan alamat pickup (toko) dan tujuan (customer) sudah terisi otomatis menggunakan koordinat GPS dari data order.

Deep link format:
- **GoSend**: `gojek://gopay/gosend?pickup_lat=X&pickup_lng=Y&drop_lat=X&drop_lng=Y`
- **GrabExpress**: `grab://express?pickup_lat=X&pickup_lng=Y&drop_lat=X&drop_lng=Y`  
- **Maxim**: `maxim://order?from_lat=X&from_lng=Y&to_lat=X&to_lng=Y`

Jika app tidak terinstall, fallback ke Play Store / web masing-masing.

### Perubahan file

**`src/pages/MerchantDashboard.tsx`** (satu-satunya file yang berubah):

1. Tambah fungsi `generateOjolDeepLink(order, provider)` yang membangun URL deep link berdasarkan koordinat merchant + order
2. Di section "Action buttons" (baris ~1553-1575), tambahkan 3 tombol baru **di samping** tombol "Maps Tujuan" dan "Hubungi Driver" yang sudah ada:
   - 🟢 **Pesan GoSend** — deep link ke Gojek GoSend
   - 🟢 **Pesan GrabExpress** — deep link ke Grab Express
   - 🟡 **Pesan Maxim** — deep link ke Maxim
3. Tombol hanya muncul jika koordinat pickup (merchant) dan tujuan (order) tersedia
4. Layout tombol di-wrap agar responsive (flex-wrap) supaya tidak overflow di mobile

### Tidak ada perubahan di:
- Sisi customer (pemesanan tetap sama)
- Estimasi ongkir manual (tetap ada)
- Tombol "Hubungi Driver" dan "Maps Tujuan" (tetap ada)
- Database / backend

