# Ledger operations

## Scope and verification boundaries

Phase 2 supplies isolated MySQL integration tests, Chrome tests against the real API, CI checks, backup/restore tooling, structured logs and environment-boundary tests. Production deployment and timer activation are separate operations. Never point test cleanup, seeds or restore drills at private/demo databases.

## Isolated test database

Create two disposable local schemas with different names beginning `ledger_test_`. Grant a dedicated test user privileges only on those schemas, sufficient for Prisma migrations and views. Copy `backend/.env.test.example` to ignored `backend/.env.test` and fill TEST_DATABASE_URL, RESTORE_TEST_DATABASE_URL and ALLOW_TEST_DB_RESET=true locally. Do not paste credentials into issues/chat or commit them.

All test entry points validate the dedicated URL before importing application modules. There is no DATABASE_URL fallback. Only loopback MySQL and the approved prefix are accepted. Fixture cleanup additionally checks SELECT DATABASE() against the approved target. The test app disables scheduled jobs via provider overrides; functional financial suites substitute rate-limit storage, while the separate boundary E2E uses real rate-limit storage.

From the repository root (use npm.cmd on Windows):

```sh
npm run test:safety --prefix backend
npm run test:db:prepare --prefix backend
npm run test:e2e --prefix backend -- --runInBand
npm run test:restore --prefix backend
npm run test:browser --prefix frontend
npm run test:integration --prefix frontend
```

Run database-backed suites serially; they share the disposable schema and perform cleanup. Fixture-only browser tests never use a database. The real browser suite starts an API on 127.0.0.1:3018 and Vite on 127.0.0.1:5179; ordinary fixture browser tests use port 5178. Ports must be free. Local Chrome is used; CI installs Playwright Chromium. Runner teardown performs guarded cleanup in its own Node process, since Windows process-tree termination may bypass server signal handlers. Test server code must never be deployed as the application server.

## CI

`.github/workflows/checks.yml` runs on pushes and PRs with contents:read permissions, pinned action commits and Node 24. Quality checks include read-only lint, type/build checks, safety/unit tests and a high/critical dependency audit gate. Integration runs use disposable MySQL 8.4, migrations, API E2E, restore drills, fixture browser tests and real database/browser tests. Failure evidence is retained for three days; it contains synthetic test data only. There is no deployment step.

The repository secret CI_MYSQL_PASSWORD is used only for the ephemeral CI MySQL root account. It is separate from local and production credentials. The integration step constructs properly encoded database URLs without printing them. Fork PRs do not receive repository secrets; a maintainer must arrange a trusted run without granting production credentials or using pull_request_target to execute untrusted code.

Configure branch protection to require the Ledger checks jobs before merging. Workflow files cannot configure branch protection by themselves. Record remote run links and any permission/plan limitations in the task evidence. Local passing checks do not prove a remote run succeeded.

## Backups and restore drills

The backup program requires BACKUP_DATABASE_URL and BACKUP_DIR explicitly; it never silently uses the app's DATABASE_URL. Use a dedicated backup account with the read/metadata privileges required by mysqldump's selected flags (including views, triggers, events and routines where present). Set MYSQL_BIN_DIR if mysql/mysqldump are not on PATH; on this Windows machine it is `C:\Program Files\MySQL\MySQL Server 8.4\bin`.

```sh
npm run backup:db --prefix backend
npm run restore:db --prefix backend -- /absolute/path/to/ledger-backup.sql
```

Credentials are passed through a private temporary option file and removed after the subprocess exits. Passwords are absent from command-line arguments and logs. Dumps stream to private files; only completed dumps get a SHA-256 manifest. A failed backup exits nonzero and never publishes a partial file. BACKUP_RETENTION_DAYS defaults to 7; retention only removes expired Ledger dumps with matching schema manifests in the configured directory. Use different directories for private/demo backups.

The restore CLI deliberately accepts only an empty, distinct, approved local test target from RESTORE_TEST_DATABASE_URL, with explicit ALLOW_TEST_DB_RESET=true. It validates the tool-generated manifest/checksum. Only use trusted Ledger-generated SQL artifacts: a checksum detects corruption, not authenticity or malicious SQL. The tool is not a general-purpose untrusted-SQL sandbox or an automatic production recovery command.

