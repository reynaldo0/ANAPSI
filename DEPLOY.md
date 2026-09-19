# Deploy Blindspot ke VPS

Arsitektur produksi:

```
internet ──▶ Caddy (HTTPS/TLS otomatis) ──▶ web (Next.js :3000, standalone)
                                                  │
                                          rewrite /api/*
                                                  ▼
                                            backend (Go :8080)
                                                  │
                                            MySQL 8.4 (volume persist)
```

Semua berjalan sebagai container Docker lewat `deploy/docker-compose.yml`.
Backend & web berjalan non-root, data tetap utuh saat upgrade (`restart: unless-stopped`
+ named volume `dbdata`).

## 1. Prasyarat (VPS, sekali saja)

- Ubuntu/Debian 22.04+ (2 GB RAM cukup untuk pemakaian kecil),
- Docker Engine 24+ + Docker Compose plugin:
  ```bash
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER && newgrp docker
  ```
- Domain yang DNS-nya sudah mengarah ke IP VPS (Caddy menerbitkan sertifikat
  HTTPS gratis).

## 2. Persiapan config

```bash
git clone <url-repo> ~/blindspot && cd ~/blindspot/deploy
cp .env.example .env
$EDITOR .env
```

Wajib diisi:
| Variabel | Keterangan |
| --- | --- |
| `AUTH_SECRET` | **Sama persis** untuk backend & web. Buat: `openssl rand -hex 32`. Jangan dibocorkan. |
| `MYSQL_ROOT_PASSWORD` | Password root MySQL container. |
| `MYSQL_PASSWORD` | Password user aplikasi. Hindari karakter khusus (`!@#`) karena dipakai di DSN Go. |
| `APP_ORIGINS` | Domain produksimu (CORS allow-list), mis. `https://blindspot.id`. |

Opsional: `GROQ_API_KEY` (fitur AI), `DB_MAX_OPEN/DB_MAX_IDLE/DB_CONN_LIFETIME_SECONDS`.

> Jangan pernah meng-commit `.env` (sudah diexclude di `.dockerignore`/`.gitignore`).

## 3. Jalankan

```bash
docker compose up -d --build
docker compose ps            # tunggu `db`/`backend` berstatus healthy
docker compose logs -f backend web   # cek log startup
```

Selesai — buka `https://domainmu`. Akun awal dibuat otomatis di boot pertama
(lihat `backend/internal/database/seed.go`): admin & pengguna demo, langsung ubah
password setelah itu.

### Deploy tanpa Docker (opsional, manual)
Backend:
```bash
cd backend && go build -o blindspot-api ./cmd/server
AUTH_SECRET="$(openssl rand -hex 32)" PORT=8080 COOKIE_SECURE=true \
  MYSQL_DSN='user:pass@tcp(127.0.0.1:3306)/blindspot?parseTime=true&charset=utf8mb4&collation=utf8mb4_unicode_ci' \
  TRUST_PROXY_HEADERS=true APP_ORIGINS=https://blindspot.id \
  ./blindspot-api &
```
Web (build standalone lalu `node server.js`) — atau buat systemd unit berdua.
Skema tabel dibuat otomatis saat backend boot (migrasi idempoten).

## 4. Pemeliharaan

```bash
docker compose pull && docker compose up -d --build   # upgrade zero-downtime
docker compose logs --tail=200 -f                     # monitoring
docker exec -it blindspot-db-1 mysql -ublindspot -p blindspot   # akses DB
```

### Backup MySQL (cron harian)
```bash
docker exec blindspot-db-1 mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" \
  --single-transaction blindspot | gzip > ~/backup/blindspot-$(date +%F).sql.gz
```
Data volume: `dbdata`. Sebelum upgrade besar, snapshot volume:
`docker run --rm -v blindspot-dbdata:/data -v ~/backup:/backup alpine tar czf /backup/dbdata-$(date +%F).tar.gz -C /data .`

## 5. Menjaga server tetap sehat ("tidak haus")

- **Goroutine/worker**: SSE admin stream dilepas otomatis saat klien putus;
  heartbeat & auto-refresh berhenti saat tab tak terlihat. Tak ada background
  task yang berjalan diam-diam.
- **MySQL pool**: `max-connection = max_open + margin` → set `DB_MAX_OPEN` ≤ batas
  max_connections MySQL kamu. Default aman untuk VPS kecil (20–40).
- **Rate limit** terpasang di semua endpoint publik (login 5/60s, AI 20/60s, dst.)
  anti spam dan anti login brute-force; kunci lama dibersihkan otomatis.
- **Body cap** 32 MB server-side + cek ukuran foto laporan (5 MB) → tak ada OOM
  karena upload besar.
- Cek rutin: `docker stats` (CPU/mem), `docker compose logs -f backend`, dan
  `/api/health` (healthcheck bawaan container backend).

## 6. Troubleshooting

| Gejala | Solusi |
| --- | --- |
| `backend` restart terus | `docker compose logs backend`; biasanya `AUTH_SECRET` beda / MySQL belum healthy. |
| Login selalu gagal | Pastikan `AUTH_SECRET` sama di backend & web, dan jam server sinkron (NTP) karena sesi pakai timestamp. |
| Browser `ERR_SSL` / tak ada HTTPS | DNS belum mengarah, atau Caddy belum sempat minta sertifikat (lihat `docker compose logs caddy`). |
| CORS ditolak di browser | `APP_ORIGINS` harus memuat persis origin yang dipakai (termasuk `www` bila ada). |
| API lambat di jaringan jelek | Sudah ada cache header + service worker offline-first; pastikan klien memakai HTTPS (Secure cookie & SW butuh HTTPS). |