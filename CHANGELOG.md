# Changelog

## Unreleased

### Fixed

- Financial data is isolated when switching accounts, logging out or expiring a browser session; old responses cannot repopulate the next session's cache.
- Deleting an owned transaction returns success after deletion instead of reporting a missing-record error.
- Budget and savings figures refresh after transaction/account changes.
- Monthly budget totals cover all pages, and dashboard widgets distinguish request failures from empty data.
- Dashboard calendar links preserve the chosen day and align days with weekdays.
- Categories with children cannot be moved beneath another category.

### Security

- Production cookies use Secure transport; JWT and cookie lifetimes share validated session settings.
- Frontend testing dependencies and compatible dependency patches were updated; no audit-rule suppressions were added.

### Development

- Added frontend unit regressions and isolated Chrome UI fixture tests. Database integration verification remains separate Phase 2 work.
