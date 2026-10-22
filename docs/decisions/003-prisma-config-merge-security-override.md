# ADR-003: Patch Prisma configuration merging without migrating the ORM

## Status

Accepted

## Date

2026-10-22

## Context

The dependency audit found high-severity GHSA-ggr8-5vv4-36mx in the deepmerge-ts version pinned by Prisma 6's @prisma/config. Compatible dependency updates fixed the other high/critical findings. npm's remaining suggested fix would migrate the project to Prisma 7, which changes the ORM/configuration contract and belongs in a separate migration.

## Decision

Keep Prisma 6.19.3 and scope an exact deepmerge-ts 8.0.0 override to @prisma/config. The installed consumer dynamically imports the public deepmerge function for plain configuration objects. This project does not use its Map merging, custom merge metadata types or deepmergeInto behavior, which changed in v8. Validate this exception through Prisma generation, migration deployment and the real MySQL suites, alongside the audit gate. No advisory is suppressed.

## Alternatives Considered

- Accept or hide the high finding: rejected; the new CI high/critical gate should remain effective.
- Run audit fix --force: rejected because a Prisma major migration would expand this phase substantially.
- Override every deepmerge consumer: rejected; scope the compatibility exception to the inspected consumer.

## Consequences

Revisit the override when upgrading Prisma or introducing richer configuration objects. Remove it once the upstream supported dependency is patched. Remaining moderate test-tool advisories must stay visible; they are not claimed to be resolved by this change.

## References

- [deepmerge-ts v8 release and security fix](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0)
