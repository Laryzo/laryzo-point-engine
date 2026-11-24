# Verifikasi Customer Full Service dan Pendaftaran Driver

## Yang Akan Dibangun
- Form verifikasi customer di halaman Profil: nama sesuai KTP, NIK, dan foto KTP. Status ditampilkan sebagai belum diajukan, menunggu, disetujui, atau perlu perbaikan; tidak ada bonus poin verifikasi.
- Akun yang belum disetujui tetap dapat memakai layanan digital dan mengumpulkan poin, tetapi tidak dapat membayar pesanan produk fisik toko/mitra dengan poin. Pemeriksaan dilakukan di aplikasi dan di server agar tidak bisa dilewati. Verifikasi membuka akses layanan driver dan fitur tukar poin ke E-Wallet saat layanan tersebut tersedia.
- Formulir pendaftaran driver hanya untuk customer yang sedang masuk. Semua dokumen wajib dikirim saat pendaftaran: identitas KTP, foto diri, SIM dan masa berlaku, STNK dan masa berlaku pajak, data serta foto kendaraan, dan SKCK beserta masa berlaku.
- Menu pemeriksaan Admin untuk menyetujui atau menolak KTP customer dan pendaftaran driver, disertai catatan koreksi. Karena berkas berisi data identitas sensitif, akses pemeriksaan dibatasi ke Super Admin.
- Berkas disimpan privat; pemilik hanya dapat mengunggah ke foldernya sendiri, sedangkan berkas hanya dapat dilihat Super Admin melalui tautan sementara.

## Rincian Teknis
- Tambahkan tabel aplikasi verifikasi terpisah dari profil customer, tanpa akses baca/tulis langsung dari browser; fungsi server memeriksa customer atau Super Admin sebelum membaca/mengubahnya.
- Buat bucket dokumen privat dan kebijakan unggah berbasis sesi customer serta folder pemilik.
- Tambahkan fungsi server untuk status/pengajuan customer, pengajuan driver, serta antrean dan keputusan Super Admin.
- Tambahkan pemeriksaan verifikasi di proses pembelian mitra dan proses pemakaian poin untuk order fisik.
- Perbarui Profil Customer, halaman pengajuan driver, Dashboard Admin, dan tipe data aplikasi.

## Batas Pekerjaan
- Tidak membangun pencarian/penugasan driver, perjalanan, pelacakan lokasi, dompet driver, atau pembayaran tunai.
- Tidak membuat pencairan poin ke E-Wallet yang belum tersedia; aksesnya akan mengikuti status verifikasi ketika fitur itu dibangun.
- Tidak mengubah data transaksi/customer yang sudah ada.
