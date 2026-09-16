# Seeds and releases

Phases 1–5 livrent : World, release, promotion et backfill `main`. Une release contient actuellement `label`, `config`, `content_hash`, parent et statut. Sa configuration n'est jamais modifiée par une route d'update.

Les snapshots complets et seed packs de contenu sont volontairement hors Phases 1–5; ils appartiennent à la phase suivante. Cette limite n'affecte pas l'isolation runtime ni le pinning des workers.
