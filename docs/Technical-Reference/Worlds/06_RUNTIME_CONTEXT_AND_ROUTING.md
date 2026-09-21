# Runtime context and routing

The standalone API exposes World control/routing operations only. With the current bootstrap (`app.setGlobalPrefix("api")`), the canonical local endpoints include:

```text
GET  /api/control/worlds
POST /api/control/worlds
GET  /api/control/worlds/{world_key}
GET  /api/control/worlds/{world_key}/releases
POST /api/control/worlds/{world_key}/releases
POST /api/control/worlds/{world_key}/releases/{release_id}/promote
GET  /api/control/worlds/{world_key}/memberships
PUT  /api/control/worlds/{world_key}/memberships/{user_id}
POST /api/control/worlds/{world_key}/archive
GET  /api/runtime
```

The request context can carry organization, user, permission, World and release identifiers through the standalone header contract. It is control/routing context; it does not activate a local Signal/Case/Task engine.

Operational routes such as `/tasks`, `/cases`, `/signals` and `/workflows`, plus the Interaction Kernel endpoint, belong to the main `Orgo` product.
