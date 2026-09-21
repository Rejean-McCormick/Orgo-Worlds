# ADR register

- **ADR-W01** — Orgo Worlds is a standalone sibling repository, not a copy of main Orgo.
- **ADR-W03** — WorldRelease is an immutable configuration/provenance generation, not a copy of operational history.
- **ADR-W05** — Organization identity and World membership remain additive control-plane context.
- **ADR-W07 (2026-09-19 separation cleanup)** — Main Orgo exclusively owns Signal/Workflow/Case/Task/IntegrationOperation/Outbox and provider adapters. Orgo_Worlds must not recreate them.
- **ADR-W08 (2026-09-21 IK placement)** — The Konnaxion↔Orgo Interaction Kernel boundary terminates in main Orgo. Orgo_Worlds may supply World/release routing/provenance metadata only.

ADR-W02/W04/W06 from the pre-separation phase (row-key operational isolation, `/api/v3/w/{key}` operational route rewriting, and worker/outbox release pinning) are superseded for this standalone repository. They may remain useful historical context for the main product integration, but they are not active Orgo_Worlds runtime decisions.
