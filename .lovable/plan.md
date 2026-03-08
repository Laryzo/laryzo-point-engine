

## Diagnosis

Masalah utama bukan karena 3 aplikasi digabung jadi satu, tapi karena **semua halaman di-load sekaligus** saat pertama kali buka aplikasi. Tidak ada code splitting / lazy loading.

Fakta:
- `MerchantDashboard.tsx` = **1.839 baris**
- `CustomerShop.tsx` = **1.114 baris**
- `Dashboard.tsx` = **466 baris**
- Semua halaman + komponen besar (leaflet map, xlsx, recharts) di-import langsung di `App.tsx`

Ketika customer buka `/portal/login`, browser juga men-download kode Admin Dashboard, Merchant Dashboard, dan semua dependensinya. Ini menyebabkan loading lambat dan kadang komponen gagal render.

**Tidak perlu pisah jadi 3 aplikasi terpisah.** Cukup gunakan **React lazy loading** agar setiap halaman hanya di-download saat dibutuhkan.

---

## Rencana Perbaikan

### 1. Lazy load semua halaman di `App.tsx`

Ganti semua `import` halaman menjadi `React.lazy()` + bungkus dengan `<Suspense>`:

```typescript
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CustomerShop = lazy(() => import('./pages/CustomerShop'));
const MerchantDashboard = lazy(() => import('./pages/MerchantDashboard'));
// ... semua halaman lainnya
```

### 2. Tambah Suspense fallback loading

Bungkus Routes dengan `<Suspense fallback={<LoadingSpinner />}>` agar user melihat spinner saat chunk di-download.

### 3. Deduplicate React di Vite config

Tambah `resolve.dedupe` di `vite.config.ts` untuk mencegah duplikasi React instance yang menyebabkan context hilang (menu menghilang):

```typescript
resolve: {
  alias: { "@": path.resolve(__dirname, "./src") },
  dedupe: ["react", "react-dom", "react/jsx-runtime"],
},
```

### Hasil yang diharapkan

- **Initial load 50-70% lebih kecil** — customer hanya download kode customer, admin hanya download kode admin
- **Menu tidak hilang lagi** — React instance tunggal, context stabil
- **Tidak perlu pisah jadi 3 aplikasi** — maintenance tetap mudah, satu codebase

