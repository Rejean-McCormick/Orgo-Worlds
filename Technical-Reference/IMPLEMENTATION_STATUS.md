# Orgo Worlds — implementation/documentation status (2026-09-16)

This page reconciles the supplied Orgo_Worlds documentation. It distinguishes **documented implementation claims** from **conformance still requiring execution against the actual source/runtime**.

## Documented as implemented in this snapshot

`INTERACTION_KERNEL.md` documents the following delivered boundary:

- `POST /api/v3/w/{world_key}/ik/interactions`;
- inbound Profile `governance.decision.execute/1.0.0`;
- WorldRelease-driven decision routing to an Orgo-owned WorkflowVersion;
- existing IdempotencyRecord/Signal/Outbox reuse;
- ArtifactLink persistence and `orgo.export/1.0.0`;
- migration-safe `KonnaxionAdapter`;
- Da’at provider for `kristal.build.request/1.0.0` and `kristal.revision.request/1.0.0`;
- protocol-control records `artifact_links`, `build_records`, `release_records`.

These are claims made by the supplied documentation. This docs-only package does not contain the executable application tree needed to rerun or independently prove them.

## Legacy compatibility still documented

- J30/legacy Konnaxion delivery remains available when `KONNAXION_IK_URL` is unset.
- Generic `INTEGRATION_BRIDGE.md` remains a compatibility protocol for operations not yet moved to IK.
- Direct provider `kristal` / `validate` is compatibility-only; new v5 work targets Da’at.

## kOA contract alignment required

The 2026-09-16 kOA ecosystem baseline uses **Build Record v2** and **Release Record v2**, separating compile, validation, recognition, publication and activation state. The docs snapshot references vendored schemas in application code, but those source files are not present in this documentation archive. Before claiming full kOA alignment, verify that the vendored bytes/schema IDs are the v2 contracts.

Kristal baseline remains `5.0.0-rc.1` / commit `af703bf02ee04a69a5f2ad6694fa8b8e56ae2b19`.

## Activation ownership

Orgo does not own physical Runtime Pack activation. A deployment has one activation owner; with kOA-Linux, kOA-Linux owns verify/stage/activate/rollback/recovery state. Orgo may request/track operational work only.

## Acceptance still required

Run the checks in `LOCAL_VALIDATION.md`, including IK replay/conflict, Konnaxion handoff, Da’at/Kristal mapping, Build/Release v2 compatibility and legacy-fallback behavior.
