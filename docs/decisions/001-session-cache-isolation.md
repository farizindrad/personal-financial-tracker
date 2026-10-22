# ADR-001: Replace financial caches at session boundaries

## Status

Accepted

## Date

2026-10-22

## Context

Financial query keys are resource-based and the previous singleton QueryClient survived logout/login. Fresh cached results could therefore be reused for a different owner. Clearing visible state alone does not isolate late query results or mutation callbacks. The API's ownership checks remain the authorization boundary; browser isolation prevents disclosure of previously fetched data on a shared browser.

## Decision

AuthProvider owns a QueryClient for each local session generation. Login/registration success, logout and authenticated API expiry replace that client, clear the previous cache and remount query observers. Every API request belongs to the current generation: boundary changes abort pending transport and reject late responses even when a transport ignores cancellation. A protected endpoint's 401 expires the local session; login and bootstrap 401 responses remain ordinary authentication results.

Keep existing endpoint names, response shapes and query keys. Session changes do not persist financial data or tokens in browser storage. Existing mutation callbacks reference the previous client and cannot populate the replacement cache.

## Alternatives Considered

- Only invalidate queries: rejected because a fresh previous-user value remains observable while refetching.
- Add user IDs to every key: valid future option, but requires changing every hook and still needs mutation/transport cleanup on logout.
- Reload the page on every login/logout: simpler isolation but discards SPA state and does not give an explicit testable request boundary.

## Consequences

- Switching users costs fresh queries and remounts local route state, which is intentional at a session boundary.
- Cancelling a request cannot undo a database mutation already accepted by the server. Refresh the next session from its API; do not claim cancellation rolls back writes.
- Local logout clears visible financial data even when the network logout fails. The server cookie may remain until a successful logout or expiry, so offline logout is not server-side revocation.
- Unit regressions cover fresh-cache switching, delayed responses, logout failure and 401 expiry. Browser fixture tests supplement these; real multi-user database E2E remains Phase 2 work.

## References

- [TanStack QueryClient](https://tanstack.com/query/latest/docs/framework/react/reference/QueryClient)
- [Query cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation)
- [Phase 1 tasks](../../tasks/todo.md)
