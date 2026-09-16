# Data ownership matrix

| Domaine | Portée | Raison |
|---|---|---|
| Organization, OrganizationProfile | organisation | configuration commune |
| UserAccount, SsoIdentity, LoginSession, ApiToken | organisation | identité commune au déploiement |
| Role, Permission, UserRoleAssignment | organisation | RBAC de base |
| PersonProfile | organisation | personne réelle réutilisable |
| World, WorldRelease, WorldMembership | control plane | registre Worlds |
| Signal, Case, Task | World + release | travail opérationnel |
| WorkflowDefinition | World | catalogue local au World |
| WorkflowVersion | release de création | provenance |
| WorkflowInstance | World + release | exécution épinglée |
| WorkEvent, IdempotencyRecord, OutboxMessage | World + release | audit technique / exact-once logique |
| Integration configuration | organisation | connecteurs partagés |
| IntegrationOperation | sujet contrôlé par WorkService | accès indirect via le sujet métier |
