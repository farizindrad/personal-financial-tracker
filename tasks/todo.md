# Ledger — Task Checklist

Updated: 2026-10-22. Phase 1 (T01-T08) delivered and verified below; Phase 2 onward remains planned.

See [plan.md](plan.md) for command codes (BF/BU/BB/BL/FB/FL/API/WEB), phase dependencies, risk controls and execution rules; [roadmap](../docs/roadmap.md) for product context. Verification bullets are required work, not claims of passing checks. Paths marked `(new)` are proposed. S = 1–2 implementation files; M = 3–5. Split further if actual scope exceeds five files. Record check output/date and commit next to each completed task.

## Phase 1 — Data correctness and user isolation

### T01: Isolate financial cache between sessions

Clear/partition cached data at authentication transitions and prevent late requests from restoring the previous user's data.

**Acceptance:**
- [x] Switching A → logout → B shows only B's data, including when A's requests finish late.
- [x] Logout/session expiry removes financial cache; login still loads the correct account.

**Verification:** WEB account-switch/late-response regression (runner added by T10; until then document a browser reproduction); FB/FL.
**Dependencies:** None. **Scope:** M.
**Files:** `frontend/src/lib/auth.tsx`, `frontend/src/lib/query-client.ts`, `frontend/src/lib/api-client.ts`, `frontend/src/lib/auth.test.tsx` (new; use browser equivalent if no unit runner).

### T02: Correct the transaction deletion response

Return a successful response after removing an owned transaction without reading the deleted record again.

**Acceptance:**
- [x] Owned deletion returns the documented success response and the row is absent.
- [x] Missing/other-user IDs return not-found without modifying another user's data; UI refreshes on success.

**Verification:** BF `transactions`; BB/BL; delete through UI and compare list/dashboard balances.
**Dependencies:** None. **Scope:** S.
**Files:** `backend/src/modules/transactions/transactions.service.ts`, `backend/src/modules/transactions/transactions.service.spec.ts`.

### T03: Refresh dependent financial data

Update invalidation for transaction mutations and account changes that affect goal progress or summaries.

**Acceptance:**
- [x] Create/edit/delete/transfer refresh relevant accounts, dashboard, budgets and savings goals.
- [x] Editing an account's initial balance refreshes linked goal progress without a page reload.

**Verification:** Browser scenarios with previously cached budget/goal pages; FB/FL. Add scenarios to WEB when T10 exists.
**Dependencies:** T01, T02. **Scope:** M.
**Files:** `frontend/src/hooks/useTransactions.ts`, `frontend/src/hooks/useAccounts.ts`, `frontend/tests/financial-refresh.spec.ts` (new).

### Checkpoint C1 — T01–T03

- [x] Relevant tests, builds and lint pass; verify A/B switching and transaction mutation refresh.
- [x] Record evidence and review risks before continuing; commit each verified slice separately.

### T04: Compute full-period budget totals

Provide a server aggregate so monthly totals do not depend on list page size.

**Acceptance:**
- [x] With more than 20 budgets, changing page leaves period totals unchanged; dashboard totals cover more than 50 budgets too.
- [x] Totals reconcile with all matching owned budgets/expenses, including empty and over-budget periods.

**Verification:** BF `budgets`; BB/BL, FB/FL; fixture spanning at least three pages.
**Dependencies:** None. **Scope:** M.
**Files:** `backend/src/modules/budgets/budgets.service.ts`, `backend/src/modules/budgets/budgets.service.spec.ts`, `frontend/src/types/budgets.ts`, `frontend/src/pages/Budgets/index.tsx`, `frontend/src/pages/Dashboard/index.tsx`.

### T05: Make dashboard widgets reflect their data state

Distinguish loading/errors from genuine zero values and preserve the clicked calendar date.

**Acceptance:**
- [x] Failed budget/goal/calendar requests show a retry state instead of a misleading zero or empty result.
- [x] Selecting a dashboard day opens that date's transactions; the mini calendar aligns with weekdays.

**Verification:** WEB request failure, retry and date-link scenarios; FB/FL.
**Dependencies:** T04. **Scope:** M.
**Files:** `frontend/src/pages/Dashboard/index.tsx`, `frontend/src/pages/Transactions/index.tsx`, `frontend/src/pages/Transactions/TransactionCalendar.tsx`, `frontend/tests/dashboard.spec.ts` (new).

### T06: Preserve the category hierarchy on moves

Enforce the documented two-level category structure at the API boundary.

**Acceptance:**
- [x] Moving a parent with children cannot create a third level or a cycle.
- [x] Valid child moves work; another user's category cannot be used as a parent.

**Verification:** BF `categories`; BB/BL; inspect returned tree after valid and invalid API moves.
**Dependencies:** None. **Scope:** S.
**Files:** `backend/src/modules/categories/categories.service.ts`, `backend/src/modules/categories/categories.service.spec.ts`.

### Checkpoint C2 — T04–T06

- [x] Verify totals across pages, widget failure states and category moves with affected checks passing.
- [x] Record evidence and review risks; no unchecked acceptance item is treated as done.

