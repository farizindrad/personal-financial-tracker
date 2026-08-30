# Ledger — Architecture & Tech Stack

Ledger is a multi-user personal finance tracker with email/password authentication. Input is manual (no bank integration by design — Indonesian banks offer no open API for individuals, and screen-scraping violates ToS). It starts as an MVP and is structured to grow into a proper web application.

## System overview

```
Browser (React SPA)
   │  HTTP/JSON  (same origin, /api prefix)
   ▼
NestJS application (single Node process)
   │  Prisma Client
   ▼
MySQL (one database: personal_finance)
```

- One deployable unit. The React build is a static bundle served by NestJS itself (`ServeStaticModule`). No separate frontend server, no SSR.
- Two isolated instances on production: `finance-app` (real data, private) and `finance-app-demo` (dummy data, linked from portfolio, `IS_DEMO=true`).

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Backend | NestJS (TypeScript) | Structured, modular, consistent patterns across modules |
| ORM | Prisma | Explicit queries (`include`/`select` written by hand) — makes anti-N+1 review easy; built-in migrations |
| Database | MySQL | Canonical model is `backend/prisma/schema.prisma`; reuse an existing MySQL server |
| Frontend | React 19 + Vite + TypeScript | Builds to static files; no Node process needed at runtime |
| Data fetching | TanStack Query (React Query) | Built-in caching, avoids redundant refetches |
| Styling | TailwindCSS v4 | Lightweight, no runtime CSS-in-JS |
| Icons | @phosphor-icons/react | Consistent, tree-shakeable icon set |
| Animation | GSAP + @gsap/react | Page transitions and subtle scroll reveals |
| Routing | react-router-dom v7 | SPA routing with `BrowserRouter` |
| Process manager | PM2 | Runs the single backend process on the VPS |
| Scheduler | `@nestjs/schedule` (cron in-process) | Recurring transactions, NO separate worker/queue |
| Validation | class-validator + ValidationPipe | Global whitelist + transform on every DTO |
| Throttling | `@nestjs/throttler` | Write endpoints rate-limited, stricter in demo mode |
| Deploy | Docker Compose on the VPS | Updates are rare; no CI/CD needed |
| Database server | Existing `production_mysql` container | New databases inside it, no new MySQL container (saves RAM) |

### Explicitly NOT used (small-VPS constraint)

- Redis / BullMQ / separate message queue
- Next.js or any SSR framework
- Microservices — stays a modular monolith in one NestJS process

## Repository layout

```
backend/                 NestJS API + Prisma + static frontend build
  src/
    modules/             Feature modules (auth, accounts, categories, ...)
    common/              Filters (exceptions), guards (throttler, auth)
    prisma/              PrismaService / PrismaModule
    scheduler/           recurring.scheduler.ts + demo-reset.scheduler.ts (cron)
    static/              ServeStatic config
  prisma/
    schema.prisma        Canonical data model
    migrations/          Prisma migration history
    seed.ts              Demo seed data
frontend/                React + Vite SPA
  src/
    pages/               One folder per route
    components/          layout/ (shell) + auth/ (guards) + ui/ (overlays)
    hooks/               React Query hooks per entity
    lib/                 api-client, auth (AuthProvider), format, labels, nav
    types/               Shared response/input types
  src/index.css          Tailwind theme (design tokens, component classes)
docs/                    This documentation
```

## Data model

Eight core entities plus a read-model view. Balance is NEVER stored — it is computed from `initial_balance + aggregated transactions` (see `VAccountBalance` view). Every owned row carries a `user_id` FK to `User` (cascade delete); all service queries are scoped by `userId` from the authenticated request.

| Entity | Notes |
|---|---|
| `User` | Email/password (bcrypt-hashed), registration disabled in demo mode. |
| `Account` | Bank / cash / e-wallet / other. Soft-delete via `is_active`. Unique `(user_id, name, type)`. |
| `Category` | `income` / `expense`, self-relation for sub-categories. `is_active` soft-delete. Unique `(user_id, name, type)`. |
| `Transaction` | `income` / `expense` / `transfer`. Transfer carries `transfer_to_account_id`. |
| `Budget` | Per `(category_id, month, year)`, unique per user. |
| `SavingsGoal` | Optional linked account; progress computed from account balance. |
| `RecurringTransaction` | Template; scheduler materializes transactions on `next_run_date`. |
| `Asset` | `property \| vehicle \| investment \| gold \| cash \| other`, valued at current market price. |
| `Liability` | `credit_card \| loan \| other`, tracked amount owed. |
| `VAccountBalance` (view) | Live computed balance per account, scoped by `user_id`. |

Enums: `AccountType` (`bank|cash|e_wallet|other`), `CategoryType` (`income|expense`), `TransactionType` (`income|expense|transfer`), `RecurringFrequency` (`daily|weekly|monthly|yearly`), `AssetType`, `LiabilityType`.

Money columns are `DECIMAL(15,2)`; the API returns them as strings to avoid float precision loss.

**Net worth** is `sum(account balance) + sum(asset value) − sum(liability amount)`, computed in `DashboardService.getSummary()`.

## Backend architecture

### Modules

Each feature lives in `backend/src/modules/<name>/`:

