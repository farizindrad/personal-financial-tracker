# Ledger — Implementation Plan

Updated: 2026-10-22. Status: planned; feature implementation has not started under this plan.

## Overview

Turn the existing finance MVP into a reliable daily application in small verified increments. The user requested that all audit recommendations and the existing backlog be recorded and divided into phases. [Roadmap](../docs/roadmap.md) is the product summary; [todo.md](todo.md) is the authoritative task checklist. This document records execution order, decisions and risks, without duplicating completion checkboxes.

## Baseline and scope

- Existing NestJS/Prisma/MySQL monolith serves a React SPA; retain this architecture and manual capture.
- Accounts, transactions, category hierarchy, dashboard/calendar, budgets, savings, assets/liabilities and auth have implementations. Recurring currently has an API/scheduler only.
- Audit snapshot: backend build and 21 unit tests in 10 suites passed; frontend lint had six warnings; backend lint had one Prettier error; frontend build did not complete before being stopped. Browser flows, backup restoration and deployed state remain unverified.
- Source findings are candidates for reproducible regression tests, not evidence that the deployed application has been exercised.
- This delivery changes planning documents only. Existing uncommitted application/design edits are outside its scope.

## Architecture and execution decisions

1. Fix existing financial behavior and session isolation before expanding the UI. Isolate cache at authentication boundaries, including in-flight responses; API ownership remains mandatory.
2. Compute full-period financial aggregates on the server independently of list pagination. Do not infer a monthly total from one page.
3. Keep recurrence in-process initially. Define date and resume rules before UI exposure; protect persisted occurrences against retries/concurrent invocations rather than relying only on a process-local lock.
4. Keep amount calculations decimal-safe; maintain existing string response conventions. Reports exclude transfers from income/expense and state period boundaries explicitly.
5. Export before import. Import requires preview, explicit confirmation, ownership checks and retry safety. First support one documented CSV format.
6. Each task is an independently reviewable increment, normally S (1–2 files) or M (3–5 files). Listed paths are estimates; split a task before implementation if more than five implementation files or multiple independent outcomes are needed. Updating task evidence does not justify bundling unrelated changes.
7. An incomplete route must stay behind a disabled feature flag where necessary. Database increments need a compatibility/recovery plan and must be validated against disposable data before deployment.
8. Prefer a single focused test over tests that merely mirror code. Reuse successful checks until a relevant change invalidates them. Commit each verified implementation slice separately; preserve pre-existing work.

## Task index and dependency graph

| Phase | Task IDs | Prerequisites | Delivery checkpoint |
|---|---|---|---|
| 0: Existing MVP | Baseline only | — | Implemented scope, known defects remain |
| 1: Correctness | T01–T08 | None; T03 follows T01/T02, T05 follows T04 | Cache isolation, financial mutations, aggregates, hierarchy, cookies and build baseline |
| 2: Verification/operations | T09–T14 | Phase 1; T10 follows T09; T11 follows T09/T10 | Critical API/browser flows, CI, restore drill and operational evidence |
| 3: Recurring | T15–T21 | Phases 1–2; T15 → T16 → T17 → T18 → T19 → T20 → T21 | Complete schedule management and exactly-once occurrence effect under tested retry scenarios |
| 4: Reports/export | T22–T25 | Phase 2; T22 → T23 → T24; T25 follows T22 | Reconciled reports and full filtered export |
| 5: Daily UX | T26–T31 | Phase 2; T27 follows T26; T28 follows T03/T04 | First-run, capture speed, alerts and accessibility |
| 6: Import | T32–T34 | T25; T32 → T33 → T34 | No preview writes; confirmed/retried imports reconcile |
| 7: Rich tracking | T35–T38 | Phase 2, T25; T35 → T36; T37 → T38, T22 → T38 | Private attachment lifecycle and tag-filtered reporting |
| 8: Conditional expansion | T39–T42 | Related prerequisite tasks in todo.md | Adopt/defer decisions; separate implementation plans if adopted |

