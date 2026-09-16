# Baseline

Le dépôt est un fork standalone du moteur Orgo : NestJS API, Next.js Web, Prisma/PostgreSQL, worker Outbox et Common Login local/OIDC. Les ports sont déplacés vers 3100/4100/5434 et le compose utilise `orgo_worlds`/`orgo_worlds_data`.

Le sous-système Worlds est intégré dans ce dépôt uniquement. Aucun import de code runtime ou accès DB vers `../Orgo` n'est requis.
