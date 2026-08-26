# Laporan Validasi Runtime dan Data Integrity

Tanggal eksekusi: 26 Agustus 2026

## Environment

Seluruh operasi database dilakukan pada project Supabase test-only **Laryzo Point Engine Test** dengan ref `tyjsepbdxwjrzowrxodf`, status `ACTIVE_HEALTHY`, region `ap-southeast-1`. Project ini berbeda dari project reference production `jkqtqxwtyqrlhblnaohz`. Tidak ada operasi database pada production.

Schema test berhasil diterapkan setelah dua defect migration yang terbukti diperbaiki. Dari 98 file migration, 87 file schema/perubahan kompatibel diterapkan. Sembilan migration legacy tahun 2025 yang bergantung pada state lama dan dua migration data-only yang mereset atau mengubah seed tertentu tidak dijalankan terhadap database kosong. Ini dicatat sebagai keputusan setup test, bukan penghapusan migration repository.

## Hasil aktual

| Test | Status | Hasil aktual |
|---|---|---|
| Schema migration test database | PASS setelah perbaikan | Initial attempt gagal pada prefiks nomor baris literal di `20260710030000_force_reload_schema_cache.sql`; retry gagal pada `landing_pages.settings_draft` yang belum ada pada schema awal; setelah dua perbaikan, migration apply mengembalikan `success=true` |
| Fixture binary genealogy | PASS | 12 customer dummy dibuat, chain parent/left terbentuk dari level 0 sampai level 11 |
| Profit Rp15.000 | PASS | 11 record, level minimum 0, level maksimum 10, 11 level berbeda, total Rp1.650, setiap record Rp150 |
| Sequential duplicate | PASS | Retry mengembalikan `already_processed=true`, `point_records_created=0`, existing records=11 |
| Sequential duplicate balance | PASS | Total saldo fixture sebelum dan sesudah retry tetap Rp1.650 |
| 10 retry batch pada transaction ID yang sama | PASS untuk duplicate prevention | 10/10 call mengembalikan `already_processed=true`, 10/10 menghasilkan `created=0`; histori tetap 11 record. Ini adalah batch retry pada satu sesi SQL, bukan 10 koneksi HTTP paralel |
| Concurrent 10 HTTP requests | NOT RUN | Belum dapat dibuktikan sebagai concurrency lintas sesi karena konektor database yang tersedia mengekspos satu operasi SQL per call dan Edge Function memerlukan user JWT admin test |
| Replace Rp15.000 -> Rp20.000 | PASS | 11 record, total Rp2.200, 11 record masing-masing Rp200 |
| Replace failure rollback guard | PASS | Replace terhadap UUID tidak ada gagal sebelum mutation; histori sebelum dan sesudah tetap Rp2.200 |
| Mid-process injected failure rollback | NOT RUN | Belum dijalankan karena schema tidak memiliki failure-injection hook test-only dan tidak menambahkan hook ke production function hanya untuk test |
| Blocked customer | PASS | Record blocked recipient=0; upline berikutnya pada level 2=1 record |
| Level 10 boundary | PASS | Distribusi T001 memiliki level 10; tidak ada level 11 |
| Customer tanpa upline | PASS | 1 record personal, total Rp150 |
| Profit = 0 | PASS | 0 record |
| Profit negatif | PASS | 0 record |
| Quantity > 1 | PASS | `(Rp10.000 - Rp5.000) × 3 = Rp15.000`; 11 record, total Rp1.650 |
| 20 binary placement calls | PASS untuk uniqueness/BFS serial path | 20 customer dibuat, duplicate parent-position=0, orphan tidak terdeteksi; eksekusi ini serial dalam satu SQL session sehingga bukan concurrent insertion lintas koneksi |
| Ledger integrity | PASS pada fixture suite | Unique transaction/recipient/level keys, negative points=0 |
| Edge Function unauthorized request | PASS | POST ke test endpoint tanpa token menghasilkan HTTP 401; response memuat `admin token required` |
| Test fixture cleanup | PASS | Final verification: remaining fixture customers=0, transactions=0, point_history=0 |

## Defect yang terbukti saat runtime setup

Migration `20260710030000_force_reload_schema_cache.sql` mengandung prefiks nomor baris literal seperti `22\t--`, `24\tALTER TABLE`, dan `29\tNOTIFY`, sehingga PostgreSQL mengembalikan syntax error 42601. Prefiks tersebut dihapus.

Migration `20260705050532_e6420b5b-97b0-4707-b7f0-886b593d1108.sql` membuat `landing_pages` tanpa kolom `settings_draft` dan `settings_published`, sementara migration berikutnya melakukan insert ke kedua kolom tersebut. Pada database kosong, PostgreSQL mengembalikan error 42703. Kedua kolom ditambahkan ke bootstrap schema dengan default JSONB yang sama dengan migration lanjutan.

Cleanup fixture awal juga menemukan bahwa customer parent tidak dapat dihapus sebelum child dilepas karena foreign key `customers_parent_id_fkey`. Cleanup diperbaiki di harness/reset script dengan melepas `parent_id` dan `position` lebih dahulu; verifikasi akhir menunjukkan seluruh fixture sudah terhapus.

## Batas validasi

Tidak ada hasil aktual yang diklaim untuk concurrency lintas 10 koneksi HTTP atau failure injection di tengah replace. Angka di atas hanya menyatakan skenario yang benar-benar dieksekusi dan hasil yang diamati. Runtime suite utama memakai SQL terisolasi dengan prefix fixture dan seluruh fixture telah dibersihkan.

## Git dan PR

| Item | Nilai |
|---|---|
| Branch | `audit/fix-point-engine` |
| Base | `main` |
| PR | [#3](https://github.com/Laryzo/laryzo-point-engine/pull/3) |
| Merge | Tidak dilakukan |
| Commit validasi/perbaikan | `1ec75e6b661ab2fa6b22a118b911153b8e1567d2` |
