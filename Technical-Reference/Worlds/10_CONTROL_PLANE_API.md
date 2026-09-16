# Control plane API

```text
GET    /api/v3/control/worlds
POST   /api/v3/control/worlds
GET    /api/v3/control/worlds/{key}
GET    /api/v3/control/worlds/{key}/releases
POST   /api/v3/control/worlds/{key}/releases
POST   /api/v3/control/worlds/{key}/releases/{id}/promote
GET    /api/v3/control/worlds/{key}/memberships
PUT    /api/v3/control/worlds/{key}/memberships/{userId}
POST   /api/v3/control/worlds/{key}/archive
```

Toutes les mutations sont authentifiées, validées par Zod, idempotentes au niveau HTTP/Commands lorsque pertinent, et les événements de control plane sont écrits dans `world_audit_events`.
