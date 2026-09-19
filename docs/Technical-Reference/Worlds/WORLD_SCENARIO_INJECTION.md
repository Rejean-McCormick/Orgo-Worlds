# Orgo_Worlds → Orgo Scenario Injection

`Orgo_Worlds` conserve et versionne les Worlds et leurs checkpoints. `Orgo` reste le moteur de travail cible. La seule frontière d'écriture est `Orgo/tools/scenario-injector`.

```text
canon / fixtures
      ↓
Orgo_Worlds world pack
      ↓
orgo.scenario.v1
      ↓ validate / plan
Orgo Scenario Injector
      ↓ apply
Orgo API v3
```

## Invariants

- aucun SQL cross-repo;
- aucune base partagée;
- aucun appel métier direct d'Orgo_Worlds vers Orgo;
- aucun UUID runtime dans un scénario source;
- idempotency keys et external references stables;
- toutes les fixtures sont marquées synthétiques;
- `Smart Vote favorable` ne peut pas créer le Case A014;
- seul le checkpoint `T0-post`, après publication de `UCKK-D009`, peut déclencher le Signal d'autorité.

## World pack livré

`world-packs/uckk-a014/` contient le canon v2 et huit checkpoints :

```text
T-14 → T-7 → T0-pre → T0-post → J3 → J30 → J90 → R1
```

Les trois premiers checkpoints sont des assertions d'absence de Case. `T0-post` publie/simule le workflow puis injecte la décision publiée. Les checkpoints suivants injectent uniquement les observations synthétiques prévues par le canon.

## Commandes

Depuis `C:\mycode\Orgo\Orgo_Worlds` :

```powershell
.\tools\world-scenario\world-scenario.ps1 list
.\tools\world-scenario\world-scenario.ps1 validate-all uckk-a014
.\tools\world-scenario\world-scenario.ps1 plan uckk-a014 T0-post
```

Pour ouvrir le scénario dans l'UI officielle d'Orgo Scenario Injector :

```powershell
.\tools\world-scenario\world-scenario.ps1 open uckk-a014 T0-post
```

L'UI Orgo demande/emploie les credentials Orgo; Orgo_Worlds ne les stocke pas.

Injection CLI explicite, uniquement si désirée :

```powershell
$env:ORGO_SCENARIO_API_URL      = 'http://127.0.0.1:4000/api/v3'
$env:ORGO_SCENARIO_ORGANIZATION = 'uckk-demo'
$env:ORGO_SCENARIO_EMAIL         = '<email>'
$env:ORGO_SCENARIO_PASSWORD      = '<mot-de-passe>'

.\tools\world-scenario\world-scenario.ps1 inject uckk-a014 T0-post --apply
```

Un token peut remplacer email/password via `ORGO_SCENARIO_TOKEN`.

## Rapports

Par défaut, les rapports runtime sont écrits sous :

```text
Orgo_Worlds/runtime/world-injections/<world>/<checkpoint>.import-report.json
```

Ils contiennent les UUID résolus/créés. Ces UUID ne sont jamais recopiés dans les fichiers source du World.