Default execution follows phase order; dependencies identify what is technically required if priorities are revised. Do not infer authorization to run multiple agents from this table. No production deployment is part of a checkpoint.

T31, T34–T38 contain 16 explicitly ordered subtasks in todo.md. Each subtask has its own outcome, dependencies, estimated file set and verification; commit and record evidence per subtask. Parent tasks remain open until every required subtask passes.

## Verification commands

Run from the repository root; commands below use Windows `npm.cmd` for this workspace. On other platforms use `npm`.

| Code | Command / procedure |
|---|---|
| BU | `npm.cmd --prefix backend test -- --runInBand` |
| BF | Focused backend suite: `npm.cmd --prefix backend test -- --runInBand <service-name>.service.spec.ts` |
| BB | `npm.cmd --prefix backend run build` |
| BL | `cd backend`, then `.\node_modules\.bin\eslint.cmd "{src,test}/**/*.ts"` (read-only; repository `lint` currently uses `--fix`) |
| FB | `npm.cmd --prefix frontend run build` (includes TypeScript build) |
| FL | `npm.cmd --prefix frontend run lint` |
| API | `npm.cmd --prefix backend run test:e2e -- --runInBand` using the isolated fixture configuration added by T09; never point it at private/demo production data |
| WEB | Browser test runner/command established and documented in T10; there is currently no frontend test script. Add focused browser scenarios as each UI slice lands. |
| DOC | `git diff --check`; validate local Markdown links, task IDs and dependency ordering |

Each task's verification references this table and includes a concrete manual/scenario check. For a frontend-only task, use WEB once available plus FB/FL. For backend-only work use BF (or BU for cross-cutting behavior), BB/BL. Use both groups for a full-stack slice. Do not claim a check exists before T09/T10 establish its fixture/runner.

At every 2–3-task checkpoint, run the affected suites/build/lint and inspect the diff. At each phase exit, run BU, BB/BL and FB/FL; API/WEB are additionally required once established. Record results, commands, date and any blocker in todo.md. A failed gate stays open; do not lower checks or convert failures to skipped tests.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Browser cache leaks prior-user data | High | T01 tests account switches, expired sessions and late responses; T09/T10 verify API/browser isolation |
| Mutation commits but API reports failure | High | T02 regression covers deletion and subsequent refresh |
| Pagination or stale cache changes displayed totals | High | T03/T04 full-dataset totals and dependency invalidation; T05 honest widget errors |
| Month-end drift, retry duplication or resume backfill | High | T15–T18 define contracts and persistent duplicate protection before UI |
| Test/restore/seed command touches real data | High | Disposable DB with explicit local test configuration; validate target before writes |
| New migration cannot be rolled back safely | High | Additive compatible migrations; rehearsal and documented recovery before rollout |
| Existing build failure hidden by CI changes | Medium | T08 reproduces baseline; T11 retains failing checks until fixed |
| Upload access, CSV parsing or spreadsheet formula abuse | High | Ownership/size/type limits, bounded parsing, export sanitization and failure tests |
| Scope grows beyond a session | Medium | Split actual >5-file tasks; phase 8 is decision-only until separately planned |

## Open decisions and proposed defaults

- T15: choose anchored month-end behavior (proposed: clamp to the last valid day and preserve the original anchor for later months), leap-day policy and a documented timezone. This is a proposal, not current behavior.
- T18: decide whether resume skips or explicitly confirms missed occurrences. Never surprise the user with silent backfill; define bounds and inactive account/category handling.
- T28: choose alert thresholds, acknowledgement and month reset behavior. Start in-app; email remains conditional.
- T32/T35: choose first CSV format and attachment storage/access/retention before implementing their slices.
- T24: choose charts only after checking accessibility and bundle impact; preserve a table alternative.
- T39–T42: decide whether actual demand justifies email, multi-currency, OAuth, command palette or external error tracking. Do not treat a discovery checkbox as feature delivery.

Record decisions in the relevant task before coding. At checkpoints present the evidence and risks for review; creating this plan does not mark its implementation approved or complete.