### T07: Harden session-cookie transport settings

Use secure cookie settings for HTTPS production while retaining explicit local development support.

**Acceptance:**
- [x] Production login/register use Secure and HttpOnly cookies; local HTTP works under documented configuration.
- [x] Logout clears the same cookie scope; cookie/JWT lifetime settings are consistent and documented.

**Verification:** New auth-controller tests plus BU/BB/BL; inspect Set-Cookie under local and production-like configurations.
**Dependencies:** T01. **Scope:** M.
**Files:** `backend/src/modules/auth/auth.controller.ts`, `backend/src/modules/auth/auth.controller.spec.ts` (new), `backend/src/modules/auth/auth.module.ts`, `docs/development.md`, `.env.example`.

### T08: Establish reproducible build/lint checks

Reproduce the incomplete frontend build and fix actual causes; resolve known lint failures without lowering checks.

**Acceptance:**
- [x] Frontend and backend build commands complete in the documented supported environment, or a concrete blocker remains explicitly open.
- [x] Lint has no errors; the seed formatting error is fixed and existing refresh-export warnings are resolved or recorded separately without suppressing rules.

**Verification:** BU/BB/BL/FB/FL; record duration, environment and exact results.
**Dependencies:** None. **Scope:** M, investigation first.
**Files:** `backend/src/seed/demo-seed.ts`, `docs/development.md`; add at most three evidence-identified source/config files, split unrelated fixes.

### Checkpoint C3 — Phase 1 exit

- [x] T01–T08 acceptance/evidence complete; run phase-exit checks from plan.md.
- [x] Demonstrate isolation, delete success, full-period totals and secure-cookie configuration; review remaining risks.

## Phase 2 — Verification and operations

Phase 1 is the default prerequisite for this phase.

### T09: Verify critical financial APIs with isolated data

Extend health-only E2E coverage using a dedicated disposable test database and cleanup procedure.

**Acceptance:**
- [ ] Fixtures verify create/edit/delete/transfer and resulting balances, budget realization, savings and net worth.
- [ ] Two-user scenarios verify reads and mutations cannot cross ownership; tests refuse an unapproved database target.

**Verification:** API/BU/BB/BL; repeat on a clean isolated database and verify cleanup.
**Dependencies:** T01–T08. **Scope:** M.
**Files:** `backend/test/finance.e2e-spec.ts` (new), `backend/test/helpers/fixture.ts` (new), `backend/test/jest-e2e.json`, `backend/.env.test.example` (new), `docs/development.md`.

### T10: Add critical browser regression flows

Reuse the Playwright/Chrome fixture runner established in Phase 1 and extend it to database-backed fixtures from T09. The Phase 1 suite does not complete this full-stack task.

**Acceptance:**
- [ ] Account → transaction → dashboard and budget/goal refresh flows pass, including errors and deletion.
- [ ] Account switching with cached and in-flight responses never displays the previous user's data.

**Verification:** Run the newly documented WEB command on clean fixtures; FB/FL. Preserve lockfile changes as part of the runner setup.
**Dependencies:** T09. **Scope:** M.
**Files:** `frontend/package.json`, `frontend/package-lock.json`, `frontend/playwright.config.ts` (new, or chosen runner equivalent), `frontend/tests/finance.spec.ts` (new), `docs/development.md`. Split additional scenario files into a follow-up if needed.

### T11: Gate changes in CI

Automate the established checks without introducing automatic deployment.

**Acceptance:**
- [ ] Push/PR runs install from lockfiles, lint, unit tests, builds/type checks and isolated API/browser tests.
- [ ] A failing check fails the workflow; fixtures and credentials are separate from demo/private production data.

**Verification:** Run on a branch and inspect successful checks plus a controlled failing-check run.
**Dependencies:** T08–T10. **Scope:** M.
**Files:** `.github/workflows/checks.yml` (new), `docs/development.md`, backend/frontend package scripts only if required (maximum five files).

### Checkpoint C4 — T09–T11

- [ ] Critical API/browser tests and CI run reproducibly; record commands and fixture safety.
- [ ] Review failures without weakening checks or skipping substantive scenarios.

### T12: Prove MySQL backup restoration

Schedule backups with retention and a restore drill into an isolated database.

**Acceptance:**
- [ ] Backup job records success/failure and documented storage/retention without committed credentials.
- [ ] Restore preserves representative balances/transactions; runbook states recovery objectives and measured restore duration.

**Verification:** Back up a local fixture, restore into a different approved test database, reconcile totals; never restore over production during this task.
**Dependencies:** T09. **Scope:** M.
**Files:** `backend/scripts/backup-db` (new, extension chosen for deployment), `backend/scripts/restore-db` (new), `docs/operations.md` (new), deployment scheduler config (new).

### T13: Add diagnostic request and job logs

Connect request IDs to structured errors and recurring/demo job outcomes.

**Acceptance:**
- [ ] Requests and job runs emit duration/outcome with a traceable ID and actionable errors.
- [ ] Logs exclude cookies, passwords, tokens, transaction descriptions and financial payloads.