`test:restore` creates synthetic financial records, backs up, restores, compares all model counts and computed balances, then mutates the source to prove restored views are independent. It removes its source fixture and empties its dedicated restore target afterward. It refuses a nonempty restore target rather than deleting unknown contents.

The final two consecutive local drills backed up 20,193 bytes each. Backup took 317/253 ms, restore 1,049/976 ms and reconciliation 1,606/1,408 ms total. Both computed views were reconciled and the restore target was empty after cleanup. Repetition exposed and fixed a leftover monthly-summary view in the original cleanup. These small synthetic drills are evidence of correctness, not production recovery performance. Proposed operating objectives are RPO 24 hours and RTO 30 minutes; approve and validate them with a production-sized authorized recovery rehearsal before relying on them.

Single-transaction dumps assume transactional tables and no concurrent schema migrations/DDL. Schedule outside migration windows. Store dumps in access-restricted storage; arrange protected off-host copies/encryption according to the actual host policy. The local scheduler alone is not off-host disaster recovery.

### Scheduling template

`deploy/ledger-backup.service` and `.timer` are reviewable systemd templates: daily at 02:00 in the server's timezone with up to five minutes jitter and persistent catch-up. They are not installed/enabled by this change. Adapt the account, WorkingDirectory, Node binary and protected EnvironmentFile to the host, and ensure the MySQL client can reach the selected database. For the current Docker deployment, the internal mysql-db hostname may not resolve on the host; select an authorized reachable endpoint or run the one-shot client in the existing trusted network. Do not expose a new public MySQL port or create another database server.

After approving host-specific values, install the service/timer and enable it through the host's normal deployment process. Verify `systemctl list-timers ledger-backup.timer`, inspect `journalctl -u ledger-backup.service`, and confirm a real artifact before declaring scheduling operational. Monitor missing daily success, nonzero exit status, disk capacity and restore-drill age. Recover into a new isolated database first, reconcile balances and only then plan an authorized production cutover.

## Request/job diagnostics

On-call questions:

1. Which route/request failed, with what status and duration?
2. Which scheduled job last succeeded or failed, and how long did it take?
3. Did rate limiting reject a write/auth attempt, and was client IP attribution configured correctly?

Production Nest output is JSON. HTTP events include a server-generated requestId (also returned as X-Request-Id), route template, method, status, duration and outcome. Server error bodies add requestId. Error/job logs allow only safe error codes, never arbitrary exception messages or stacks. Scheduled jobs use runId and entryPoint=scheduler; backup/restore use entryPoint=cli. Query strings, credentials, cookies, auth headers, request bodies and transaction descriptions are excluded from logs. No external telemetry service is added.

Use requestId/runId to correlate events. Prisma codes such as P2002/P2003 identify known failure classes; UNEXPECTED_ERROR requires a controlled local reproduction without turning on raw payload/secret logging. Missing scheduled-job success or repeated failure events should trigger host monitoring; no new alerting provider has been configured here.

## Limits, proxies and demo isolation

Default policy per handler/client IP: private writes 100/minute plus 25/10 seconds; demo writes 20/minute plus 5/10 seconds. Login/register additionally use auth limits of 10/minute privately and 5/minute in demo. Auth limits do not apply to ordinary writes. GET/HEAD/OPTIONS remain unthrottled under the current product policy. Demo registration is disabled regardless of rate limits.

Forwarded IPs are untrusted by default. Set TRUST_PROXY_IPS to a comma-separated list of explicit IP addresses only when the immediate proxy is controlled and direct access is restricted. Broad true/CIDR settings are intentionally unsupported. The proxy must sanitize/append forwarding headers correctly; otherwise attribution can be forged. With no trusted proxy configuration, clients behind one proxy share its limit bucket. HTTP E2E verifies default spoof resistance and separate clients behind an explicitly trusted loopback proxy.

Before recreating production containers, run from backend:

```sh
node scripts/check-deployment-isolation.cjs ../.env.production ../.env.demo
```

The check reads config without printing values, requires private IS_DEMO=false and demo IS_DEMO=true, and requires distinct schema names even if hosts differ. Compose uses separate environment files and explicitly sets demo mode for finance-app-demo; keep the demo environment file consistent for validation. Actual server environment files must be checked on that server; repository examples are not proof of deployed separation.

The reset scheduler returns before seeding in private mode. Real database tests reseed the configured demo user twice while preserving an unrelated private fixture. This does not justify mixing private/demo deployment schemas; keep them separate.
