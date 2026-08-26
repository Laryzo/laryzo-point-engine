# Follow-up Validation: True Concurrent Request dan Failure Rollback

Tanggal: 26 Agustus 2026

## Scope dan environment

Test diarahkan hanya ke Supabase TEST `Laryzo Point Engine Test`, project ref `tyjsepbdxwjrzowrxodf`. Branch repository adalah `audit/fix-point-engine`, mulai dari commit `936684a871cf59a6a6cfd00fea3a0c727fe02c90`. Production tidak diakses.

## Test 1 — True concurrent request

**Status: PASS.**

Sebuah fixture `TCONCURRENT` dengan profit Rp15.000 dan genealogy 11 customer (level penerima 0 sampai 10) dibuat di project test. Temporary RPC wrapper hanya di project test dibuat untuk memanggil `distribute_transaction_points(uuid)` melalui REST API. Sepuluh HTTP request independen dikirim paralel memakai 10 worker dan 10 HTTP session yang berbeda.

| Request | HTTP | already_processed | point_records_created | Waktu (ms) |
|---:|---:|---:|---:|---:|
| 1 | 200 | true | 0 | 1422.4 |
| 2 | 200 | false | 11 | 1375.4 |
| 3 | 200 | true | 0 | 1401.0 |
| 4 | 200 | true | 0 | 1449.0 |
| 5 | 200 | true | 0 | 1443.7 |
| 6 | 200 | true | 0 | 1415.3 |
| 7 | 200 | true | 0 | 1426.4 |
| 8 | 200 | true | 0 | 1436.3 |
| 9 | 200 | true | 0 | 1441.5 |
| 10 | 200 | true | 0 | 1415.9 |

Hasil akhir yang diukur setelah seluruh request selesai adalah `history_rows=11`, `history_total=Rp1.650`, `unique_recipient_levels=11`, dan `fixture_balance_total=Rp1.650`. Tidak ada HTTP error atau deadlock. Tepat satu request membuat 11 record; sembilan request lain mengembalikan status idempotent `already_processed=true` dan 0 record baru.

## Test 2 — Failure rollback

**Status: NOT RUN.**

Temporary failure wrapper sudah disiapkan sebagai database object test-only, dan fixture TROLL sudah dibuat. Namun saat akan menjalankan distribusi awal TROLL dan assertion rollback, konektor Supabase mengalami timeout berulang pada tahap pengambilan konfigurasi server. Karena operasi database tidak lagi dapat diverifikasi, test tidak diteruskan dan tidak diklaim PASS.

Metode yang akan digunakan ketika konektor pulih adalah wrapper yang melakukan advisory lock, row lock transaksi, `DELETE FROM point_history` untuk satu transaction ID, lalu `RAISE EXCEPTION 'TEST_ONLY_FORCED_FAILURE_AFTER_DELETE'`. Pemanggilan akan dibungkus dalam block yang menangkap exception, lalu count/sum histori dan saldo customer dibandingkan dengan snapshot sebelum mutation. Wrapper tersebut harus dihapus setelah test.

## Cleanup status

**NOT VERIFIED / PENDING CONNECTOR RECOVERY.**

Cleanup fixture concurrent belum dapat dikonfirmasi setelah konektor timeout. Status terakhir sebelum timeout belum dapat digunakan sebagai bukti bahwa object dan fixture sudah terhapus. Temporary objects/fixtures yang masih mungkin ada di project test adalah wrapper concurrency, wrapper failure, fixture `TCONCURRENT`, dan fixture `TROLL`. Tidak ada satupun berada di production.

## Repository dan PR

Perubahan laporan ini dibuat pada branch `audit/fix-point-engine` dan akan di-push ke PR #3. Tidak ada perubahan formula bisnis dan tidak ada merge ke `main`.