**Verification:** Exercise success/failure cases in local fixtures; inspect emitted logs; BU/BB/BL.
**Dependencies:** T09. **Scope:** M.
**Files:** `backend/src/main.ts`, `backend/src/common/filters/all-exceptions.filter.ts`, `backend/src/common/request-logging.middleware.ts` (new), `backend/src/scheduler/recurring.scheduler.ts`, `backend/src/scheduler/demo-reset.scheduler.ts`.

### T14: Verify limits and demo/private isolation

Document and test read/write/auth throttling per environment and demo reset boundaries.

**Acceptance:**
- [ ] Write/auth limits and read policy match documented environment settings and proxy identity behavior.
- [ ] Demo reset cannot run in private mode; demo/private deployment configuration uses distinct data targets.

**Verification:** Existing throttler tests plus isolated demo-reset scenarios; BU/BB/BL; review Compose/environment examples without exposing secrets.
**Dependencies:** T11–T13. **Scope:** M.
**Files:** `backend/src/common/throttler.config.ts`, `backend/src/common/throttler.config.spec.ts`, `backend/test/demo-isolation.e2e-spec.ts` (new), `docs/operations.md`, `.env.example`.

### Checkpoint C5 — Phase 2 exit

- [ ] CI, isolated tests, restore evidence, logs and environment boundaries verified; phase-exit checks pass.
- [ ] Review operational runbook and outstanding risks before feature expansion.

## Phase 3 — Complete recurring transactions

Phases 1–2 are prerequisites. Contracts are settled before UI exposure.

### T15: Fix recurrence date advancement

Document month-end, leap-year and timezone rules and implement the chosen behavior.

**Acceptance:**
- [ ] January 29/30/31, February 29 and subsequent months follow a recorded anchor policy without accidental month skipping.
- [ ] Daily/weekly/yearly schedules and scheduler timezone boundaries match the documented contract.

**Verification:** BF `recurring-transactions`; BB/BL; inspect a year of generated dates using disposable fixtures.
**Dependencies:** Phase 2. **Scope:** M.
**Files:** `backend/src/modules/recurring-transactions/recurring-transactions.service.ts`, its `.service.spec.ts`, `backend/src/scheduler/recurring.scheduler.ts`, `docs/api-reference.md`; schema change is a separate prerequisite slice if the chosen anchor needs persistence.

### T16: Validate recurring date ranges

Apply the same start/end/next-run consistency rules to creation, partial updates and execution eligibility.

**Acceptance:**
- [ ] Contradictory ranges fail before writing, including partial updates against existing dates.
- [ ] Execution never generates before start or after end; existing invalid records have a documented handling strategy.

**Verification:** BF `recurring-transactions`; BB/BL; boundary API cases on test data.
**Dependencies:** T15. **Scope:** M.
**Files:** recurring service/spec, `dto/create-recurring-transaction.dto.ts`, `dto/update-recurring-transaction.dto.ts`, `docs/api-reference.md` under the existing recurring module/docs paths.

### T17: Make occurrence generation retry-safe

Protect persisted recurring occurrences against overlapping jobs, retries and partial failure.

**Acceptance:**
- [ ] Concurrent processing of the same template/date creates one transaction and advances the schedule consistently.
- [ ] Retry after failure does not duplicate a committed occurrence; migration/recovery procedure is recorded.

**Verification:** Focused service tests plus concurrent API/DB fixture scenario; BU/BB/BL; rehearse migration locally.
**Dependencies:** T16. **Scope:** M.
**Files:** `backend/prisma/schema.prisma`, one new migration, recurring service/spec, `backend/test/recurring-concurrency.e2e-spec.ts` (new). Put recovery notes in the task evidence; split schema rollout if compatibility demands it.

### Checkpoint C6 — T15–T17

- [ ] Boundary dates, chronology and concurrent/retried generation verified; relevant checks and migration rehearsal pass.
- [ ] Review scheduling contract and recovery evidence before adding management UI.

### T18: Specify safe pause/resume behavior

Implement explicit missed-occurrence handling and inactive account/category rules.

**Acceptance:**
- [ ] Resume skips or explicitly confirms bounded catch-up according to a recorded policy; no surprising silent mass backfill.
- [ ] Inactive/missing relations and long downtime have deterministic outcomes without blocking unrelated schedules.

**Verification:** BF `recurring-transactions`; BB/BL; pause/resume and long-gap fixtures.
**Dependencies:** T17. **Scope:** M.
**Files:** recurring service/spec, `dto/update-recurring-transaction.dto.ts`, recurring controller, `docs/api-reference.md`.

### T19: Show recurring schedules

Add a usable read-only schedule list connected to the existing API.

**Acceptance:**
- [ ] Navigation opens owned schedules with amount, frequency, status and next date; pagination works.
- [ ] Loading, empty, error/retry and unauthenticated states work on mobile and desktop.

**Verification:** WEB list/error/ownership scenarios; FB/FL.
**Dependencies:** T18. **Scope:** M.
**Files:** `frontend/src/App.tsx`, `frontend/src/lib/nav.ts`, `frontend/src/hooks/useRecurringTransactions.ts` (new), `frontend/src/types/recurring-transactions.ts` (new), `frontend/src/pages/RecurringTransactions/index.tsx` (new).

