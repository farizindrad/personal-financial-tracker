# Ledger — Roadmap & Product

## Product vision

Ledger is a personal finance tracker built around one principle: **conscious tracking, not silent automation**. Input is manual by design — Indonesian banks don't offer open APIs for individuals, and auto-scraping is risky and against ToS. Manual entry also forces the awareness that makes budgeting actually work.

The app evolves from an MVP (single user, local) into a proper web application: responsive, well-designed, deployable, and open for future features.

## Target user

Primarily the owner, with email/password authentication and per-user API scoping implemented. Browser cache isolation and cross-user regression tests still need work before treating multi-user readiness as verified. A public demo configuration (`finance-app-demo`) supports auto-resetting seed data.

## Product principles

1. **Manual input, honest data.** No fake automation. Every transaction is consciously recorded.
2. **Flexible custom categories.** Categories are not hard-coded enums — they are editable rows supporting sub-categories.
3. **Fast daily capture.** Recording one transaction should take under 10–15 seconds, or the habit dies.
4. **Built for the long term.** Schema is designed so budgeting, savings targets, and CSV import don't require restructuring.

## Current status — audited 2026-10-22

The MVP scope has implementations, but this is not a production-readiness sign-off. The audit covered local source, unit tests, builds/lint, a fresh-context reviewer, and an additional Codex CLI review. Application issues below are source findings unless explicitly stated otherwise; browser flows and the deployed environment were not verified.

| Area | Implemented scope | Remaining work |
|---|---|---|
| Accounts | Wallet CRUD and live computed balances | Regression coverage and dependent-cache refresh |
| Categories | Custom categories, two-level hierarchy, soft-delete | Enforce hierarchy when moving an existing parent |
| Transactions | Income, expense, transfers, filters, pagination | Delete response and dependent-cache correctness |
| Dashboard and calendar | Monthly summary, recent activity, daily/month/week views | Accurate aggregate widgets, reports and trends |
| Budget | Monthly category limits, realization, over-budget UI | Totals across pages, fresh data, notifications |
| Savings goals | Progress from linked account balance | Fresh data; contribution allocation is future scope |
| Assets/liabilities | CRUD and net worth | Critical-flow regression coverage |
| Auth | Registration/login, JWT HttpOnly cookie, per-user API queries | Browser cache isolation, production cookie hardening, isolation tests |
| Recurring | Template API and daily scheduler | Date rules, duplicate protection, pause/resume semantics, management UI |
| Demo and shell | Demo reset implementation; responsive grouped navigation | Runtime verification, accessibility and operational checks |

Verification snapshot (not an ongoing guarantee): backend build passed; 10 unit suites / 21 tests passed; frontend lint had 0 errors and 6 refresh-export warnings; backend lint had one Prettier error in `src/seed/demo-seed.ts`. Frontend build was stopped after several minutes without a result, so it remains unverified. Existing E2E only covers `/api/health`.

## Delivery phases

This sequence supersedes the earlier three-phase grouping. Existing features remain the baseline (Phase 0); all new tasks are unchecked. Product direction lives here; execution decisions and dependencies live in [tasks/plan.md](../tasks/plan.md), and completion evidence belongs in [tasks/todo.md](../tasks/todo.md). Task IDs are shared across all three documents.

### Phase 0 — Existing MVP baseline

- [x] Accounts, categories, income/expense/transfers, monthly dashboard and transaction calendar implemented
- [x] Budget realization, account-linked savings, assets/liabilities and net worth implemented
- [x] Auth API, demo reset and responsive shell implemented
- [x] Recurring template API and scheduler implemented (partial feature, not a completed user flow)

Known defects are tracked in later phases; checked items above mean implementation exists, not that every flow is verified.

### Phase 1 — Data correctness and user isolation (T01–T08)

- [ ] T01: Isolate financial query cache across login/logout and in-flight requests
- [ ] T02: Return success after deleting an owned transaction; preserve other users' data
- [ ] T03: Refresh budget and savings progress after transactions or account-balance changes
- [ ] T04: Calculate monthly budget totals across the full dataset, not the current page
- [ ] T05: Show widget loading/errors honestly and link dashboard calendar dates correctly
- [ ] T06: Enforce the two-level category hierarchy on parent changes
- [ ] T07: Set secure production session-cookie behavior with local HTTP support
- [ ] T08: Restore a reproducible frontend build and clean lint baseline without weakening checks

Exit: account switching shows no previous-user data; create/edit/delete/transfer and monthly totals pass regression checks; affected builds and lint pass.

### Phase 2 — Verification and operations (T09–T14)

- [ ] T09: Add repeatable critical financial API integration tests with isolated test data
- [ ] T10: Verify browser account switching and the main account → transaction → dashboard flow
- [ ] T11: Run lint, type/build checks and tests in CI; no automatic production deployment
- [ ] T12: Automate MySQL backups and prove restoration into an isolated database
- [ ] T13: Add request IDs and structured request/job logs without financial payloads or secrets
- [ ] T14: Verify environment-specific write/auth throttling and demo/private separation

Exit: CI checks run; cross-user and critical browser flows pass; restore evidence and an operational runbook exist. Service tests grow around actual behavior as each slice is delivered.

### Phase 3 — Complete recurring transactions (T15–T21)

