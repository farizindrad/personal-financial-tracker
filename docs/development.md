# Ledger — Development Guide

## Prerequisites

- Node.js 20+ (npm 10+)
- MySQL running locally (native install; use DBeaver or CLI to manage)
- Git

## Project layout

```
backend/    NestJS API + Prisma
frontend/   React + Vite SPA
docs/       Documentation
```

## Local database setup (Windows)

The local database is completely separate from any production database. Never point dev code at a production DB.

1. Connect to your local MySQL instance (`localhost:3306`, typically user `root`).
2. Create a dedicated database + user for this app:
   ```sql
   CREATE DATABASE personal_finance_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'finance_app'@'localhost' IDENTIFIED BY 'devpassword';
   GRANT ALL PRIVILEGES ON personal_finance_dev.* TO 'finance_app'@'localhost';
   FLUSH PRIVILEGES;
   ```
3. Copy `.env.local.example` (in `backend/`) to `backend/.env` and fill in `DATABASE_URL`:
   ```
   DATABASE_URL="mysql://finance_app:devpassword@localhost:3306/personal_finance_dev?connection_limit=5"
   PORT=3000
   IS_DEMO=false
   JWT_SECRET=any-long-random-string
   SESSION_TTL_DAYS=30
   DEMO_EMAIL=demo@ledger.app
   ```
   The local DB host is `localhost` (unlike production, which uses the Docker network alias `mysql-db`).
4. The Prisma schema in `backend/prisma/schema.prisma` is the canonical model. Run migrations:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate   # runs prisma migrate dev
   ```
   Do not apply a raw SQL dump by hand — Prisma migrations create the tables. Refresh your DB client afterward to inspect data.

## Demo mode

`IS_DEMO=true` disables registration, tightens throttling, and enables the demo-reset scheduler (reseeds the demo user once a day at 00:00 `Asia/Jakarta`; override with `DEMO_RESET_CRON`). The demo account is created by the seed. `JWT_SECRET` must be set in every environment — sessions won't start without it.

## Seed data

```bash
npm run prisma:seed
```

Seeds a demo user (`demo@ledger.app` / `demo1234`) with accounts, categories, transactions, budgets, recurring rules, savings goals, assets, and liabilities so the UI has something to show.

> Local dev only: with a real session the demo reset scheduler is disabled (`IS_DEMO=false`).

## Running in development

Open two terminals.

### Backend

```bash
cd backend
npm install
npm run start:dev
```

`start:dev` uses `tsc-watch` and serves the SPA fallback through `scripts/dev-serve.js`. It listens on `PORT` (default `3000`).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite dev server runs on `http://localhost:5173` and proxies `/api` to the backend (see `frontend/vite.config.ts`). Optional `VITE_API_BASE` env overrides the API base (default `/api`).

## Scripts

### Backend (`backend/`)

| Command | Purpose |
|---|---|
| `npm run start:dev` | Watch mode + dev server |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start:prod` | Run compiled build |
| `npm run build:all` | Build frontend, copy into `backend/public`, then compile backend |
| `npm test` | Unit tests (Jest) |
| `npm run test:e2e` | E2E tests |
| `npm run lint` | ESLint (auto-fix) |
| `npm run format` | Prettier |
| `npm run prisma:migrate` | `prisma migrate dev` |
| `npm run prisma:seed` | Seed demo data |
| `npm run free:port` | Kill process holding `PORT` (Windows helper) |

### Frontend (`frontend/`)

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run lint` | ESLint |
| `npm run preview` | Preview the production build |
| `npm test` | Frontend regression tests (Vitest + jsdom; Node 22.12+ required) |
| `npm run test:browser` | Headless Chrome UI regression tests on localhost:5178 |

### Phase 1 regression checks

Use Node 22.12+ for the frontend test runner (verified locally with Node 24.21.0). The Vite application build remains separate from the test runner. Install dependencies from the committed lockfile with `npm ci` in each package.

Browser tests use an isolated Playwright context and installed Google Chrome locally; CI installs Playwright Chromium. The fixture runner starts its own localhost Vite server on port 5178 and refuses an occupied port. It intercepts `/api` with deterministic fixtures; it does not read a real database or prove database integration. Unit tests exercise real React Query caches, auth transitions, invalidation, backend ownership filters, deletion and aggregates. The separate Phase 2 integration runner below verifies real MySQL/API behavior.

Run backend `npm test -- --runInBand`, `npm run build` and `.\node_modules\.bin\eslint.cmd "{src,test}/**/*.ts"` (the last command checks without auto-fixing). In frontend run `npm test`, `npm run build`, `npm run lint` and `npm run test:browser`. Build includes type checking. Do not use the repository's backend lint command during a read-only check: it includes `--fix`.

