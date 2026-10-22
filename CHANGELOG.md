# Changelog

## Unreleased

### Fixed

- Financial data is isolated when switching accounts, logging out or expiring a browser session; old responses cannot repopulate the next session's cache.
- Deleting an owned transaction returns success after deletion instead of reporting a missing-record error.
- Budget and savings figures refresh after transaction/account changes.
- Monthly budget totals cover all pages, and dashboard widgets distinguish request failures from empty data.
- Dashboard calendar links preserve the chosen day and align days with weekdays.
- Categories with children cannot be moved beneath another category.
- Auth quotas apply only to login/register; demo login follows the configured stricter limit.

### Security

- Production cookies use Secure transport; JWT and cookie lifetimes share validated session settings.
- Frontend testing dependencies and compatible dependency patches were updated; no audit-rule suppressions were added.
- Backend compatible security patches and a scoped Prisma configuration merge override remove high/critical audit findings; moderate findings remain tracked.
- Forwarded client IPs are accepted only from explicitly configured proxy addresses.

### Operations

- Added correlated, structured HTTP and scheduler logs with safe fields only.
- Added retained MySQL backups, isolated restore/reconciliation drills and systemd scheduling templates; host activation remains an operator step.

### Development

- Added frontend unit regressions, Chrome fixtures and real database/browser account-switch and financial flows.
- Added guarded disposable MySQL API tests and CI quality/integration jobs without deployment.
