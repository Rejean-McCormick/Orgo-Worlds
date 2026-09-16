# Infrastructure scoping

Orgo Worlds est autonome : base `orgo_worlds`, volume `orgo_worlds_data`, API 4100, Web 3100, PostgreSQL hôte 5434. API et worker partagent la base **de ce déploiement** uniquement.

La séparation avec Orgo est physique au niveau du déploiement. La séparation entre Worlds du même Orgo Worlds est logique et renforcée dans les requêtes et indexes.
