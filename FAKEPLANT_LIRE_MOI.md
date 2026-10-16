# Déposer ce ZIP à la racine de `Orgo_Worlds`

Ajoute `world-packs/fakeplant` avec 18 scénarios opérationnels validables, sans modifier UCKK-A014. Les fixtures canonique du Kristal sont sous `fakeplant/fixture/`.

1. `FAKEPLANT_TEST.cmd` vérifie le pack sans écrire.
2. `node tools/world-scenario/cli.mjs list` doit afficher `fakeplant`.
3. Avec dépôt Orgo frère présent : `node tools/world-scenario/cli.mjs validate-all fakeplant --orgo-root ../Orgo`.

Aucune création d'instance Orgo Worlds en base par la simple extraction. Les scénarios s'injectent explicitement via le Scenario Injector de l'application Orgo.
