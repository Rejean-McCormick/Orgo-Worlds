# Orgo Worlds — Canonical Specification

**Architecture lock : `ORGO-WORLDS-1`.**

Orgo Worlds est un produit standalone dérivé du moteur Orgo. Un déploiement héberge une ou plusieurs organisations; chaque organisation héberge un ou plusieurs Worlds. Un World est la frontière opérationnelle de navigation et d'isolation. Une WorldRelease est une génération immuable de configuration/provenance, pas une copie complète des données opérationnelles.

## Invariants

1. `organization_id` reste la frontière de sécurité principale.
2. Toute donnée opérationnelle canonique appartient à exactement un `world_id`.
3. Toute création opérationnelle est épinglée à exactement un `world_release_id`.
4. Une promotion de release ne réécrit jamais les lignes historiques.
5. Le worker reprend le World et la release du message Outbox; il ne résout jamais « la release courante » au moment du traitement.
6. Le chemin canonique runtime est `/api/v3/w/{world_key}/...`.
7. `GET /api/v3/...` sans World explicite reste compatible et résout le World par défaut `main`.
8. Ouvrir/changer de World n'effectue aucune mutation administrative.
9. Promouvoir une release est une mutation explicite et auditée.
10. Les comptes, SSO, rôles d'organisation et personnes réelles ne sont pas dupliqués par World.
11. Un World privé exige une `WorldMembership` active, sauf permission globale `*`.
12. `main` ne peut pas être archivé.
13. Une seule release peut être `current` par World; un seul World peut être `is_default=true` par organisation (indexes partiels SQL).
14. Orgo Worlds n'utilise jamais la base PostgreSQL du dépôt Orgo voisin.