```
<name>/
  <name>.controller.ts      HTTP routes + DTO binding
  <name>.service.ts         Business logic + Prisma queries
  <name>.module.ts          NestJS module wiring
  <name>.service.spec.ts    Unit tests
  dto/                      create / update / list query DTOs
```

Modules: `auth`, `accounts`, `categories`, `transactions`, `budgets`, `savings-goals`, `recurring-transactions`, `assets`, `liabilities`, `dashboard`.

### Cross-cutting

- `main.ts` — global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`), global exception filter, `api` global prefix, SPA fallback middleware.
- `AuthGuard` (global) — rejects unauthenticated requests with `401`. Public routes are marked `@Public()` (health, auth flow). The request user is injected as `req.user` (JWT payload).
- Auth cookie — JWT signed with `JWT_SECRET`, stored in an HttpOnly cookie `ledger_token`, `SESSION_TTL_DAYS` lifetime. Logout clears it.
- `WriteThrottlerGuard` — rate-limits all endpoints that mutate data; stricter in demo mode. Auth endpoints get a tight `auth: 10/min` limiter.
- `RecurringScheduler` — `@Cron(EVERY_DAY_AT_1AM)` runs `processDue()` to generate transactions whose `next_run_date` has passed (per user).
- `DemoResetScheduler` — `@Cron` once daily at 00:00 `Asia/Jakarta` (override with `DEMO_RESET_CRON`), only active when `IS_DEMO=true`; reseeds the demo user so the public instance always has fresh data.

### Anti-N+1 rules (hard constraints)

1. Never query inside a loop — use Prisma `include`/`select` on the root query.
2. List endpoints must eager-load displayed relations in one query.
3. Aggregations (balances, monthly summary, budget realization) use Prisma `aggregate`/`groupBy` or raw SQL to views — never loop-per-row in app code.
4. All list endpoints are paginated (`take`/`skip`), never unbounded `findMany()`.
5. Dashboard summary is ONE request; the backend combines aggregated queries with `Promise.all`.
6. Hot-path indexes exist (`idx_trx_date`, `idx_trx_account`, `idx_trx_category`, `idx_recurring_next_run`) and must be used.

## Frontend architecture

### Shell layout

Clean GCP/Notion-style app shell (`AppLayout.tsx`, `AppNav.tsx`):

- Fixed left sidebar (`w-64`) with grouped nav sections (Ringkasan / Keuangan / Perencanaan); collapses to an overlay drawer on mobile.
- Sticky topbar with breadcrumb and logout action.
- Content area `max-w-6xl` centered.
- Footer with product tagline.
- The Transactions page hosts a **Daftar / Kalender** toggle (`?view=calendar` deep-links to the calendar); `/calendar` redirects there.

### Auth flow

- `AuthProvider` (`src/lib/auth.tsx`) bootstraps `GET /auth/config` (feature flags incl. demo mode) and `GET /auth/me` on load; `401` → unauthenticated.
- `RequireAuth` wraps the whole app shell; unauthenticated visits redirect to `/login`.
- `Login`/`Register` pages are public; register is hidden when `config.demo`. In demo mode a button fills the public demo credentials.
- The API client sends `credentials: 'same-origin'` so the HttpOnly cookie rides along.

### Design tokens (`src/index.css`)

Defined via Tailwind v4 `@theme`:

- Sans: **Outfit**; mono: **JetBrains Mono** (used for currency figures).
- `--color-brand: #1a73e8` (GCP blue), `--color-mint: #188038` (positive), `--color-hazard: #d1242f` (negative).
- Neutrals: `--color-ink: #1f2328`, `--color-paper: #ffffff`, `--color-paper-deep: #f6f8fa`, `--color-mist: #57606a`.
- Component classes: `.btn-primary`, `.btn-ghost`, `.btn-hazard`, `.btn-chip`, `.card`, `.card-ink`, `.field`, `.label-meta`, `.page-h1`, `.nav-link`, `.amount-pos/neg/plain`.

Pages follow a consistent pattern: page header (meta label + `page-h1` + description + primary action), stat cards, then a card-based list with pagination. Data is loaded through typed React Query hooks in `src/hooks/`.

### Data flow

- `src/lib/api-client.ts` — thin `fetch` wrapper, JSON handling, typed `ApiError`.
- React Query hooks wrap each endpoint with `useQuery`/`useMutation`.
- Mutations invalidate the relevant query keys so lists stay fresh (see `src/lib/query-client.ts` and each hook).

## Deployment model

- Docker multi-stage `Dockerfile` — builder compiles backend + builds frontend; runner copies only build artifacts + production deps. No credentials in image.
- `docker-compose.yml` — `finance-app` (port 3300, `.env.production`) and `finance-app-demo` (port 3301, `IS_DEMO=true`, `.env.demo`). Both join external network `main-apps-network`, `mem_limit: 300m`.
- DB host is the container alias `mysql-db` (network name), never `localhost`.
- Reverse proxy: Nginx Proxy Manager; containers bind `127.0.0.1` only.
- Secrets live only in `.env*` files (git-ignored). `.env.example` documents the variable names.

See `docs/development.md` for local setup and `docs/api-reference.md` for endpoints.