- [ ] T15: Define and test month-end/leap-year scheduling and timezone behavior
- [ ] T16: Validate start/end/next-run dates consistently on create and update
- [ ] T17: Prevent duplicate generation under overlapping execution and retries
- [ ] T18: Define pause/resume, catch-up limits and inactive-relation behavior
- [ ] T19: Provide a recurring schedule list with navigation and loading/error states
- [ ] T20: Let users create a schedule through the application
- [ ] T21: Let users edit, pause and resume a schedule with explicit catch-up feedback

Exit: the complete UI flow produces the expected occurrence once; date boundaries, restart/retry and pause/resume cases are verified. No new queue or service is required by default.

### Phase 4 — Reports and data export (T22–T25)

- [ ] T22: Report income/expense by date range and category with accurate totals
- [ ] T23: Add a multi-month income/expense trend with zero-activity months
- [ ] T24: Add accessible trend and category-breakdown charts with tabular alternatives
- [ ] T25: Export the full filtered transaction dataset as safe CSV, independent of pagination

Exit: reports reconcile with transactions; transfers do not inflate income/expense; export matches the selected scope. CSV export precedes import.

### Phase 5 — Daily capture and accessible UX (T26–T31)

- [ ] T26: Guide first-time users through account/category setup with useful empty states
- [ ] T27: Open a reusable quick-add transaction form with a global `n` shortcut
- [ ] T28: Add deduplicated in-app budget threshold alerts
- [ ] T29: Audit and fix keyboard navigation, dialogs and focus restoration
- [ ] T30: Audit and fix contrast and non-color status indicators
- [ ] T31: Honor reduced-motion preferences across GSAP and CSS transitions

Exit: first-run and daily capture work on mobile and keyboard; shortcut avoids text inputs; alerts remain useful without duplication. Capture target: under 10–15 seconds in a documented representative flow.

### Phase 6 — Reviewed CSV import (T32–T34)

- [ ] T32: Define supported CSV/e-statement format and implement bounded preview parsing
- [ ] T33: Map columns, dates, amounts, accounts and categories with explicit validation
- [ ] T34: Confirm imports with duplicate detection, retry safety and an import result summary

Exit: preview writes nothing; confirmed imports are scoped to the owner and reconcile with balances; retries do not duplicate rows. Start with one documented CSV format; PDF/OCR and bank sync are separate future decisions.

### Phase 7 — Rich tracking (T35–T38)

- [ ] T35: Set attachment storage/access/retention rules and add a secure receipt upload slice
- [ ] T36: Let owners view/remove receipt attachments with transaction-aware cleanup
- [ ] T37: Add owned tags and transaction tagging
- [ ] T38: Filter transactions/reports by tags such as a trip or project

Exit: attachments cannot be read across users; lifecycle cleanup is verified; tag filters preserve report totals. Storage and schema changes require explicit migration/recovery notes.

### Phase 8 — Conditional expansion (T39–T42)

These are retained opportunities, not committed implementation scope. Each task first produces a small decision/specification; approved implementation must be decomposed before coding.

- [ ] T39: Evaluate email budget reminders after in-app alerts (provider, opt-in, privacy, retries)
- [ ] T40: Evaluate formatting/locale preferences and multi-currency separately (valuation, FX source, precision)
- [ ] T41: Evaluate Google OAuth only if broader sharing warrants it (account linking/recovery)
- [ ] T42: Evaluate a command palette and external error tracking against demonstrated needs

Exit: each opportunity has an explicit adopt/defer decision, rationale and, if adopted, a separate small-slice plan. IDR remains the default; no silent scope expansion.

## Increment rules

1. Deliver one logical outcome per task; target 1–5 implementation files. Split further if the actual change grows beyond that.
2. Write a regression test for behavioral fixes, implement the slice, run focused checks and the affected build/lint, then record evidence and commit only that slice.
3. Keep every increment usable and revertible. Hide unfinished user-facing features behind a disabled flag when needed.
4. Checkpoint every 2–3 tasks and at phase exits. Review evidence and remaining risks before continuing.
5. Use local/disposable data for integration tests, scheduler checks and restore drills. Production data changes/deployments are separate work.
6. Mark tasks done only after acceptance and verification pass; update this phase summary from the task list rather than treating a document edit as implementation.

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

- Recurring month-end policy, timezone and pause/resume catch-up semantics (T15/T18).
- Budget alert threshold and acknowledgement/reset behavior (T28).
- Charting choice based on accessibility, bundle impact and existing stack (T24).
- First supported CSV/e-statement format (T32); export comes first (T25).
- Attachment storage/retention and private access policy (T35).
- OAuth, locale/multi-currency, email reminders and external error tracking are conditional Phase 8 decisions.

## Related documents

- [README.md](../README.md) — project overview (English)
- [README.id.md](../README.id.md) — ringkasan proyek (Bahasa Indonesia)
- [architecture.md](architecture.md) — system design & tech stack
- [development.md](development.md) — local setup
- [api-reference.md](api-reference.md) — REST endpoints
- [Implementation plan](../tasks/plan.md) — dependencies, decisions, risks and verification commands
- [Task checklist](../tasks/todo.md) — acceptance criteria, checkpoints and execution evidence