### T20: Create schedules through the UI

Add an accessible schedule form with API validation feedback.

**Acceptance:**
- [ ] A user creates a valid owned schedule and immediately sees it in the list.
- [ ] Invalid amounts/dates/relations show actionable errors; repeated submission cannot create accidental duplicates in the form flow.

**Verification:** WEB valid/invalid submission; API generation on fixture dates; FB/FL.
**Dependencies:** T19. **Scope:** M.
**Files:** recurring page, recurring hook/types, `frontend/src/pages/RecurringTransactions/RecurringForm.tsx` (new), `frontend/tests/recurring.spec.ts` (new).

### Checkpoint C7 — T18–T20

- [ ] Resume contract and list/create flow verified with affected tests/build/lint.
- [ ] Review mobile form and generated fixture transaction before extending schedule management.

### T21: Edit, pause and resume schedules

Complete management using the tested scheduling contract and explicit catch-up feedback.

**Acceptance:**
- [ ] Editing changes the intended future schedule; pause prevents generation while inactive.
- [ ] Resume communicates missed-occurrence handling and next date; cache/list updates without reload.

**Verification:** WEB create/edit/pause/resume; focused scheduler tests and isolated end-to-end generation; full phase-exit checks.
**Dependencies:** T20. **Scope:** M.
**Files:** recurring page/form/hook/types and `frontend/tests/recurring.spec.ts`.

### Checkpoint C8 — Phase 3 exit

- [ ] Complete schedule management works; month-end, restart/retry, duplicate and pause cases pass.
- [ ] Review evidence; only now mark recurring as a complete product flow in the roadmap.

## Phase 4 — Reports and export

### T22: Report by period and category

Deliver a read-only reports page with date filters and full-scope category totals.

**Acceptance:**
- [ ] Totals reconcile with owned transactions for date boundaries, empty periods and categories; transfers do not inflate income/expense.
- [ ] Report results are independent of transaction-list pagination and include loading/error handling.

**Verification:** Focused dashboard/report tests; BB/BL/FB/FL; compare fixture report to transaction aggregates.
**Dependencies:** Phase 2, T04. **Scope:** M.
**Files:** dashboard service/spec/controller, `frontend/src/pages/Reports/index.tsx` (new), `frontend/src/App.tsx`. Start with the existing API client; split navigation/types if additional files are required.

### T23: Add multi-month trends

Extend reporting with a bounded monthly income/expense series.

**Acceptance:**
- [ ] Series includes zero-activity months and correctly crosses year boundaries.
- [ ] Each month reconciles with the period report under identical filters.

**Verification:** Focused report tests; BB/BL/FB/FL; compare a fixture year including empty months.
**Dependencies:** T22. **Scope:** M.
**Files:** dashboard service/spec/controller, Reports page, `frontend/src/types/reports.ts` (new).

### T24: Visualize reports accessibly

Add trend and category charts after selecting the smallest suitable approach.

**Acceptance:**
- [ ] Charts reflect report data and include readable tabular/text alternatives, usable on mobile and keyboard.
- [ ] Chart choice, accessibility and bundle impact are recorded; loading/errors remain understandable.

**Verification:** WEB reports/keyboard/empty scenarios; FB/FL; inspect production bundle size change.
**Dependencies:** T23. **Scope:** M.
**Files:** Reports page, `frontend/src/components/reports/Charts.tsx` (new), package/lockfile if a library is needed, `frontend/tests/reports.spec.ts` (new).

### Checkpoint C9 — T22–T24

- [ ] Reports and charts reconcile with fixtures; phase-relevant checks pass.
- [ ] Review date/category semantics and accessibility before exporting financial data.

### T25: Export complete filtered CSV

Provide an owner-scoped export that covers all filtered transactions and is safe to open in spreadsheets.

**Acceptance:**
- [ ] Export includes every matching row beyond one list page; dates, amounts, quoting and encoding are documented and deterministic.
- [ ] Formula-like descriptions are escaped safely; unauthorized data never appears; large exports are bounded safely.

**Verification:** Backend export regression cases, API ownership and WEB download scenarios; BB/BL/FB/FL; open representative CSV in a spreadsheet.
**Dependencies:** T22, T24. **Scope:** M.
**Files:** transaction service/controller/spec, `frontend/src/pages/Reports/index.tsx`, `docs/api-reference.md`.

### Checkpoint C10 — Phase 4 exit

- [ ] Full filtered CSV reconciles with reports and balances; full phase-exit checks pass.
- [ ] Review exported format as the contract before CSV import begins.

## Phase 5 — Daily capture and accessibility

### T26: Guide the first recorded transaction

Improve first-run guidance and empty states without requiring artificial demo data.

**Acceptance:**
- [ ] A new user can create the first account/category and reach transaction entry; guidance can be dismissed/revisited.
- [ ] Empty, loading and error states remain distinct; existing users are not forced through setup again.

