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

**Status: PASS.**

Fixture `TROLL2` dibuat dengan 11 level penerima dan distribusi awal diproses dengan hasil `point_records_created=11`, `total_profit=15000`, dan `points_per_level=150`. Snapshot sebelum failure berisi **11 point_history**, total **Rp1.650**, saldo customer fixture yang sesuai, dan transaction row yang konsisten.

Temporary wrapper test-only kemudian memperoleh advisory lock dan row lock transaksi, menjalankan `DELETE FROM point_history` untuk transaction ID tersebut, lalu memaksa exception `TEST_ONLY_FORCED_FAILURE_AFTER_DELETE`. Exception tertangkap pada test transaction. Hasil assertion aktual:

| Assertion | Nilai aktual |
|---|---:|
| Exception tertangkap | `true` |
| Error | `TEST_ONLY_FORCED_FAILURE_AFTER_DELETE` |
| Histori sebelum | 11 record / Rp1.650 |
| Histori sesudah | 11 record / Rp1.650 |
| Histori identik | `true` |
| Saldo identik | `true` |
| Transaksi identik | `true` |
| Rollback pass | `true` |

Dengan demikian, mutation DELETE yang dipaksa gagal tidak meninggalkan record parsial, tidak menggandakan poin, dan tidak mengubah saldo customer.

## Cleanup status

**Status: PASS.**

Seluruh fixture dan temporary wrapper sudah dihapus dari project test-only. Verifikasi akhir menghasilkan `fixture_customers_remaining=0`, `fixture_transactions_remaining=0`, `fixture_history_remaining=0`, dan `temporary_wrapper_count=0`. Tidak ada operasi pada production.

## Repository dan PR

Perubahan laporan ini dibuat pada branch `audit/fix-point-engine` dan akan di-push ke PR #3. Tidak ada perubahan formula bisnis dan tidak ada merge ke `main`.
