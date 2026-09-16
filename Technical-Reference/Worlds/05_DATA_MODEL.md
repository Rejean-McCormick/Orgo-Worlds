# Data model

Relations centrales :

```text
Organization 1 ── * World 1 ── * WorldRelease
                      │
                      ├── * WorldMembership * ── 1 UserAccount
                      ├── * Signal
                      ├── * Case
                      ├── * Task
                      └── * WorkflowDefinition
```

`World.current_release_id` désigne la génération active pour les nouvelles écritures. Les lignes existantes conservent leur `world_release_id`. Les releases ont un `content_hash`, un parent optionnel et un numéro monotone par World.

La migration crée des indexes partiels garantissant un seul World par défaut par organisation et une seule release `current` par World.
