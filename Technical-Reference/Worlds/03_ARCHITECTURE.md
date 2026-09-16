# Architecture

```text
Browser / Orgo World Manager
        │
        ├── /api/v3/control/worlds/...       control plane
        │
        └── /api/v3/w/{key}/...              runtime plane
                         │
                    AuthGuard
                         │
                 Identity + World resolve
                         │
       organization_id + world_id + release_id
                         │
               Services Orgo / Outbox
                         │
             PostgreSQL orgo_worlds
```

L'API réécrit très tôt `/api/v3/w/{key}/x` vers `/api/v3/x` et place la clé dans `X-Orgo-World`. L'AuthGuard authentifie l'acteur puis résout le World avant d'appeler les controllers existants. Cette stratégie évite de dupliquer toutes les routes métier.

Contrairement au modèle Konnaxion Worlds, aucune `search_path` PostgreSQL dynamique n'est utilisée. Prisma conserve les schémas statiques `public`/`insights`; l'isolation est portée par les clés World dans les lignes opérationnelles.
