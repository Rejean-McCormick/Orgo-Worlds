# Migration plan

Pour une base Orgo existante importée dans Orgo Worlds, la migration Phase 5 :

1. crée les tables du control plane;
2. crée un World `main` déterministe pour chaque organisation;
3. crée `r1` current;
4. crée des memberships sur `main` pour les utilisateurs existants;
5. backfill Signal/Case/Task/Workflow/Idempotency/WorkEvent/Outbox vers `main/r1`;
6. rend non-null les colonnes runtime critiques;
7. remplace les contraintes d'unicité qui doivent désormais inclure `world_id`;
8. ajoute les FKs/indexes.

Le dépôt Orgo voisin n'est jamais migré automatiquement : la migration ne touche que `DATABASE_URL` du processus Orgo Worlds.
