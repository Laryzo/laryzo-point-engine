
# Panduan Lengkap Setup VPS Proxy Indonesia untuk Digiflazz

## Gambaran Umum

Digiflazz memerlukan IP statis Indonesia yang di-whitelist untuk memproses transaksi. Panduan ini akan membantu Anda membuat relay proxy di VPS Indonesia yang akan meneruskan request dari aplikasi Lovable ke API Digiflazz.

---

## Bagian 1: Persiapan VPS

### 1.1 Pilih Provider VPS Indonesia

| Provider | Harga Mulai | Lokasi | Link |
|----------|-------------|--------|------|
| IDCloudHost | Rp 50.000/bulan | Indonesia | idcloudhost.com |
| Niagahoster | Rp 75.000/bulan | Indonesia | niagahoster.co.id |
| Dewaweb | Rp 80.000/bulan | Indonesia | dewaweb.com |
| Biznet Gio | Rp 60.000/bulan | Indonesia | biznetgio.com |

### 1.2 Spesifikasi Minimal VPS

- **OS**: Ubuntu 22.04 LTS (Recommended)
- **CPU**: 1 vCPU
- **RAM**: 1 GB
- **Storage**: 20 GB SSD
- **Bandwidth**: Unlimited
- **IP Publik Statis**: Wajib

### 1.3 Siapkan Domain/Subdomain

Anda memerlukan domain atau subdomain untuk SSL. Contoh:
- `proxy.domain-anda.com`
- `digiflazz.domain-anda.com`

Arahkan A record subdomain ke IP VPS Anda.

---

## Bagian 2: Setup VPS

### 2.1 Login ke VPS via SSH

```bash
ssh root@IP_VPS_ANDA
```

### 2.2 Update Sistem dan Install Dependencies

```bash
# Update sistem
apt update && apt upgrade -y

# Install Nginx dan Certbot
apt install -y nginx certbot python3-certbot-nginx

# Install ufw (firewall)
apt install -y ufw
```

### 2.3 Konfigurasi Firewall

```bash
# Aktifkan firewall
ufw allow ssh
ufw allow 'Nginx Full'
ufw enable

# Verifikasi status
ufw status
```

---

## Bagian 3: Konfigurasi Nginx Proxy

### 3.1 Buat Konfigurasi Nginx

```bash
nano /etc/nginx/sites-available/digiflazz-proxy
```

Isi dengan konfigurasi berikut:

```nginx
# Rate limiting zone
limit_req_zone $binary_remote_addr zone=digiflazz_limit:10m rate=10r/s;

server {
    listen 80;
    server_name SUBDOMAIN_ANDA.DOMAIN_ANDA.COM;

    # Redirect ke HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name SUBDOMAIN_ANDA.DOMAIN_ANDA.COM;

    # SSL certificates (akan diisi otomatis oleh Certbot)
    # ssl_certificate /etc/letsencrypt/live/SUBDOMAIN/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/SUBDOMAIN/privkey.pem;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/digiflazz-proxy-access.log;
    error_log /var/log/nginx/digiflazz-proxy-error.log;

    # Health check endpoint
    location /health {
        return 200 '{"status":"ok"}';
        add_header Content-Type application/json;
    }

    # Digiflazz API Proxy
    location /digiflazz/ {
        # Validate proxy secret header
        set $proxy_secret "GANTI_DENGAN_SECRET_ANDA";
        
        if ($http_x_proxy_secret != $proxy_secret) {
            return 403 '{"error":"Forbidden"}';
        }

        # Rate limiting
        limit_req zone=digiflazz_limit burst=20 nodelay;

        # Remove the /digiflazz prefix when proxying
        rewrite ^/digiflazz/(.*) /$1 break;

        # Proxy to Digiflazz API
        proxy_pass https://api.digiflazz.com;
        proxy_ssl_server_name on;
        proxy_set_header Host api.digiflazz.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Remove custom headers before sending to Digiflazz
        proxy_set_header X-Proxy-Secret "";

        # Timeout settings
        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # Block all other paths
    location / {
        return 404 '{"error":"Not found"}';
        add_header Content-Type application/json;
    }
}
```

