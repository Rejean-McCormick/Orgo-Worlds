# Test and acceptance plan

Gate Phase 5 :

1. `prisma validate` + `prisma generate`.
2. typecheck API/Web.
3. unit tests existants.
4. migration sur PostgreSQL 16 isolé.
5. tests d'intégration natifs.
6. builds API/Web.
7. audit dépendances.
8. test Worlds A → B → A : une tâche créée en B n'est ni listable ni ouvrable depuis A.
9. release : créer r2, promouvoir, créer une tâche, vérifier `world_release_id=r2`.
10. worker : les messages Outbox conservent la release de création.
11. navigateur : login, switcher, changement A/B/A, World Manager.

Le test `runtime.test.ts` contient le gate A→B→A et le pinning de release. Un test qui ne possède pas de PostgreSQL isolé ne constitue pas l'acceptation finale.
