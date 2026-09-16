# Operations runbook

- Health API : `/health/live`, `/health/ready`, `/health/dependencies` sur 4100.
- Runtime courant : `GET /api/v3/w/{key}/runtime`.
- Catalogue : `GET /api/v3/control/worlds`.
- En incident de release, promouvoir une release `ready` connue; ne réécrire aucune ligne historique.
- Ne jamais changer `world_id` d'une Task/Case/Signal en SQL pour « déplacer » du travail.
- Archiver plutôt que supprimer un World qui a déjà des données.
- Sauvegarder la base `orgo_worlds` comme une unité; les Worlds partagent le même cluster logique.
