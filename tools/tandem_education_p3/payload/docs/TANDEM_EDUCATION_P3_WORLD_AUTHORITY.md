# Tandem Éducation P3 — vérification des prérequis World

`scripts/tandem-education/authority-prerequisites.mjs` introduit **un contrat interne**, pas une route API.

- Entrée : une demande Akor non fiable (format strict) ET un contexte d'identité qui devra provenir d'une authentification Orgo réelle (non raccordée ici).
- Le troisième argument `reader` est une fonction *fournie par le serveur*, chargée de consulter son état courant. Elle ne doit JAMAIS utiliser `contextFromHeaders` ni accepter une liste de permissions fournie par le client.
- Conditions vérifiées dans les tests : même tenant, World actif, release courante associée au World, membre actif correspondant à l'identité fournie par Orgo.
- La propriété d'un World ou la qualité de membre ne prouve **pas** la qualité d'enseignant. Le retour est `SCOPE_CHECKED_NOT_AUTHORIZED` et toutes les permissions d'exécution restent `false`.
- Les tests utilisent un lecteur en mémoire : cela ne prouve ni l'authentification du service, ni la fraîcheur d'une vraie base Orgo_Worlds.
- Le service autonome Orgo_Worlds continue de refuser les identités d'en-têtes en production. Aucune API publique ni raccordement de confiance n'est ouvert par P3.

Étapes ultérieures : intégrer une identité serveur attestée, une consultation authentifiée du World, une autorité des enseignants et une transaction d'admission dans Orgo. **Aucun GO-LIVE**.