### 3.2 Ganti Placeholder

Ganti nilai berikut dalam konfigurasi:
- `SUBDOMAIN_ANDA.DOMAIN_ANDA.COM` - subdomain Anda (mis. `proxy.toko-saya.com`)
- `GANTI_DENGAN_SECRET_ANDA` - buat secret key yang kuat (min 32 karakter)

Contoh generate secret:
```bash
openssl rand -hex 32
```

### 3.3 Aktifkan Konfigurasi

```bash
# Buat symlink
ln -s /etc/nginx/sites-available/digiflazz-proxy /etc/nginx/sites-enabled/

# Hapus default config
rm /etc/nginx/sites-enabled/default

# Test konfigurasi
nginx -t

# Reload Nginx
systemctl reload nginx
```

---

## Bagian 4: Setup SSL dengan Let's Encrypt

### 4.1 Generate SSL Certificate

```bash
certbot --nginx -d SUBDOMAIN_ANDA.DOMAIN_ANDA.COM
```

Ikuti instruksi di layar:
1. Masukkan email untuk notifikasi
2. Setuju Terms of Service
3. Pilih redirect HTTP ke HTTPS (opsi 2)

### 4.2 Setup Auto-Renewal

```bash
# Test renewal
certbot renew --dry-run

# Cron job sudah otomatis ditambahkan oleh Certbot
systemctl status certbot.timer
```

---

## Bagian 5: Verifikasi Proxy

### 5.1 Test Health Endpoint

```bash
curl https://SUBDOMAIN_ANDA.DOMAIN_ANDA.COM/health
# Expected: {"status":"ok"}
```

### 5.2 Test Proxy dengan Secret

```bash
# Test dengan secret yang benar
curl -X POST https://SUBDOMAIN_ANDA.DOMAIN_ANDA.COM/digiflazz/v1/price-list \
  -H "Content-Type: application/json" \
  -H "X-Proxy-Secret: SECRET_ANDA" \
  -d '{"cmd":"prepaid","username":"test","sign":"test"}'

# Test tanpa secret (harus error 403)
curl -X POST https://SUBDOMAIN_ANDA.DOMAIN_ANDA.COM/digiflazz/v1/price-list \
  -H "Content-Type: application/json" \
  -d '{"cmd":"prepaid","username":"test","sign":"test"}'
# Expected: {"error":"Forbidden"}
```

---

## Bagian 6: Whitelist IP di Digiflazz

### 6.1 Dapatkan IP VPS Anda

```bash
curl ifconfig.me
# Atau
hostname -I
```

### 6.2 Tambahkan IP ke Whitelist Digiflazz

1. Login ke dashboard Digiflazz: https://member.digiflazz.com
2. Masuk ke menu **Pengaturan** > **Keamanan API** atau **API Settings**
3. Cari bagian **IP Whitelist**
4. Tambahkan IP VPS Anda (tanpa spasi, gunakan koma jika lebih dari satu)
   Contoh: `103.xxx.xxx.xxx`
5. Simpan perubahan

---

## Bagian 7: Konfigurasi di Aplikasi Lovable

### 7.1 Tambahkan Secrets

Setelah VPS siap, Anda perlu menambahkan 2 secrets di aplikasi ini:

1. **DIGIFLAZZ_PROXY_URL**
   - Nilai: `https://SUBDOMAIN_ANDA.DOMAIN_ANDA.COM`
   - Contoh: `https://proxy.toko-saya.com`

2. **DIGIFLAZZ_PROXY_SECRET**
   - Nilai: Secret yang Anda buat di langkah 3.2
   - Contoh: `a1b2c3d4e5f6...` (hasil dari `openssl rand -hex 32`)

### 7.2 Update Edge Functions

Setelah secrets ditambahkan, saya akan mengupdate edge functions berikut untuk menggunakan proxy:
- `digiflazz-topup` - Request transaksi top-up
- `digiflazz-check-status` - Cek status transaksi
- `digiflazz-price-list` - Sinkronisasi daftar harga

---

## Bagian 8: Script Instalasi Otomatis (Opsional)

