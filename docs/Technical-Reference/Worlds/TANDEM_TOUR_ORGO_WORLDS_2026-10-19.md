# Tournée Tandem 1.0 — Orgo_Worlds, dépôt 6/8

## Mission
Vérifier l'isolation organization/World et la cohérence release, sans confondre
ce dépôt standalone avec le moteur opérationnel Orgo.

## Constats vérifiés dans le snapshot du 18 octobre 2026
1. `contextFromHeaders()` acceptait directement organisation, utilisateur et
   permissions HTTP, avec `*` par défaut. CORS était ouvert et le lanceur
   graphique original demandait `0.0.0.0`.
2. `promote()` et `setMembership()` ne refusaient pas les Worlds archivés.
3. `runtime()` pouvait présenter une release appartenant à un autre World
   lorsque l'état JSON est incohérent, ou activer un World archivé.

## Correctifs livrés
- Admission **développement local uniquement** (loopback, mode, peer et Origin).
  Un VPS public est **refusé**, non « autorisé sous réserve ».
- Lanceur Windows restreint à 127.0.0.1 par défaut.
- Archive immuable pour promotions/memberships/runtime.
- Lien `world_id` et statut `current` exigés au runtime.
- Tests Node sans dépendance réseau, CI et tests TypeScript natifs optionnels.

## Réserves non levées
- Pas d'authentification OIDC/JWKS sur le standalone, pas de trusted proxy.
- Pas d'audit immuable ni d'atomicité du store JSON, pas de base PostgreSQL.
- Pas de tests d'intégration Orgo/Orgo_Worlds réels.
- Ni déploiement, ni migration, ni seed, ni mutation de FakePlant.

## Commandes
- `node scripts/check-worlds.mjs`
- `node --experimental-strip-types --test scripts/tests/tandem-worlds-security.test.mjs`
- `npm run test:tandem-runtime` (nécessite les dépendances)
- `node tools/fakeplant/validate.mjs` (lecture seule)

**Statut:** Correctif local; qualification runtime & intégration VPS en attente.
