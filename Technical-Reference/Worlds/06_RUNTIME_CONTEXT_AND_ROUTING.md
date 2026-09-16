# Runtime context and routing

Le contexte d'exécution enrichi porte : `worldId`, `worldKey`, `worldTitle`, `worldReleaseId`, `worldReleaseNumber`, `worldRole`, `worldStatus`.

Routes :

```text
/api/v3/w/main/tasks
/api/v3/w/atelier-nord/cases
/api/v3/w/atelier-nord/signals
/api/v3/w/atelier-nord/workflows
/api/v3/w/atelier-nord/runtime
```

Le contexte est résolu après authentification et avant le controller. Les services utilisent `worldScope(ctx)`; une absence de World/release produit `WORLD_CONTEXT_REQUIRED` plutôt qu'un fallback silencieux dans les écritures.
