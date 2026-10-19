# Security and failure modes

- An unknown World returns not-found semantics; private World access is membership/permission controlled.
- Archived Worlds are not valid active runtime targets; the default `main` World remains protected by the service invariants.
- Release creation/promotion is explicit and audited by the standalone control-plane state.
- The repository must fail architecture validation if main-product Interaction Kernel, intake, work, Prisma operational schema, outbox or provider adapters are reintroduced.
- World/release identifiers are routing/provenance metadata when exchanged with the main Orgo product; they do not authorize direct writes to Orgo operational state.
- The local header-based standalone context is a development/control-plane mechanism and must not be confused with the main Orgo authentication boundary.

Failure recovery for this repository means restoring/repairing the World control-plane state. Signal/Case/Task/outbox recovery belongs to main Orgo.

## Tandem 1.0 P1: standalone local trust boundary (2026-10-19)

The standalone Worlds API currently gets `organizationId`, `userId` and
`permissions` (including `*`) from **untrusted caller-supplied headers**.
The standalone web client also supplies those headers. This is NOT OIDC, not
Konfid verification and not the main Orgo RBAC boundary.

Consequently **the API cannot be deployed as an authenticated public service**.
Its bootstrap refuses `NODE_ENV=production`/other nondevelopment modes and
nonloopback bindings, including `0.0.0.0`/Docker/LAN hostnames. The request
middleware additionally rejects nonloopback TCP peers and unknown browser
Origins. CORS accepts only localhost:3100 and 127.0.0.1:3100, without
credentials. A reverse proxy exposing localhost would STILL defeat the local
trust assumption; do NOT proxy this API to a public endpoint.

`START_ORGO_WORLDS.pyw` has been restored to loopback binding. If a local Orgo
Docker frontend used `host.docker.internal:4100`, that cross-container bridge
is intentionally unavailable until it can deliver **server-verified** identity,
tenant and RBAC context (not user-supplied headers). The main `Orgo` product
remains unchanged; all FakePlant fixture files remain unchanged.

Control-plane lifecycle guards: archived Worlds refuse new releases,
promotions, membership mutations and runtime activation. Runtime release
lookup rejects a release belonging to another World or not in `current`
status. JSON state remains development-only storage, not a signed release set.

To qualify for VPS: integrate a real authenticated trusted boundary, remove
untrusted identity headers, verify organization membership and World ACLs
against main Orgo/Konfid, and perform PostgreSQL/concurrency/runtime tests.
**This change is a local security stopgap, not a production SSO integration.**
