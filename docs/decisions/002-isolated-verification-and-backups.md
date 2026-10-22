# ADR-002: Isolate integration data and verify restores before production use

## Status

Accepted

## Date

2026-10-22

## Context

The original E2E suite imported the full app using the ordinary environment and only tested health. Its database target was not guarded. Financial correctness, ownership and backup recovery need real MySQL evidence without exposing private/demo data or credentials.

## Decision

Require a dedicated TEST_DATABASE_URL, explicit ALLOW_TEST_DB_RESET=true, a loopback host and a ledger_test_ schema before loading application modules. Never fall back to DATABASE_URL. Clear fixtures only after comparing the live connection's database to that approved target. Local test credentials are restricted to the two newly created test/restore schemas. CI uses a disposable MySQL 8.4 service and a dedicated repository secret, never local or production credentials.

Use the real auth guards, controllers, validation, Prisma queries and database views in API/browser integration tests. Disable cron jobs through test-module provider overrides. Functional suites replace throttler storage so financial assertions do not depend on wall-clock quotas; separate HTTP E2E uses real storage to verify limits and trusted proxies.

Backups stream through mysqldump with single-transaction consistency, write private files atomically and carry SHA-256 manifests. Credentials use a private temporary MySQL option file, not CLI arguments. The supplied restore tool only accepts an empty, distinct, approved local test schema and a matching manifest. Restore drills compare record counts and computed balances, then modify the source to prove restored views are independent. Test-only cleanup is scoped to these approved targets.

## Alternatives Considered

- Mock all financial data: retained for fast UI cases, but insufficient for SQL/view and ownership correctness.
- Reuse the development database: rejected because cleanup and seeds could destroy unrelated data.
- Introduce a new queue/database service into the app: unnecessary; CI services are ephemeral and local verification reuses installed MySQL.
- Automatically restore over production: excluded. A real recovery needs a separate authorized runbook and target validation.

## Consequences

- Tests refuse to run without explicit safe configuration; an absent local test database is an actionable setup failure.
- Backup scheduling is delivered as a systemd template, not silently installed or enabled on a production host.
- Dumps contain financial data. Private permissions and retention are necessary; protected off-host storage/encryption and actual production recovery objectives remain operator responsibilities.
- Database-backed browser tests are separate from fixture browser tests and run serially against the same disposable target.

## References

- [MySQL mysqldump](https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html)
- [Operational runbook](../operations.md)
