# AI lock / anti-drift

Toute modification automatisée doit préserver `ORGO-WORLDS-1` : standalone sibling, organisation comme tenant, World comme scope opérationnel, release pinning, navigation non mutante, promotion explicite, aucune DB partagée avec Orgo, aucun schema PostgreSQL dynamique par WorldRelease.

Une proposition qui modifie un de ces points exige un nouvel ADR et un changement explicite de l'architecture lock.
