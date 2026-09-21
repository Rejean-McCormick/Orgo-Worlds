# Infrastructure scoping

The standalone repository is intentionally lightweight. Its runtime state is
`runtime/orgo-worlds-state.json` unless a future explicit control-plane storage
backend replaces it. It does not require the main Orgo PostgreSQL/Prisma schema,
worker, outbox or provider adapters.

Main Orgo infrastructure remains owned and operated by the `Orgo` repository.
