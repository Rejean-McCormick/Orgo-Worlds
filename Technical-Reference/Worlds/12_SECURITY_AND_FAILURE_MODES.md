# Security and failure modes

- Un World inconnu retourne 404; un World privé non autorisé retourne 403.
- Une membership `viewer` est lecture seule sur `/api/v3/w/{key}/...`.
- Un World archivé n'est pas utilisable comme runtime.
- `main` ne peut pas être archivé.
- Les tokens OIDC/service restent séparés.
- Les clés d'idempotence incluent le World afin que la même clé puisse être utilisée indépendamment dans deux Worlds.
- Les références externes Signal sont uniques par organisation + World + source.
- Le worker lit `world_id` et `world_release_id` depuis l'Outbox; une promotion concurrente ne change donc pas son contexte.
- Les opérations de release utilisent un advisory lock par World pour sérialiser numérotation et promotion.
- Les API tokens sans acteur utilisateur ne voient pas les Worlds privés sauf permission globale `*`.
