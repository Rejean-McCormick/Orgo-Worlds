# Architecture

```text
Browser / Orgo World Manager
        │
        └── /api/control/worlds/...
                     │
               WorldsService
                     │
      World / Release / Membership
                     │
        runtime/orgo-worlds-state.json
```

`Orgo_Worlds` is now a standalone World control/routing package. It does not
import the Orgo operational runtime and does not own `Signal`, `WorkflowVersion`,
`Case`, `Task`, `IntegrationOperation`, Outbox or provider adapters.

Cross-system Interaction Kernel traffic terminates in the main `Orgo` product.
World identifiers may be carried as routing/provenance metadata, but the Worlds
repository must not recreate the operational engine.
