<!-- kOA Doc Server · Docs IA · lot 03 · projet : Orgo_Worlds · proposition dérivée à valider -->
# Navigation IA — Orgo_Worlds

**Objet constaté :** Packs de mondes et simulations pour Orgo, dont FakePlant et scénarios éducatifs.

**Frontière de responsabilité :** Les packs sont des données/scénarios; Orgo détient les effets opérationnels et la séparation avec les Kristals de référence.

**Source :** `SmartDump_20261120_221507.zip` → `Orgo_Worlds_Code_snapshot.zip` (20 novembre 2026). Le chemin Windows est une déclaration de snapshot, pas une vérification de l'état actuel.

**Statut :** Documentation de navigation dérivée de sources propriétaires, à revoir. Ce document ne vaut ni profil d'ingénierie mesuré, ni certification, ni permission d'exécution.

## Ordre de lecture — fichiers réellement présents dans la capture

1. [`docs/TANDEM_EDU_P6_P12_BRIDGE_CONTRACT.md`](../../docs/TANDEM_EDU_P6_P12_BRIDGE_CONTRACT.md) — SHA-256 `54b653fab02175d5…` dans la capture.
2. [`docs/Technical-Reference/Worlds/03_ARCHITECTURE.md`](../../docs/Technical-Reference/Worlds/03_ARCHITECTURE.md) — SHA-256 `a429ea2153195ec1…` dans la capture.
3. [`fakeplant/README.md`](../../fakeplant/README.md) — SHA-256 `347243109f6f5454…` dans la capture.
4. [`package.json`](../../package.json) — SHA-256 `acfcd74d63d6d6f4…` dans la capture.

## Parcours recommandé pour une intervention assistée par IA

1. Identifier la question, le sous-système concerné et les responsabilités du propriétaire.
2. Lire les documents ci-dessus **dans cet ordre**; consulter les contrats et consignes propriétaires plus récents si le checkout a évolué.
3. Choisir un monde et son manifest, vérifier droits et données synthétiques, qualifier les tests d’isolement avant de proposer une projection.
4. Établir les vérifications effectivement disponibles dans la révision locale, consigner les résultats et ne conclure qu'à l'intérieur du périmètre couvert.
5. Proposer les changements; demander une décision explicite avant toute écriture à effet, déploiement, publication ou promotion de preuves.

## Risque propre à ce dépôt

Ne pas copier une fixture FakePlant comme base réelle ni confondre identité de démonstration avec connexion ou IdP partagé.

## Compléments

- [`AI_CONTEXT.md`](AI_CONTEXT.md) : règles de travail et frontières de confiance.
- `AGENTS.md` : s'il existe déjà chez le propriétaire, ses consignes priment sur ces propositions; sinon l'overlay peut en ajouter un sans remplacement.
- `PROFIL_INGENIERIE.md` : optionnel, uniquement après exécution réelle de RepoSurveyor sur un dépôt local et accord explicite pour sa copie.
- Le Framework Kristal v11 est un standard documentaire **facultatif** : lire le profil réellement verrouillé, sans imposer de migration.