**Verification:** WEB fresh/existing-user flow; FB/FL; mobile walkthrough.
**Dependencies:** Phase 2. **Scope:** M.
**Files:** Dashboard, Accounts, Categories and Transactions page entry files; `frontend/tests/onboarding.spec.ts` (new).

### T27: Capture transactions with quick add

Reuse the transaction form from a global action and `n` shortcut.

**Acceptance:**
- [ ] Global action and `n` open a usable form; shortcut does not fire inside editable inputs or conflicting dialogs.
- [ ] Save refreshes affected data, restores focus and supports the documented 10–15 second representative entry flow.

**Verification:** WEB shortcut/save/focus scenarios; FB/FL; timed desktop/mobile capture walkthrough.
**Dependencies:** T26, T03. **Scope:** M.
**Files:** AppLayout, TransactionForm, `frontend/src/components/transactions/QuickAdd.tsx` (new), Transactions page, `frontend/tests/quick-add.spec.ts` (new).

### T28: Notify in-app when budgets reach thresholds

Add useful budget alerts after defining thresholds and acknowledgement/reset behavior.

**Acceptance:**
- [ ] Threshold crossings display the correct category/period alert after spending changes.
- [ ] Refresh/repeated mutations do not duplicate alerts; period changes and corrected/deleted spending follow the recorded policy.

**Verification:** BF `budgets`; WEB threshold/reset scenarios; BB/BL/FB/FL.
**Dependencies:** T03, T04, T26. **Scope:** M.
**Files:** budgets service/spec, frontend budget types, Budgets page, `frontend/tests/budget-alerts.spec.ts` (new). If persistent acknowledgements require schema changes, extract that prerequisite before coding.

### Checkpoint C11 — T26–T28

- [ ] New-user capture, quick add and deduplicated alerts verified with affected checks.
- [ ] Review capture time and alert policy before polishing interactions.

### T29: Complete keyboard and focus behavior

Audit navigation and form overlays, then fix identified keyboard blockers in a focused slice.

**Acceptance:**
- [ ] Navigation and overlays support keyboard operation, visible focus, Escape and correct focus restoration/trapping.
- [ ] Labels and errors are announced meaningfully; the audited route/state matrix is recorded.

**Verification:** WEB keyboard scenarios; FB/FL; manual keyboard/screen-reader pass. Split route-specific fixes if the audit exceeds five files.
**Dependencies:** T27. **Scope:** M.
**Files:** `frontend/src/components/ui/Sheet.tsx`, `Drawer.tsx`, `FormOverlay.tsx`, `frontend/src/components/layout/AppNav.tsx`, `frontend/tests/accessibility.spec.ts` (new).

### T30: Correct contrast and non-color cues

Audit text, financial states and controls against WCAG AA contrast requirements.

**Acceptance:**
- [ ] Text/control contrast passes the applicable AA requirements across default, hover, focus, error and disabled states.
- [ ] Income/expense, budget and status meanings remain understandable without color alone.

**Verification:** Record measured contrast and representative route/state checks; WEB accessibility scenarios; FB/FL.
**Dependencies:** T24, T28, T29. **Scope:** M.
**Files:** `frontend/src/index.css`, `frontend/src/lib/labels.ts`, up to two audit-identified page files, accessibility browser scenarios.

### T31: Respect reduced-motion preferences

Prevent nonessential GSAP/CSS motion when the user requests reduced motion.

**Acceptance:**
- [ ] Reduced-motion mode leaves all content visible and usable without entrance/scroll animation dependencies.
- [ ] Standard motion remains functional and responds safely to preference changes without leaked triggers/listeners.

**Verification:** WEB emulated preference plus manual OS toggle; FB/FL. Audit all animated routes and split fixes into additional slices if more than five files are involved.
**Dependencies:** T29, T30. **Scope:** M per subtask below; T31 completes only after all four.

| Subtask | Acceptance/outcome | Dependencies | Likely files (maximum five) | Verification |
|---|---|---|---|---|
| T31a | Reduced motion works for navigation/shell; CSS leaves content visible | T29, T30 | `src/index.css`, `src/hooks/useMotionPreference.ts` (new if needed), AppLayout, AppNav, accessibility browser spec, all under frontend | WEB preference toggle; FB/FL |
| T31b | Dashboard and Accounts honor both motion modes | T31a | Dashboard and Accounts page files, accessibility browser spec | WEB both routes; FB/FL |
| T31c | Assets, Budgets and SavingsGoals honor both modes | T31b | Those three page files, accessibility browser spec | WEB three routes; FB/FL |
| T31d | Transactions, TransactionCalendar and Categories honor both modes | T31c | Those three page files, accessibility browser spec | WEB three routes; FB/FL |

- [ ] T31a complete with evidence and commit.
- [ ] T31b complete with evidence and commit.
- [ ] Checkpoint: shell and first two routes pass before T31c; review evidence.
- [ ] T31c complete with evidence and commit.
- [ ] T31d complete with evidence and commit; inspect later-added report/recurring pages for shared motion compliance too.

### Checkpoint C12 — Phase 5 exit

