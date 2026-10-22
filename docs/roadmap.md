# Ledger — Roadmap & Product

## Product vision

Ledger is a personal finance tracker built around one principle: **conscious tracking, not silent automation**. Input is manual by design — Indonesian banks don't offer open APIs for individuals, and auto-scraping is risky and against ToS. Manual entry also forces the awareness that makes budgeting actually work.

The app evolves from an MVP (single user, local) into a proper web application: responsive, well-designed, deployable, and open for future features.

## Target user

Primarily the owner, with email/password authentication, per-user API scoping and browser session-cache isolation implemented. Database-backed ownership and browser account-switch flows are verified locally and in disposable CI. Production deployment and host recovery readiness remain separate checks. A public demo configuration (`finance-app-demo`) supports auto-resetting seed data.

## Product principles

1. **Manual input, honest data.** No fake automation. Every transaction is consciously recorded.
2. **Flexible custom categories.** Categories are not hard-coded enums — they are editable rows supporting sub-categories.
3. **Fast daily capture.** Recording one transaction should take under 10–15 seconds, or the habit dies.
4. **Built for the long term.** Schema is designed so budgeting, savings targets, and CSV import don't require restructuring.

## Current status — audited 2026-10-22

The MVP scope has implementations, but this is not a production-readiness sign-off. The audit covered local source, unit tests, builds/lint, a fresh-context reviewer, and an additional Codex CLI review. Application issues below are source findings unless explicitly stated otherwise; browser flows and the deployed environment were not verified.

| Area | Implemented scope | Remaining work |
|---|---|---|
| Accounts | Wallet CRUD, live balances and dependent-cache refresh | Database-backed regression coverage |
| Categories | Two-level hierarchy, soft-delete, parent-move validation | Database concurrency/integration coverage |
| Transactions | Income/expense/transfers, filters, pagination, correct delete response | Expanded database E2E |
| Dashboard and calendar | Monthly summary, honest widget states, date-aware calendar links | Reports and trends |
| Budget | Monthly limits, full-period totals, realization and fresh cache | Notifications |
| Savings goals | Linked-account progress and dependent-cache refresh | Contribution allocation is future scope |
| Assets/liabilities | CRUD and net worth | Critical-flow regression coverage |
| Auth | Registration/login, isolated browser cache, production Secure cookies, aligned expiry | Full database-backed ownership/session E2E |
| Recurring | Template API and daily scheduler | Date rules, duplicate protection, pause/resume semantics, management UI |
| Demo and shell | Demo reset implementation; responsive grouped navigation | Runtime verification, accessibility and operational checks |

Verification snapshot (not an ongoing guarantee): backend build passed; 10 unit suites / 21 tests passed; frontend lint had 0 errors and 6 refresh-export warnings; backend lint had one Prettier error in `src/seed/demo-seed.ts`. Frontend build was stopped after several minutes without a result, so it remains unverified. Existing E2E only covers `/api/health`.

### Phase 1 delivery — 2026-10-22

T01–T08 implemented on `fix/phase-1-financial-correctness`, with separate commits and acceptance evidence in [todo.md](../tasks/todo.md#execution-evidence). Backend: 39 tests / 11 suites, build and read-only lint passed. Frontend: 9 unit regressions, build and lint passed (six existing Fast Refresh warnings). Six isolated Chrome fixture tests passed, covering session switching, delete UI, page-independent budget totals, widget failures, calendar date links and mobile navigation. Frontend dependency audit reported zero vulnerabilities after compatible patches. The main bundle still emits the existing >500 kB warning.

The earlier snapshot above records the pre-implementation audit. This delivery does not verify production deployment or a real database; the new browser suite uses local API fixtures. Database-backed E2E, CI and backup restoration remain Phase 2. Existing unrelated worktree edits are excluded from the Phase 1 commits.

## Delivery phases

This sequence supersedes the earlier three-phase grouping. Existing features remain the baseline (Phase 0); Phases 1–2 are delivered within the verification boundaries below. Phase 3 is next. Product direction lives here; execution decisions and dependencies live in [tasks/plan.md](../tasks/plan.md), and completion evidence belongs in [tasks/todo.md](../tasks/todo.md). Task IDs are shared across all three documents.

### Phase 0 — Existing MVP baseline

- [x] Accounts, categories, income/expense/transfers, monthly dashboard and transaction calendar implemented
- [x] Budget realization, account-linked savings, assets/liabilities and net worth implemented
- [x] Auth API, demo reset and responsive shell implemented
- [x] Recurring template API and scheduler implemented (partial feature, not a completed user flow)

Known defects are tracked in later phases; checked items above mean implementation exists, not that every flow is verified.

### Phase 1 — Data correctness and user isolation (T01–T08)

- [x] T01: Isolate financial query cache across login/logout and in-flight requests
- [x] T02: Return success after deleting an owned transaction; preserve other users' data
- [x] T03: Refresh budget and savings progress after transactions or account-balance changes
- [x] T04: Calculate monthly budget totals across the full dataset, not the current page
- [x] T05: Show widget loading/errors honestly and link dashboard calendar dates correctly
- [x] T06: Enforce the two-level category hierarchy on parent changes
- [x] T07: Set secure production session-cookie behavior with local HTTP support
- [x] T08: Restore a reproducible frontend build and clean lint baseline without weakening checks

Exit: account switching shows no previous-user data; create/edit/delete/transfer and monthly totals pass regression checks; affected builds and lint pass.

### Phase 2 — Verification and operations (T09–T14)

- [x] T09: Add repeatable critical financial API integration tests with isolated test data
- [x] T10: Verify browser account switching and the main account → transaction → dashboard flow
- [x] T11: Run lint, type/build checks and tests in CI; no automatic production deployment
- [x] T12: Deliver backup automation/templates and prove restoration into an isolated database
- [x] T13: Add request IDs and structured request/job logs without financial payloads or secrets
- [x] T14: Verify environment-specific write/auth throttling and demo/private separation

Exit: CI checks run; cross-user and critical browser flows pass; restore evidence and an operational runbook exist. Service tests grow around actual behavior as each slice is delivered.

Delivered on `chore/phase-2-verification-operations`: nine real MySQL API scenarios, eight browser scenarios (six fixture/two real API), ten database/backup safety checks, 44 backend and nine frontend units. Both builds and lint pass. [CI success](https://github.com/farizindrad/personal-financial-tracker/actions/runs/39762203767) and a [controlled failing gate](https://github.com/farizindrad/personal-financial-tracker/actions/runs/39761417895) are recorded. Final privacy review also removed legacy demo-seed credential output and added a real-reset logging regression. Repeated restores reconcile counts, balances and both views; final restore took 976 ms on tiny synthetic data. See [evidence](../tasks/todo.md#phase-2-evidence---2026-10-22) and [operations](operations.md).

Backup scheduling is supplied as reviewable templates; production timer activation, protected off-host storage, production-sized recovery rehearsal, deployed environment validation and branch protection remain operator work. Backend audit has zero high/critical findings and 20 moderate test-tool findings; frontend audit has zero. Existing six lint warnings and the bundle-size warning remain visible.

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
