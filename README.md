# Ledger

[Bahasa Indonesia](README.id.md)

Personal finance tracker with **manual** entry — no bank integrations. Record accounts, categories, and transactions; see balances and cash flow; plan with budgets, savings goals, and recurring rules.

The UI is in Indonesian. This README is English.

**Live demo:** https://finance.farizindra.net — dummy data, resets daily. Login: `demo@finance.farizindra.net` / `demo1234`. Not personal data.

## Features

- Wallets/accounts (bank, cash, e-wallet, other) with live computed balances
- Custom categories and sub-categories
- Income, expense, and transfers
- Dashboard: totals, monthly cash flow, recent activity
- Monthly budgets, savings goals, recurring transactions
- Assets and liabilities (net worth)
- Transaction calendar
- Email/password auth; public demo mode disables registration and resets seed data

## Stack

| Layer | Choice |
|---|---|
| API | NestJS, Prisma, MySQL |
| Web | React, Vite, TanStack Query, Tailwind CSS |
| Runtime | One Node process — Nest serves the built SPA |
| Deploy | Docker Compose + reverse proxy (bind `127.0.0.1`) |

## Quick start

Need **Node.js 20+** and **MySQL** on your machine. Point `DATABASE_URL` at a **local** database only.

1. Create a database and user (example SQL in [docs/development.md](docs/development.md)).
2. Environment:

   ```bash
   cp backend/.env.example backend/.env
   ```

   Set `DATABASE_URL` (host `localhost`) and a long random `JWT_SECRET`. Do not commit `backend/.env`.

3. API:

   ```bash
   cd backend
   npm install
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   npm run start:dev
   ```

4. Web (second terminal):

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

Open `http://localhost:5173`. Vite proxies `/api` to the API on port `3000`. Seed login follows `DEMO_EMAIL` / `DEMO_PASSWORD` in `backend/.env` (defaults `demo@ledger.app` / `demo1234` if unset).

## Commands

Run from `backend/` unless noted.

| Command | What it does |
|---|---|
| `npm run start:dev` | API watch mode |
| `npm run prisma:migrate` | Apply migrations (dev) |
| `npm run prisma:seed` | Load demo seed |
| `npm test` | Unit tests |
| `npm run build:all` | Build SPA + API (preview via `npm run start:prod`) |
| `npm run dev` (in `frontend/`) | Vite on port 5173 |

## Architecture

SPA talks JSON to `/api`. Nest is a modular monolith. Prisma schema is the source of truth for the data model (`backend/prisma/`). Account balances are computed (not stored). List endpoints are paginated; related rows are loaded in the same query.

```
backend/    NestJS API, Prisma, static frontend in production
frontend/   React SPA
docs/       Contributor docs (setup, architecture, API, product)
```

More: [architecture](docs/architecture.md) · [API](docs/api-reference.md) · [product](docs/roadmap.md) · [local setup](docs/development.md)

## Deploy

One git clone. Copy [`.env.example`](.env.example) to `.env.demo` on the server — never commit it. Point `DATABASE_URL` at an existing MySQL (`mysql-db` on the Docker network). Do not add a second MySQL container.

```bash
docker compose up -d --build finance-app-demo
```

Put a reverse proxy in front of `127.0.0.1:3301` (or container `finance-app-demo:3000` on the same network). After code changes: `git pull` once, then rebuild. A second container (`finance-app`) can run private data with no public URL.
