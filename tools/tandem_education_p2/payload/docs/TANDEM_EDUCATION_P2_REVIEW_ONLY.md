# Orgo_Worlds P2 — contrôle de portée synthétique (hors ligne)

La commande `node scripts/tandem-education/scope-review.mjs <intent.json> <world-fixture.json>` vérifie l'égalité du tenant, du World et de la release entre une intention Akor et une **fixture synthétique** de classe, ainsi que les états `active/current`.

**Aucune connexion à la base Worlds ni à un service d'identité**, aucun contrôle réel de membership, aucune signature. `scope_consistent=true` signifie uniquement une cohérence de la fixture, jamais une autorisation de lancement. Tous les indicateurs de permission/admission restent `false`.

Orgo_Worlds standalone continue de refuser l'exposition publique de ses headers d'identité. Il n'y a aucun nouveau endpoint. La vraie vérification doit être effectuée par Orgo à partir d'une identité authentifiée et des données autoritaires du World, hors de ce P2.
