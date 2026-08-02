# Pulihkan Fitur Halaman Customer List (Admin)

## Masalah yang dikonfirmasi

`src/components/CustomerListEnhanced.tsx` (komponen yang dipakai di menu Customers) terpotong saat optimasi sebelumnya. Di akhir file hanya tersisa komentar `{/* Modals and other UI components... */}`, sehingga:

- Tombol **Import Customer dari Excel** hilang (komponen `ImportExcel` sudah di-import tapi tidak pernah dirender).
- Tombol **Export ke CSV / Excel** hilang (`exportToCSV` / `exportToExcel` di-import tapi tidak dipakai).
- Kolom tabel tinggal 5 (Nama, WhatsApp, Level, Poin, Password) — kolom lain hilang.
- Modal **Edit**, konfirmasi **Hapus**, **Adjust Poin**, **Generate Password**, dan **Share WhatsApp** tidak dirender, jadi aksinya tidak bisa dipakai walau handler-nya masih ada di file.

## Yang akan dikerjakan

1. **Toolbar header** — tambahkan kembali di samping "Update Poin":
   - Import Customer dari Excel (`ImportExcel` dengan `onSuccess={fetchCustomers}`)
   - Export CSV dan Export Excel (dropdown) dari data customer yang tampil
   - Generate Password Semua (bulk auth) — hanya Super Admin

2. **Kolom tabel** — lengkapi kembali: Nama + Email, WhatsApp, Level, Upline & Posisi, Poin, Status Poin (blokir/aktif), Password (dengan tombol Copy), Tanggal Daftar. Kolom Password/adjust poin tetap mengikuti aturan RBAC: hanya Super Admin yang bisa menyesuaikan poin.

3. **Aksi per baris** — pasang kembali:
   - Edit (nama, email, WhatsApp, upline, posisi) dengan peringatan bila customer punya downline
   - Hapus dengan konfirmasi
   - Adjust Poin (tambah/kurang + alasan) — Super Admin saja
   - Generate/Reset Password per customer
   - Share WhatsApp (modal `ShareWhatsAppModal`)

4. **Render semua modal** yang hilang di akhir komponen: edit dialog, adjust poin dialog, WhatsApp share modal.

5. Pagination dan pencarian yang sudah ada dipertahankan; tidak ada perubahan skema database atau logika poin.

## Catatan teknis

- Semua handler (`handleEdit`, `handleSaveEdit`, `handleDelete`, `handleAdjustPoints`, `handleGeneratePassword`) sudah ada dan akan dipakai apa adanya.
- `EnhancedTable` sudah mendukung `onEdit`, `onDelete`, `onShareWhatsApp`, `onExport`, jadi export/share disambungkan lewat props tersebut agar bekerja untuk baris terpilih.
- Perubahan hanya di `src/components/CustomerListEnhanced.tsx` (frontend).