The Phase 1 frontend build now completes with Vite 6.4.5. It retains a warning about the main JS chunk exceeding 500 kB; six pre-existing React Fast Refresh export warnings are tracked rather than suppressed. These are not lint errors. A previous audit stopped a build without a result; it did not establish an application compile error. Frontend test tooling uses Vitest 5, and compatible dependency updates resolved the audit findings observed during installation.

### Session transport configuration

`SESSION_TTL_DAYS` is a whole number from 1 to 3650 (default 30), shared by JWT expiry and cookie max-age. Production (`NODE_ENV=production`) sets `Secure`, `HttpOnly`, `SameSite=Lax` and `Path=/`; access it through HTTPS, including when TLS terminates at a reverse proxy. Local HTTP development defaults to a non-Secure cookie. Optional `COOKIE_SECURE=true` enables Secure on local/staging HTTPS. `COOKIE_SECURE=false` is rejected in production, and invalid values fail configuration validation. Logout clears the matching cookie scope without a new lifetime.

The browser clears session caches on logout even if the logout request fails. That hides local financial data but does not revoke an unreachable server session. A protected API `401` expires the local session. See [ADR-001](decisions/001-session-cache-isolation.md).

### Phase 2 integration and operations

Use the dedicated `.env.test` protocol and commands in [operations.md](operations.md). `test:e2e` now refuses ordinary development/demo database targets. `npm run test:integration` in frontend exercises the real API/MySQL stack, while `test:browser` remains the fast fixture suite. Run the database-backed suites serially. `npm run lint:check` in backend provides a read-only lint command suitable for CI.

CI, backup/restore safety, logging, proxy trust and demo/private validation are documented in the [operational runbook](operations.md) and [ADR-002](decisions/002-isolated-verification-and-backups.md). A scoped Prisma configuration dependency override is explained in [ADR-003](decisions/003-prisma-config-merge-security-override.md); generation/migrations must remain part of its verification.

## Code conventions

### Backend

- One feature module per domain under `src/modules/`. Controller only binds routes/DTOs; logic lives in the service.
- Every DTO uses `class-validator`. Keep `whitelist` + `forbidNonWhitelisted` respected — unknown fields are rejected.
- **Anti-N+1 is a hard requirement** (see `docs/architecture.md`). Before submitting DB code, verify: no query in a loop, eager-loaded relations, aggregated math, pagination on every list.
- Money stays `DECIMAL(15,2)` in the DB and is handled as numbers in DTOs; the API may serialize to string via Prisma. Frontend formats with `Intl.NumberFormat`.
- Log via NestJS `Logger`. Tests: at least one `*.spec.ts` per core service.

### Frontend

- One folder per page under `src/pages/` with an `index.tsx` (page) and any form component.
- Reusable UI goes in `src/components/ui/`, the shell in `src/components/layout/`.
- Use the design-token classes from `src/index.css` (`.btn-*`, `.card`, `.field`, `.label-meta`, `.page-h1`). Do not invent ad-hoc styles that break the visual system.
- All API calls go through `src/lib/api-client.ts`; pages consume typed React Query hooks from `src/hooks/`.
- UI copy lives in `src/lib/labels.ts` (Indonesian for the user-facing app). API enums stay English.
- Numeric displays use `formatIdr` / `formatDateId` from `src/lib/format.ts`.

## Lint & build checks

Before pushing changes:

```bash
cd frontend && npm run build && npm run lint
cd backend  && npm run build && npm run lint && npm test
```

The frontend build runs `tsc -b` so type errors fail the build.

## Production build & local preview

Backend serves the frontend from `backend/public/` when built:

```bash
cd backend
npm run build:all   # builds frontend → copies to backend/public → compiles backend
npm run start:prod
```

Then open `http://localhost:3000`.

## Common issues

- **Port already in use**: run `npm run free:port` in `backend/` (Windows).
- **`npm.ps1` cannot be loaded / script execution disabled on Windows**: run `npm.cmd` instead of `npm` in PowerShell.
- **Prisma client mismatch**: after pulling new migrations or schema changes, run `npm run prisma:generate`.
- **Migrations target wrong DB**: double-check `DATABASE_URL` in `backend/.env` — local dev uses `localhost` and the `personal_finance_dev` database.

## Deployment reference

See the root README (`README.md` / `README.id.md`) and `docker-compose.yml`. Key points:

- Build images on the VPS: `docker compose build` (or `docker compose up -d --build <service>`).
- Secrets only via `.env.production` / `.env.demo` (never commit, never bake into images).
- Bind to `127.0.0.1` and expose through a reverse proxy.
