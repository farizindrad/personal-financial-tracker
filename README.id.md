# Ledger

[English](README.md)

Aplikasi pencatat keuangan pribadi dengan input **manual** — tanpa integrasi bank. Akun, kategori, transaksi, saldo & cash flow, budget, target tabungan, transaksi berulang, aset/liabilitas, login email/password.

Antarmuka aplikasi berbahasa Indonesia.

**Demo publik:** _URL menyusul — data dummy, di-reset berkala. Bukan data pribadi._

## Fitur

- Akun/dompet (bank, tunai, e-wallet, lain) dengan saldo dihitung live
- Kategori kustom + sub-kategori
- Pemasukan, pengeluaran, transfer
- Dashboard: total, arus kas bulanan, aktivitas terbaru
- Budget bulanan, target tabungan, transaksi berulang
- Aset & liabilitas (kekayaan bersih)
- Kalender transaksi
- Auth email/password; mode demo menonaktifkan registrasi dan mereset seed

## Stack

| Layer | Pilihan |
|---|---|
| API | NestJS, Prisma, MySQL |
| Web | React, Vite, TanStack Query, Tailwind CSS |
| Runtime | Satu proses Node — Nest menyajikan SPA hasil build |
| Deploy | Docker Compose + reverse proxy (bind `127.0.0.1`) |

## Mulai cepat

Butuh **Node.js 20+** dan **MySQL** di mesin sendiri. `DATABASE_URL` hanya ke database **lokal**.

1. Buat database + user (contoh SQL di [docs/development.md](docs/development.md)).
2. Environment:

   ```bash
   cp backend/.env.example backend/.env
   ```

   Isi `DATABASE_URL` (host `localhost`) dan `JWT_SECRET` acak yang panjang. Jangan commit `backend/.env`.

3. API:

   ```bash
   cd backend
   npm install
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   npm run start:dev
   ```

4. Web (terminal kedua):

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

Buka `http://localhost:5173`. Vite mem-proxy `/api` ke API di port `3000`. Login seed: `demo@ledger.app` / `demo1234`.

## Perintah

Dari `backend/` kecuali disebutkan lain.

| Perintah | Fungsi |
|---|---|
| `npm run start:dev` | API mode watch |
| `npm run prisma:migrate` | Terapkan migrasi (dev) |
| `npm run prisma:seed` | Isi data demo |
| `npm test` | Tes unit |
| `npm run build:all` | Build SPA + API (preview: `npm run start:prod`) |
| `npm run dev` (di `frontend/`) | Vite di port 5173 |

## Arsitektur

SPA bicara JSON ke `/api`. Nest satu monolith modular. Sumber skema data: Prisma (`backend/prisma/`). Saldo akun dihitung, tidak disimpan. List dipaginasi; relasi di-load dalam query yang sama.

```
backend/    API NestJS, Prisma, SPA statis di produksi
frontend/   React SPA
docs/       Dokumentasi kontributor (setup, arsitektur, API, produk)
```

Lanjut: [arsitektur](docs/architecture.md) · [API](docs/api-reference.md) · [produk](docs/roadmap.md) · [setup lokal](docs/development.md)

## Deploy

Satu clone git. Dua container dari image yang sama. Dua file env **hanya di server**.

| Service | File env | Bind host | URL publik |
|---|---|---|---|
| `finance-app-demo` | `.env.demo` | `127.0.0.1:3301` | ya (portfolio) |
| `finance-app` | `.env.production` | `127.0.0.1:3300` | tidak |

Compose join Docker network yang sudah ada; host DB di container: `mysql-db`. Jangan buat container MySQL baru. Salin [`.env.example`](.env.example) jadi `.env.demo` (nanti `.env.production`) di VPS — jangan di-commit.

```bash
docker compose up -d --build finance-app-demo
```

Reverse proxy ke `127.0.0.1:3301`. Setelah ubah kode: `git pull` sekali, lalu rebuild service yang perlu.

## Yang ada di GitHub

Dokumentasi untuk manusia: README ini, [README.md](README.md) (English), dan `docs/`. Brief untuk agent, rules editor, dan spec kerja tetap di mesin lokal (gitignore).