- [ ] Recorded keyboard/contrast/motion route matrix has no outstanding required fixes; full phase-exit checks pass.
- [ ] Review mobile capture and accessibility evidence; unresolved route fixes keep this checkpoint open.

## Phase 6 — Reviewed CSV import

### T32: Preview one supported CSV format

Specify a bounded CSV/e-statement format and show a read-only parse preview.

**Acceptance:**
- [ ] Supported encoding, delimiters, dates, size/row limits and example file are documented.
- [ ] Valid files show a preview; malformed/oversized input gives row-level errors and writes no financial records.

**Verification:** Parser cases and WEB upload/preview/error scenarios; affected backend/frontend checks.
**Dependencies:** T25. **Scope:** M.
**Files:** `frontend/src/pages/Import/index.tsx` (new), `frontend/src/lib/csv-preview.ts` (new), `frontend/src/lib/csv-preview.test.ts` (new; use established runner), `frontend/src/App.tsx`, `docs/import-format.md` (new).

### T33: Map and validate preview rows

Allow explicit column and owner-account/category mapping before any confirmed write.

**Acceptance:**
- [ ] Dates/amounts/types and account/category mappings are validated with actionable row errors.
- [ ] Unknown or other-user relations cannot be accepted; invalid rows cannot silently enter the confirmation batch.

**Verification:** Backend validation tests and WEB mapping/correction scenarios; BB/BL/FB/FL.
**Dependencies:** T32. **Scope:** M.
**Files:** `backend/src/modules/transactions/import.service.ts` (new), its `.spec.ts` (new), transaction controller/module, frontend Import page.

### T34: Confirm imports safely

Persist only an explicitly confirmed validated batch with duplicate/retry protection.

**Acceptance:**
- [ ] Confirmation shows selected rows, totals and duplicate decisions; cancellation writes nothing.
- [ ] Retry/double submission does not duplicate transactions; result summarizes imported/skipped/rejected rows and balances reconcile.

**Verification:** API confirmation/retry/ownership tests, WEB preview → confirm → dashboard; BB/BL/FB/FL; phase-exit tests.
**Dependencies:** T33, T17 (reuse established retry-safety principles, not necessarily the same implementation).
**Scope:** M per subtask; all required before T34 is complete.

| Subtask | Acceptance/outcome | Dependencies | Likely files (maximum five) | Verification |
|---|---|---|---|---|
| T34a | Persist a batch identity/duplicate policy with a rehearsed compatible migration; no financial write on preview | T33, T17 | schema, one migration, import service/spec, import-format docs | BF import, migration rehearsal; BB/BL |
| T34b | Confirmed API import writes validated owned rows once; retry and partial failure follow documented policy | T34a | import service/spec, transaction controller/module, `backend/test/import.e2e-spec.ts` | API concurrent/retry/ownership fixtures; BB/BL |
| T34c | UI shows confirmation totals, duplicate choices and result; cancel writes nothing and success refreshes data | T34b | Import page, import hook/types (new), import browser spec | WEB cancel/confirm/retry and balance reconciliation; FB/FL |

- [ ] T34a complete with evidence and commit.
- [ ] T34b complete with evidence and commit.
- [ ] Checkpoint: validate API retry safety and migration recovery before UI confirmation.
- [ ] T34c complete with evidence and commit.

### Checkpoint C13 — Phase 6 exit

- [ ] T32–T34 preview/mapping/confirmation and retry cases verified; phase-exit checks pass.
- [ ] Review format limitations, duplicate policy and migration/recovery evidence before using real exports.

## Phase 7 — Rich tracking

### T35: Upload private receipt attachments

Set storage/retention/access rules and deliver the smallest owner-scoped upload path.

**Acceptance:**
- [ ] Valid images attach to an owned transaction; file type/size/count restrictions are enforced and failure leaves no orphaned object.
- [ ] Storage is private; owner authorization and migration/recovery/retention notes are documented.

**Verification:** Upload validation/ownership tests and a fixture upload; BB/BL.
**Dependencies:** Phase 2, T25. **Scope:** M per subtask.

| Subtask | Acceptance/outcome | Dependencies | Likely files (maximum five) | Verification |
|---|---|---|---|---|
| T35a | Document private storage/retention/recovery and persist attachment metadata with a rehearsed migration | Phase 2, T25 | schema, one migration, attachment service/spec (new), `docs/attachments.md` | Metadata tests and migration/recovery rehearsal; BB/BL |
| T35b | Owner-scoped upload validates size/type/count and cleans failed uploads | T35a | attachment service/spec, transaction controller/module, attachment DTO (new) | API valid/invalid/other-user uploads; BB/BL |

- [ ] T35a complete with evidence and commit.
- [ ] T35b complete with evidence and commit.
- [ ] Checkpoint: inspect private object access and upload cleanup before T36.

### T36: Manage receipt attachments through the app

Provide upload/view/remove controls with authorized retrieval and transaction lifecycle cleanup.

**Acceptance:**
- [ ] Owners upload, view and remove attached receipts; unauthorized reads/removals fail.
- [ ] Removing a transaction or attachment cleans storage according to the documented recovery/retention policy; missing files fail gracefully.

