# Supabase Test Environment

Dokumen ini mendefinisikan environment disposable untuk runtime dan data-integrity test Laryzo Point Engine. Environment ini **wajib terpisah dari production** dan hanya boleh berisi fixture dummy yang dapat dihapus ulang.

## Audit konfigurasi existing

Repository menggunakan Supabase dengan Edge Functions dan migration SQL di `supabase/`. Client dan Edge Functions membaca `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` dari environment. `supabase/config.toml` memuat project reference `jkqtqxwtyqrlhblnaohz`, yang diperlakukan sebagai production reference oleh test guard. Tidak ada secret yang boleh disimpan di repository; nilai environment tidak ditulis dalam dokumen ini.

## Membuat project test

Buat project baru secara manual pada Supabase dengan nama `laryzo-point-engine-test`. Pastikan project tersebut disposable, tidak terhubung ke data production, dan memiliki project reference sendiri. Jangan menyalin data production. Setelah project siap, ambil URL, anon key, service-role key, dan database password dari project test saja.

Jika menggunakan Supabase CLI lokal, pasang Supabase CLI dan Docker, kemudian jalankan `supabase start`. Local URL seperti `http://127.0.0.1:54321` diterima oleh guard.

## Environment variables

Salin `.env.test.example` menjadi `.env.test`, lalu isi hanya nilai test/local:

```bash
set -a
. ./.env.test
set +a
```

Required values adalah `TEST_MODE=true`, `ALLOW_DESTRUCTIVE_TESTS=true`, `TEST_CONFIRMATION=I_UNDERSTAND_TEST_DATABASE_ONLY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, dan `SUPABASE_TEST_PROJECT_REF`. `SUPABASE_ANON_KEY` juga disediakan untuk pengujian Edge Function. `.env.test` tidak boleh di-commit.

## Migration dan reset

Untuk local Supabase, jalankan:

```bash
supabase start
supabase db reset
```

Untuk project test remote, gunakan project test yang sudah di-link secara eksplisit dan pastikan project reference cocok dengan `SUPABASE_TEST_PROJECT_REF`. Jangan menjalankan reset terhadap project reference production. Untuk menghapus fixture yang dibuat harness, jalankan:

```bash
node scripts/reset-point-engine-test.mjs
```

Reset script hanya menghapus record dengan prefix fixture dan menolak URL yang tidak cocok dengan test reference atau local URL.

## Menjalankan runtime harness

Setelah migration selesai dan environment test aktif:

```bash
node scripts/point-engine-runtime-test.mjs
```

Harness membuat genealogy 12 level, transaksi profit Rp15.000, retry sequential, 10 request concurrent, replace menjadi Rp20.000, failure sebelum mutation, blocked customer, boundary level 10, root customer, profit zero/negative, quantity, 20 concurrent placement, dan invariant ledger. Output JSON memuat `PASS`/`FAIL` serta angka aktual.

## Safety guard

Harness dan reset script gagal sebelum koneksi database jika `TEST_MODE` atau `ALLOW_DESTRUCTIVE_TESTS` tidak aktif, confirmation string tidak tepat, URL bukan local/test URL, atau project reference sama dengan production reference yang terdeteksi pada konfigurasi repository. Service-role key tidak pernah dicetak. Jangan menonaktifkan guard untuk menjalankan test.

## Status eksekusi pada sandbox

Pada saat infrastructure ini disiapkan, sandbox tidak memiliki Supabase CLI atau Docker daemon, dan tidak memiliki credential test-only. Oleh karena itu migration, fixture, stress test, dan concurrency test belum dieksekusi terhadap database. Tidak ada koneksi atau perubahan ke Supabase production yang dilakukan.
