## Sinkronisasi Landing Page Multibeauty dengan Referensi

Tujuan: menyamakan konten, urutan section, gambar, dan copy landing `/multibeauty` agar identik dengan `https://id.tapsite.ai/multibeauty-soap`. Builder + arsitektur tetap; yang diubah adalah seed `defaults.ts`, sedikit tweak renderer, dan migrasi seed ulang draft.

### Section list final (16 blok, urut persis referensi)

1. **Hero** — badge dihapus, judul: `Transformasi Kulit:` + baris kedua accent inline `Cerah Alami` (hijau) + ` & Bebas Masalah`. Gambar produk kuning "Say Goodbye Pimples".
2. **Text – Masalah** — `Lelah dengan Masalah Kulit yang Tak Kunjung Usai?` + paragraf frustrasi kulit.
3. **Text – Intro Solusi** — subtitle `Saatnya Beralih ke Solusi Alami yang Efektif: Multibeauty Soap!` + paragraf.
4. **Features 3 kolom** — `Mengapa Memilih Multibeauty Soap?` (Formula Alami Terbaik / Solusi Multi-guna / Terbukti Berkhasiat) — teks disamakan verbatim.
5. **Features 3 kolom** — `Kekuatan Unik Alam dalam Setiap Sabun` (Madu Murni 🍯, Spirulina 🌿, Gamat 🌊).
6. **Checklist** — `Manfaat Luas Multibeauty Soap untuk Kulit & Tubuh Anda` (6 item ✔️).
7. **Usage 4 kolom** — `Satu Sabun, Segala Kebutuhan Perawatan!` (Sabun Wajah, Sabun Mandi, Shampo, Pasta Gigi) + footer.
8. **Comparison** — `Stop Membuang Uang untuk Perawatan yang Rumit!`
   - Kiri "Cara Lama": 10 item persis (Shampo Khusus, Sabun Wajah Jerawat, Sabun Mandi Gatal, Obat Totol Jerawat, Obat Luka, Obat Luka Bakar, Salep Gatal & Herpes, Pasta Gigi Khusus, Obat Sakit Gigi, Obat Sariawan) + "…dan banyak lagi!" + total `Rp 415.000++`.
   - Kanan "Solusi Cerdas: Multibeauty": harga `Rp 450.000`, benefits `Isi 6 Pcs untuk Pemakaian Hingga 6 Bulan!`, `Jauh Lebih Hemat & Sangat Praktis`, `Mengatasi Semua Masalah Di Atas`, footer hemat `Rp 75.000/bulan`.
9. **Before/After** — 4 pasang persis referensi (Siti Aminah, Budi Santoso, Sri Wahyuni, Arianto) memakai URL `driplab.b-cdn.net`. Disclaimer `*Hasil dapat bervariasi pada setiap individu.`
10. **Testimonials 2 kolom** — 4 kartu dengan nama & lokasi referensi: Sari L. (Jakarta), Sri Wahyuni (Bandung), Ibu Ani (Surabaya), Nisa W. (Yogyakarta), pakai URL foto `storage.tapsite.ai` + `driplab.b-cdn.net`.
11. **Text CTA kecil** — `Anda Terinspirasi?` + ajakan bergabung.
12. **Gallery** — `Bukti Nyata Pengguna` dengan ~25 URL screenshot `driplab.b-cdn.net` (semua thumbnail testimoni dari referensi), 5 kolom.
13. **Legal** — dipertahankan (PT. Angkasa Wijaya Internasional + 3 badge).
14. **Countdown** — `Penawaran Spesial Terbatas!` + bonus `Beli Multibeauty Soap Hari Ini & Dapatkan Sabun GRATIS Setiap Bulan!`
15. **Checkout** — `Satu Langkah Lagi Menuju Kulit Sehat` + subtitle referensi + harga `Rp 450.000` (bukan 75.000), tombol `Kirim Pesanan Sekarang`.
16. **Footer** — brand Multibeauty Soap.

Section "Dikerubungi Semut" **dihapus** (tidak ada di referensi).

### Perubahan file

**`src/lib/landing/defaults.ts`** — tulis ulang seluruh `defaultMultibeautySections` sesuai list di atas. Ganti sumber gambar dari `bundledImages` ke URL asli tapsite (driplab CDN + storage.tapsite.ai) untuk hero, produk box, before/after, dan foto testimonial. Hapus penggunaan `antsImage` & imageText.

**`src/components/landing/LandingRenderer.tsx`** — sedikit tweak hero agar `titleAccent` bisa render inline (bukan selalu `<br/>`), atau tambahkan flag `accentInline` untuk mendukung layout "Cerah Alami & Bebas Masalah" (accent hanya di dua kata pertama). Pendekatan: split `titleAccent` di karakter `|` → sebelum `|` = accent, sesudah = teks normal lanjutan pada baris yang sama.

**Migrasi baru** — reset `sections_draft` dan `sections_published` untuk `slug='multibeauty'` ke seed baru supaya halaman live langsung ikut update (opsional; kalau admin sudah edit manual, cukup buka builder → Publish ulang. Saya sertakan migrasi reset karena user meminta hasilnya "sama persis" sekarang).

### Detail teknis kecil

- Semua URL gambar referensi diakses langsung dari CDN mereka (public hotlink). Kalau nanti diblokir, admin bisa upload manual lewat builder.
- Warna tema tetap (hijau `#059669`, dark `#065f46`, accent `#f59e0b`) — sudah cocok dengan palet referensi.
- Font tetap Inter.
- Fitur builder (drag & drop, edit, publish) tidak diubah — admin tetap bisa memodifikasi setelah reseed.

### Files
- edit `src/lib/landing/defaults.ts`
- edit `src/components/landing/LandingRenderer.tsx` (hero accent inline)
- new `supabase/migrations/xxx_reseed_multibeauty_landing.sql`
