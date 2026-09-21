# Data model

Post-separation, this repository persists only its World control-plane model:

```text
Organization reference
  └── * World
        ├── * WorldRelease
        └── * WorldMembership
```

The current standalone store is `runtime/orgo-worlds-state.json`. `World.current_release_id` points to the currently promoted immutable release context. Release numbers are monotone per World and each release records configuration/provenance with a content hash.

`Signal`, `WorkflowDefinition`, `WorkflowVersion`, `WorkflowInstance`, `Case`, `Task`, `WorkEvent`, `IdempotencyRecord`, `IntegrationOperation` and `OutboxMessage` are **not** part of the Orgo_Worlds data model. They are owned by the main `Orgo` repository.

If a future storage backend replaces the JSON store, that is a control-plane persistence change only; it must not reintroduce the Orgo operational schema here.