**Verification:** API ownership/lifecycle and WEB receipt scenarios; BB/BL/FB/FL.
**Dependencies:** T35, T02. **Scope:** M per subtask.

| Subtask | Acceptance/outcome | Dependencies | Likely files (maximum five) | Verification |
|---|---|---|---|---|
| T36a | Authorized read/remove works; transaction deletion cleans storage according to policy and handles missing objects | T35, T02 | attachment service/spec, transaction controller/service, transaction service spec | API ownership/read/remove/deletion fixtures; BB/BL |
| T36b | UI uploads/views/removes receipts with useful error and pending states | T36a | TransactionForm, Transactions page, attachment hook/types (new), receipt browser spec | WEB full receipt lifecycle; FB/FL |

- [ ] T36a complete with evidence and commit.
- [ ] T36b complete with evidence and commit.
- [ ] Checkpoint: demonstrate end-to-end receipt lifecycle and review failure cleanup before tagging.

### T37: Tag transactions

Introduce owner-scoped tags with a minimal add/remove transaction flow.

**Acceptance:**
- [ ] Users create/reuse a tag and add/remove it from a transaction without changing its financial amount.
- [ ] Duplicate/renamed tags and other-user IDs follow a recorded uniqueness/ownership policy.

**Verification:** Tag ownership/relationship tests and WEB add/remove flow; BB/BL/FB/FL; schema rehearsal.
**Dependencies:** Phase 2. **Scope:** M per subtask.

| Subtask | Acceptance/outcome | Dependencies | Likely files (maximum five) | Verification |
|---|---|---|---|---|
| T37a | Persist owned tags/links and expose add/remove operations enforcing uniqueness and ownership | Phase 2 | schema, one migration, transaction service/spec/controller | API ownership/link tests, migration rehearsal; BB/BL |
| T37b | Users create/reuse/remove tags in transaction entry without changing financial values | T37a | TransactionForm, transaction types/hook, tag browser spec, transaction DTO | WEB tagging round trip, API validation; BB/BL/FB/FL |

- [ ] T37a complete with evidence and commit.
- [ ] T37b complete with evidence and commit.

### Checkpoint C14 — T35–T37

- [ ] Private upload/lifecycle and tagging pass ownership checks; no orphaned file/data regressions.
- [ ] Review storage/migration recovery and full affected checks before reporting on tags.

### T38: Filter transactions and reports by tag

Add a tag dimension to existing list/report/export behavior.

**Acceptance:**
- [ ] Tag filters select only matching owned transactions and preserve correct period totals.
- [ ] Report/export share the documented tag semantics; clearing filters restores baseline totals.

**Verification:** Focused aggregation/ownership tests and WEB filter scenarios; BB/BL/FB/FL; compare filtered export.
**Dependencies:** T37, T22, T25. **Scope:** M per subtask.

| Subtask | Acceptance/outcome | Dependencies | Likely files (maximum five) | Verification |
|---|---|---|---|---|
| T38a | Transaction list/export accept owned tag filters with consistent semantics | T37, T25 | transaction service/spec/controller/query DTO | API owned/other-user/empty tag filter and export fixtures; BB/BL |
| T38b | Report aggregation applies identical tag semantics without duplicate sums | T38a, T22 | dashboard service/spec/controller/query DTO | Multi-tag report reconciliation; BB/BL |
| T38c | UI filters transaction/report/export scope consistently and clearing restores totals | T38b | Reports page, Transactions page, transaction hook/types, tag-filter browser spec | WEB filter/clear/export scenarios; FB/FL |

- [ ] T38a complete with evidence and commit.
- [ ] T38b complete with evidence and commit.
- [ ] Checkpoint: API/report/export tag totals reconcile before UI filters.
- [ ] T38c complete with evidence and commit.

### Checkpoint C15 — Phase 7 exit

- [ ] Attachment and tagging acceptance/tests complete; phase-exit checks and filtered reconciliation pass.
- [ ] Review lifecycle, ownership and recovery evidence before marking rich tracking complete.

## Phase 8 — Conditional expansion decisions

These tasks deliver adopt/defer decisions, not the listed features. If adopted, append a separate S/M implementation breakdown with acceptance, dependencies and checks before writing code. Do not check the roadmap feature as shipped on the strength of discovery alone.

### T39: Evaluate email budget reminders

**Acceptance:**
- [ ] Decide adopt/defer based on usefulness, provider/cost, consent, unsubscribe, deduplication and retry policy.
- [ ] If adopted, record a separate delivery plan with notification privacy and failure tests.

**Verification:** DOC; review decision against T28's real alert behavior.
**Dependencies:** T28, T13. **Scope:** S.
**Files:** `docs/decisions/email-reminders.md` (new), task checklist additions if adopted.

### T40: Evaluate locale and currency capabilities

**Acceptance:**
- [ ] Make separate adopt/defer decisions for formatting/locale preferences and actual multi-currency accounting.
- [ ] Any multi-currency proposal specifies FX valuation date/source, precision, transfer handling and historical net worth before implementation planning.

