# Ledger — Roadmap & Product

## Product vision

Ledger is a personal finance tracker built around one principle: **conscious tracking, not silent automation**. Input is manual by design — Indonesian banks don't offer open APIs for individuals, and auto-scraping is risky and against ToS. Manual entry also forces the awareness that makes budgeting actually work.

The app evolves from an MVP (single user, local) into a proper web application: responsive, well-designed, deployable, and open for future features.

## Target user

Single user (the owner), now with a full multi-user/auth layer (email/password, per-user data scoping) so the app can be shared safely. A public demo instance (`finance-app-demo`) runs with auto-resetting seed data.

## Product principles

1. **Manual input, honest data.** No fake automation. Every transaction is consciously recorded.
2. **Flexible custom categories.** Categories are not hard-coded enums — they are editable rows supporting sub-categories.
3. **Fast daily capture.** Recording one transaction should take under 10–15 seconds, or the habit dies.
4. **Built for the long term.** Schema is designed so budgeting, savings targets, and CSV import don't require restructuring.

## Current status

The following are implemented (Fase 1 + part of Fase 2):

- [x] Accounts / wallets CRUD (bank, cash, e-wallet, other) with live computed balances
- [x] Categories + sub-categories (custom, soft-delete, color-coded)
- [x] Transactions: income, expense, transfer between accounts
- [x] Dashboard summary (total balance, monthly income/expense/net, recent transactions)
- [x] Budgeting per category per month with realization tracking
- [x] Savings goals with progress from linked account balance
- [x] Recurring transactions (templates + daily scheduler)
- [x] Auth & multi-user: email/password, JWT HttpOnly cookie, per-user scoping on all data
- [x] Assets & liabilities CRUD with net worth (account balance + assets − liabilities)
- [x] Calendar view (month/week grid, per-day income/expense drill-down) — merged as a tab inside the Transactions page
- [x] Demo instance with auto-resetting seed (cron, demo-only)
- [x] Web app shell: grouped sidebar navigation (Ringkasan / Keuangan / Perencanaan), topbar, responsive (mobile drawer)
- [x] Clean GCP/Notion-inspired visual system (Outfit + JetBrains Mono, GCP blue accent)

## Phase 1 — MVP (done)

- Core CRUD: accounts, categories, transactions
- Dashboard + basic reports
- Foundation: MySQL schema, NestJS backend, React frontend

## Phase 2 — Discipline features (mostly done)

- [x] Budgeting per category per month (+ over-budget warnings in UI)
- [x] Savings goals with progress tracking
- [x] Recurring transactions (salary, monthly bills)
- [ ] Monthly trend reports (income vs expense chart over several months) — dashboard only shows current month
- [ ] Budget limit notifications (in-app or email)

## Phase 3 — Data & rich tracking

- [ ] CSV import / e-statement upload (semi-automation, manual review)
- [ ] Receipt/note attachments (photo)
- [ ] Free tags across categories (e.g., "Bali trip")
- [ ] Multi-currency (if needed)

## Post-MVP hardening (proper web app)

Product-quality work beyond feature scope:

### Product & UX
- [ ] Real reports page: category breakdown with date range, monthly trends (chart), export CSV
- [ ] Charts (income vs expense, category donut) — e.g., a lightweight chart lib or custom SVG
- [ ] Better empty states, onboarding first-run wizard (create first accounts/categories)
- [ ] Command palette / global "quick add" shortcut (keyboard `n`)
- [ ] Currency formatting options and locale switching

### Engineering & reliability
- [ ] Automated tests across all services (currently each core service has a spec; grow coverage)
- [ ] E2E tests for main user flows (add account → add transaction → see dashboard)
- [ ] CI (even minimal): lint + type-check + test on push
- [ ] Structured logging / request logging; optional error tracking
- [ ] Backup strategy for MySQL (e.g., scheduled `mysqldump`)

### Security & scale
- [x] Multi-user + authentication (email/password, JWT HttpOnly cookie, ownership scoping on every query)
- [x] Demo mode reset scheduler (periodic seed reset for `finance-app-demo`)
- [ ] Separate read/write throttling tuned per environment

### Accessibility & polish
- [ ] Full keyboard navigation + focus states audit
- [ ] Color-contrast pass on all states
- [ ] Reduced-motion support for GSAP transitions

## Design direction

Current shell is a **clean GCP/Notion-style desktop layout**:

- Fixed left sidebar (`w-64`) with grouped nav sections (Ringkasan / Keuangan / Perencanaan), active state highlighted in GCP blue.
- Sticky topbar with breadcrumb; hamburger + overlay drawer on mobile.
- White cards with subtle borders, rounded corners, light shadows on a soft-gray page background.
- Typography: Outfit (headings/body), JetBrains Mono (figures). Accent `#1a73e8` (brand), `#188038` (positive), `#d1242f` (negative).
- GSAP for page transitions and gentle scroll reveals.

## Decision log

| Decision | Status |
|---|---|
| Manual input over bank auto-sync | Final |
| Multi-user with email/password auth + per-user scoping | Final |
| IDR-only in MVP | Final |
| NestJS + Prisma + MySQL | Final |
| SPA (React) served by NestJS, one process | Final |
| Two Docker instances: private + demo | Final |
| Clean GCP/Notion UI (replaces earlier Swiss/brutalist style) | Final (see architecture.md) |
| Recurring via in-process cron, no queue | Final |

## Open questions

- OAuth / "sign in with Google" if sharing becomes real.
- Charting library choice once the reports page is built.
- Whether to add CSV export before CSV import.

## Related documents

- [README.md](../README.md) — project overview (English)
- [README.id.md](../README.id.md) — ringkasan proyek (Bahasa Indonesia)
- [architecture.md](architecture.md) — system design & tech stack
- [development.md](development.md) — local setup
- [api-reference.md](api-reference.md) — REST endpoints
