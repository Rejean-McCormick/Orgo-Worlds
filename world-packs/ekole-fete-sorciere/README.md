# World pack Ékole — La Fête de la sorcière

**Statut : revue synthétique, pas World scolaire activé.**

- Les 11 étapes proviennent de `Kontexte/data/missions/fete-sorciere.json`.
- `REVUE` crée, sur injection manuelle, **11 Tasks de revue** et une Case synthétique, par la frontière officielle `Orgo/tools/scenario-injector`.
- Aucun enfant n’est affecté, aucun accès enseignant n’est prouvé, aucune dépendance d’exécution n’est activée et **aucun indice privé n’est inclus**.
- Le `world-pack.json` est un pack de scénario pour Orgo_Worlds, pas une preuve de création d’un World actif dans le service Orgo_Worlds.
- L’injection réelle de Tasks de revue reste **optionnelle** et nécessite un opérateur Orgo, ses permissions et l’usage explicite de `inject ... --apply`. Ne pas lancer dans un tenant scolaire.

Depuis `C:\mycode\Orgo\Orgo_Worlds` :

```powershell
.\tools\world-scenario\world-scenario.ps1 validate-all ekole-fete-sorciere
.\tools\world-scenario\world-scenario.ps1 plan ekole-fete-sorciere REVUE
```

Le moteur d’admission scolaire, l’association de séance aux identités, les assignations élèves, les stations / libérations conditionnelles et Kidaxion restent à développer puis à qualifier en environnement autorisé. Ne pas confondre un plan ou l’injection de Tasks de revue avec cette capacité.
