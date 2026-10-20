# P4 — Source interne World, sans accès par en-têtes HTTP

Le P4 ajoute `WorldsService.readTandemEducationScopeInternal()` : lecture **sans écriture** de l'état courant des Worlds, releases et memberships présents dans le store du **processus WorldsService**. Le lecteur est in-process, sans endpoint ni identité déclarée dans des en-têtes. Il exige les quatre coordonnées : organisation, acteur authentifié, World et release.

L'adaptateur `scripts/tandem-education/p4-internal-world-reader.mjs` exerce le contrôleur de cohérence P3 avec cette méthode, et renvoie uniquement un rapport `SCOPE_CHECKED_NOT_AUTHORIZED`. Un World archivé, une release non courante, un membre supprimé ou un mauvais tenant doivent être refusés. Un rôle viewer ne suffit pas au contrat P3 actuel.

**Limite importante** : `WorldsService` est un service autonome de développement fondé sur son état local (`ORGO_WORLDS_STATE_FILE`). Ce n'est **pas** un registre de permission reconnu pour une séance réelle ou un déploiement public. Le nouvel accès n'est pas câblé au serveur Orgo (ni à une identité Konfid/Konnaxion); il ne prouve pas l'autorité sur les utilisateurs réels et ne valide pas la `WorldRelease` Konnaxion. L'approbation enseignante et les identités des enfants restent totalement hors du périmètre.

Le code TypeScript est soumis à un contrôle statique et à des tests de l'interface d'adaptation en Node pur. La compilation Nest/TypeScript et les tests PostgreSQL restent à effectuer dans l'environnement de qualification doté de ses dépendances. **Aucune API nouvelle, tâche Orgo ni publication enfant.**