**Verification:** DOC; reconcile worked currency examples and confirm IDR-only behavior remains the default until delivery.
**Dependencies:** T22–T25. **Scope:** S.
**Files:** `docs/decisions/locale-and-currency.md` (new), task checklist additions if adopted.

### Checkpoint C16a — T39–T40 decisions

- [ ] Review email and locale/currency adopt/defer decisions with their prerequisites and costs.
- [ ] Adopted work has its own small-slice plan; no implementation is implied by discovery completion.

### T41: Evaluate Google OAuth

**Acceptance:**
- [ ] Decide adopt/defer based on broader-sharing needs and account recovery requirements.
- [ ] If adopted, specify account linking, duplicate email handling, callback/session safety and ownership regression scenarios in a separate plan.

**Verification:** DOC; review linking/recovery examples against the existing auth flow.
**Dependencies:** T01, T07, T09, T10. **Scope:** S.
**Files:** `docs/decisions/oauth.md` (new), task checklist additions if adopted.

### T42: Evaluate navigation and diagnostics expansion

**Acceptance:**
- [ ] Record independent adopt/defer decisions for a command palette beyond quick add and external error tracking beyond local logs.
- [ ] If adopted, split delivery plans; include keyboard conflicts for palette and redaction/retention/cost for error tracking.

**Verification:** DOC; compare actual quick-add usage and diagnostic gaps to the proposals.
**Dependencies:** T27, T29, T13. **Scope:** S.
**Files:** `docs/decisions/optional-expansion.md` (new), task checklist additions if adopted.

### Checkpoint C16 — Decision backlog review

- [ ] Review T41/T42 decisions and consolidate all Phase 8 outcomes with rationale.
- [ ] All adopted features have separate small-slice plans; deferred opportunities remain visible.

## Execution evidence

For each implemented task, append: `Task ID | date | commands/scenarios | results | commit | remaining risk`. A task is complete only when its acceptance and verification pass. Failed or unrun checks remain explicit. The 2026-10-22 audit snapshot is historical context, not verification for future changes.

### Phase 1 evidence - 2026-10-22

| Task | Implemented outcome and evidence | Commit |
|---|---|---|
| T01 | Fresh cache per session, aborted/late responses rejected, local expiry on protected 401. Three failing cases became green; four auth unit cases pass. Chrome account-switch fixture passes. ADR-001 records offline/cancellation limits. | aa21d61 |
| T02 | Owner-scoped deletion succeeds without a post-delete read; missing/unowned rows return not-found. Reproduction failed before the fix; regression and Chrome delete/form-close/list-refresh pass. | 716eda4 |
| T03 | Financial mutations invalidate budget/goal dependencies. Five initially failing cache-state regressions now pass. | 90f9ada |
| T04 | Typed summary computes full-period decimal totals, including empty/over-budget periods. Two failing cases became green; 61-budget pagination fixture and Chrome totals check pass. | bcb043f |
| T05 | Widget pending/error/retry states, aligned mini calendar and date-aware links. Chrome error-state/selected-date checks pass; mobile screenshot inspected. | a14c606 |
| T06 | Rejects reparenting categories with children, cycles and foreign parents; permits a valid leaf move. Six category cases pass after regression and test-fixture isolation fixes. | a001959 |
| T07 | Secure production cookie, validated shared TTL, matching logout scope; nine cookie/controller cases pass (eight failed before implementation). Configuration and API docs updated. | 29b4386 |
| T08 | Seed formatting corrected; both builds and lint verified. Frontend tooling and compatible dependency updates recorded; audit reported zero vulnerabilities. | c6a0e71, 3cff988 |

Final verification on Node 24.21.0 / Windows:

- Backend: npm.cmd test -- --runInBand: 39 tests in 11 suites passed; npm.cmd run build passed; read-only ESLint over src/test passed with zero errors/warnings.
- Frontend: npm.cmd test: 9 tests in two suites passed; npm.cmd run build passed (49.05 seconds for the recorded Vite bundle step); npm.cmd run lint passed with zero errors and six existing Fast Refresh warnings.
- Browser: npm.cmd run test:browser: six Chrome fixture scenarios passed (1.4 minutes). Covers user switching, constant budget totals, delete UI, failed widgets, chosen calendar date and mobile navigation. Fixtures touch no database. On this managed Windows environment the runner needs permission to start/stop its own processes; the final authorized run exited cleanly.
- Frontend npm.cmd audit fix applied compatible patches and reported zero vulnerabilities. This is not a backend dependency audit or a production security sign-off.
- The >500 kB frontend chunk warning remains; no rule, threshold or test was suppressed. The earlier interrupted build was not proof of a source compile error.
- C1/C2/C3 evidence reviewed locally: old/failing behavior reproduced, fixes/scope inspected, affected suites/build/lint passed. Deployment and live database verification were not performed; T09-T14 remain open.
- API contracts: existing data/meta unchanged; additive budget summary, delete 204/404 behavior, cookie transport/lifetime and retry semantics documented in api-reference.md.
- Existing README, design and typography worktree changes were preserved and excluded from these commits. Browser fixtures: f4d4f02; planning baseline: 5a2266b.
