# Tandem Éducation P5 — Témoin de portée Worlds signé (interne, expérimental)

## Responsabilité
Le module `scripts/tandem-education/p5-signed-world-witness.mjs` transforme **uniquement** une lecture de `WorldsService.readTandemEducationScopeInternal` passée par le validateur P3 en preuve Ed25519 à vie courte (10 secondes). Ce témoin ne donne **aucun** droit d'enseigner, d'exécuter, de créer un Case, ou de publier à un enfant. Il n'expose aucune route HTTP.

Le demandeur doit être issu d'une session Orgo authentifiée côté serveur. L'appelant de production doit authentifier mutuellement le service et protéger la clé privée hors du dépôt. Ne jamais alimenter `actor`, `signingKey`, le `WorldsService` ou l'identité à signer à partir de JSON Akor, d'en-têtes `x-user`, ou de paramètres HTTP arbitraires. La clé de test est générée éphémèrement en mémoire et n'est pas livrée dans l'archive.

La preuve lie `actorUserId`, `organizationId`, `worldId`, `releaseId`, `intentSha256`, la release courante et le membership actif au défi frais fourni par Orgo. L'attestation ne vaut que pendant une fenêtre temporelle courte; les changements de membership/release intervenant après la lecture demandent une nouvelle vérification transactionnelle avant toute admission. Aucune validation Konnaxion WorldRelease ne découle du registre local Worlds.

## Sécurité et limites
Aucune clé privée persistante, aucun port réseau, aucun stockage ni registre des approbations n'est fourni. La preuve ne vaut pas autorisation des participants. Pas de mécanisme de révocation distribué ni d'attestation de fraîcheur transactionnelle. Le service réel n'est pas démarré; la compilation Nest/TypeScript et le branchement mTLS ou équivalent restent à qualifier.
