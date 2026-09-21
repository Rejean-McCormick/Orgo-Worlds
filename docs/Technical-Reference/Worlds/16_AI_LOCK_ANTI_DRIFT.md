# AI lock / anti-drift

Any automated change must preserve `ORGO-WORLDS-1` after the 2026-09-19 separation cleanup.

`Orgo_Worlds` owns only World, WorldRelease, WorldMembership and local routing/provenance control-plane state. It MUST NOT import, copy or recreate the main Orgo operational runtime: `Signal`, `WorkflowDefinition`, `WorkflowVersion`, `WorkflowInstance`, `Case`, `Task`, `IntegrationOperation`, Outbox, provider adapters, Prisma operational schema, or the Interaction Kernel product boundary.

World/release values MAY be carried to main Orgo through explicit contracts. They remain routing/provenance context and do not transfer ownership of operational state.

A proposal that changes these ownership boundaries requires a new ADR plus an explicit update to `AI_LOCK.yaml` and the canonical specification.
