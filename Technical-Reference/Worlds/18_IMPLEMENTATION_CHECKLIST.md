# Implementation checklist — Phases 1..5

- [x] Repo standalone et ports dédiés
- [x] Modèles Prisma World/Release/Membership/Audit
- [x] Migration et backfill `main/r1`
- [x] Control plane NestJS
- [x] Runtime resolver et contexte enrichi
- [x] Route `/api/v3/w/{world}/...`
- [x] Task/Case/Signal world-scoped
- [x] Workflow/Idempotency/WorkEvent/Outbox world-scoped
- [x] Worker release pinning
- [x] World switcher web
- [x] World Manager web
- [x] World Manager desktop HTTP-only
- [x] Test d'intégration A→B→A + release promotion
- [x] Documentation `ORGO-WORLDS-1`
- [ ] Validation native sur la machine cible (npm install, Prisma, PostgreSQL 16, build)