Untuk mempermudah setup, Anda bisa menggunakan script ini:

```bash
#!/bin/bash
# Script Instalasi Digiflazz Proxy
# Jalankan sebagai root

set -e

# Konfigurasi - GANTI NILAI INI
DOMAIN="proxy.domain-anda.com"
EMAIL="email@domain-anda.com"
PROXY_SECRET=$(openssl rand -hex 32)

echo "=== Digiflazz Proxy Installer ==="
echo "Domain: $DOMAIN"
echo "Proxy Secret: $PROXY_SECRET"
echo ""
echo "SIMPAN PROXY SECRET DI ATAS!"
echo ""
read -p "Lanjutkan? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Update sistem
apt update && apt upgrade -y

# Install dependencies
apt install -y nginx certbot python3-certbot-nginx ufw

# Konfigurasi firewall
ufw allow ssh
ufw allow 'Nginx Full'
echo "y" | ufw enable

# Buat konfigurasi Nginx
cat > /etc/nginx/sites-available/digiflazz-proxy << EOF
limit_req_zone \$binary_remote_addr zone=digiflazz_limit:10m rate=10r/s;

server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl;
    server_name $DOMAIN;

    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    access_log /var/log/nginx/digiflazz-proxy-access.log;
    error_log /var/log/nginx/digiflazz-proxy-error.log;

    location /health {
        return 200 '{"status":"ok"}';
        add_header Content-Type application/json;
    }

    location /digiflazz/ {
        set \$proxy_secret "$PROXY_SECRET";
        
        if (\$http_x_proxy_secret != \$proxy_secret) {
            return 403 '{"error":"Forbidden"}';
        }

        limit_req zone=digiflazz_limit burst=20 nodelay;
        rewrite ^/digiflazz/(.*) /\$1 break;

        proxy_pass https://api.digiflazz.com;
        proxy_ssl_server_name on;
        proxy_set_header Host api.digiflazz.com;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Proxy-Secret "";

        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location / {
        return 404 '{"error":"Not found"}';
        add_header Content-Type application/json;
    }
}
EOF

# Aktifkan konfigurasi
ln -sf /etc/nginx/sites-available/digiflazz-proxy /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test dan reload Nginx
nginx -t
systemctl reload nginx

# Setup SSL
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL --redirect

echo ""
echo "=== INSTALASI SELESAI ==="
echo ""
echo "IP VPS: $(curl -s ifconfig.me)"
echo "Proxy URL: https://$DOMAIN"
echo "Proxy Secret: $PROXY_SECRET"
echo ""
echo "LANGKAH SELANJUTNYA:"
echo "1. Whitelist IP VPS di dashboard Digiflazz"
echo "2. Tambahkan secrets di aplikasi Lovable"
echo "3. Beritahu Lovable untuk update Edge Functions"
```

Simpan sebagai `install-proxy.sh` dan jalankan:
```bash
chmod +x install-proxy.sh
./install-proxy.sh
```

---

## Ringkasan Informasi yang Dibutuhkan

Setelah VPS siap, beritahu saya informasi berikut agar saya dapat mengupdate Edge Functions:

1. **Proxy URL**: `https://subdomain.domain-anda.com`
2. **Proxy Secret**: (hasil generate)

Saya akan mengupdate 3 edge functions (`digiflazz-topup`, `digiflazz-check-status`, `digiflazz-price-list`) untuk mengirim request melalui proxy tersebut.

---

## Troubleshooting

### Error 502 Bad Gateway
- Periksa apakah Digiflazz API bisa diakses: `curl https://api.digiflazz.com`
- Cek log Nginx: `tail -f /var/log/nginx/digiflazz-proxy-error.log`

### Error 403 Forbidden
- Pastikan header `X-Proxy-Secret` dikirim dengan benar
- Verifikasi secret di konfigurasi Nginx

### SSL Certificate Error
- Jalankan ulang: `certbot --nginx -d DOMAIN`
- Cek status: `certbot certificates`

### Rate Limit Exceeded
- Batas default 10 request/detik per IP
- Ubah nilai `rate=10r/s` di konfigurasi jika perlu

