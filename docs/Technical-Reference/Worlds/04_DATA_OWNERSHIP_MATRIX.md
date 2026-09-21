# Data ownership matrix

| Domain | Owner | Orgo_Worlds role |
|---|---|---|
| World | Orgo_Worlds | authoritative registry |
| WorldRelease | Orgo_Worlds | authoritative immutable release context |
| WorldMembership | Orgo_Worlds | access/routing relationship |
| World control-plane configuration | Orgo_Worlds | local standalone state |
| Signal | Orgo | external reference only; never persisted here |
| WorkflowDefinition / WorkflowVersion | Orgo | never duplicated here |
| Case / Task | Orgo | never duplicated here |
| IntegrationOperation / Outbox | Orgo | never duplicated here |
| Interaction Kernel envelopes | Orgo/Konnaxion integration boundaries | Worlds may provide routing metadata only |
| Kristal / Da'at artifacts | owning external system | reference/provenance only |

The separation cleanup intentionally removed the duplicated Orgo runtime. Any
future feature that requires operational work must call/use the main Orgo product
through an explicit integration contract rather than importing its modules.
