# FakePlant — Orgo_Worlds

18 checkpoints `FP-S01` à `FP-S18`, chacun produisant **un Case et une Task fictifs**, sans commande ERP et sans intervention externe. Les 900 employés, affiliations et ressources organisationnelles ne sont **pas** créés par l'injecteur de scénarios.

Test sans mutation :

```powershell
node tools/world-scenario/cli.mjs list
node tools/world-scenario/cli.mjs validate-all fakeplant --orgo-root ../Orgo
node tools/world-scenario/cli.mjs plan fakeplant FP-S02 --orgo-root ../Orgo
```

Écriture explicite uniquement (API Orgo active, organisation et token valides) :

```powershell
node tools/world-scenario/cli.mjs inject fakeplant FP-S02 --apply --orgo-root ../Orgo
```

L'accès aux frais, aux identités, aux données RH, aux devis et aux Kristals de connaissance exige des intégrations additionnelles. Aucun de ces 18 scénarios n'est une preuve d'achat effectif.
