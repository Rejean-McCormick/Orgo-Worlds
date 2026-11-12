# World scolaire : frontière Orgo_Worlds — 2026-11-11

Un scénario thématique Kontexte peut être représenté par un **World dédié à l'aventure** avec release épinglée, membres et classe isolée. Les **stations ne sont pas de nouveaux Worlds** et les Cases/Tasks restent sous l'autorité d'Orgo. Le World n'est jamais déduit d'un simple `scenario_ref` dans un aperçu synthétique.

Le contrat `scripts/tandem-education/scope-review.mjs` est un contrôle **hors ligne** du scope d'une intention Akor; il ne vérifie pas une autorisation d'élève. Les émetteurs P5 et P6-P12 restent non reliés à un serveur mTLS qualifié, à une politique scolaire persistée et à un consentement enseignant réel. Ne pas confondre la réussite des tests de fixtures avec le démarrage d'un World.

Le contrôle de conformité Ékole passe ici 7 intentions de prévisualisation sûres, mais `runtime_admitted`, `dispatch_allowed` et `may_publish_to_child` restent toujours `false`. Aucun identifiant Konnaxion_Worlds ni permission n'est partagé implicitement.
