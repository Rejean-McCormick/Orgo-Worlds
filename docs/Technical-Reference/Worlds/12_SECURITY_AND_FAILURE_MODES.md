# Security and failure modes

- An unknown World returns not-found semantics; private World access is membership/permission controlled.
- Archived Worlds are not valid active runtime targets; the default `main` World remains protected by the service invariants.
- Release creation/promotion is explicit and audited by the standalone control-plane state.
- The repository must fail architecture validation if main-product Interaction Kernel, intake, work, Prisma operational schema, outbox or provider adapters are reintroduced.
- World/release identifiers are routing/provenance metadata when exchanged with the main Orgo product; they do not authorize direct writes to Orgo operational state.
- The local header-based standalone context is a development/control-plane mechanism and must not be confused with the main Orgo authentication boundary.

Failure recovery for this repository means restoring/repairing the World control-plane state. Signal/Case/Task/outbox recovery belongs to main Orgo.
