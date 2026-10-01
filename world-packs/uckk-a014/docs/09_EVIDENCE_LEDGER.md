# Evidence ledger

Ce document relie les affirmations de la vertical slice aux sources fournies.

Il ne remplace pas les repos. Il indique **pourquoi une règle est considérée comme canonique, implémentée, cible ou proposée**.

---

## 1. Légende

```text
SOURCE_CANON
IMPLEMENTED_ORGO
DOCUMENTED_TARGET
NO_ACTIVE_ADAPTER
DEMO_CONTRACT_V1
SYNTHETIC_FIXTURE
GAP_TO_VERIFY
```

---

## 2. UCKK est une school / learning city

**Statut:** `SOURCE_CANON`

Source :

```text
UCKK-Moodle
01_domain_boundaries_and_glossary.md
Boundary model
```

Énoncé source :

```text
UCKK = School / learning city
UCKK-Moodle = Moodle campus implementation of UCKK
```

Conséquence :

```text
la démo peut traiter UCKK comme institution expérimentale,
pas comme université accréditée fictive.
```

---

## 3. UCKK-Moodle est autonome

**Statut:** `SOURCE_CANON`

Sources :

```text
00_master_execution_doctrine.md
01_domain_boundaries_and_glossary.md
06_pedagogy_courses_competencies_badges.md
```

Énoncé :

```text
KONNAXION_REQUIRED_FOR_CORE = false
SMART_VOTE_REQUIRED_FOR_CORE = false
KONNAXION_DEFAULT_STATE = disabled
```

Conséquence :

```text
la vertical slice ne doit pas transformer Konnaxion en dépendance du campus.
```

---

## 4. Smart Vote n'est pas la décision UCKK

**Statut:** `SOURCE_CANON`

Source :

```text
00_master_execution_doctrine.md
Canonical boundary
```

Invariant :

```text
Konnaxion computes Smart Vote readings.
UCKK-Moodle owns Assembly decisions.
Archives preserve both, with provenance and contestability.
```

Conséquence :

```text
Orgo handoff after Assembly decision,
not after Smart Vote.
```

---

## 5. External systems never write Moodle source tables

**Statut:** `SOURCE_CANON`

Source :

```text
00_master_execution_doctrine.md
DIRECT_WRITE_RULE
```

Valeur :

```text
external_systems_never_write_moodle_source_tables
```

Conséquence :

```text
les adapters appellent des services Moodle-owned.
```

---

## 6. Konnaxion source participation reste distincte de Smart Vote

**Statut:** `SOURCE_CANON`

Source :

```text
Konnaxion
wiki/Konsultations.md
```

Invariant :

```text
consultation ballot
≠ EthikosStance
≠ Smart Vote reading
≠ Orgo Task
```

Conséquence :

```text
baseline et Smart Vote doivent être visibles séparément.
```

---

## 7. Aucun adapter Orgo actif dans Konnaxion snapshot

**Statut:** `NO_ACTIVE_ADAPTER`

Source :

```text
Konnaxion
wiki/Konsultations.md
```

Énoncé :

```text
No active Orgo adapter is implemented in the current Konnaxion snapshot.
```

Source additionnelle :

```text
Konnaxion workflow docs
No concrete Orgo/Kristal v6/SemantiK Architect workflow is implemented
in the current Konnaxion snapshot.
```

Conséquence :

```text
provider-side Konnaxion bridge adapter
= build item de la vertical slice.
```

---

## 8. Orgo est multi-tenant et possède Work

**Statut:** `SOURCE_CANON` / `IMPLEMENTED_ORGO`

Sources :

```text
Orgo
wiki/What-is-Orgo.md
Docs/Technical-Reference/UI_AND_KOALI_INTEGRATION.md
```

Énoncés :

```text
Orgo is a multi-tenant workflow and coordination system.

Orgo owns:
Cases, Tasks, Signals and Workflows;
routing, escalation and operational actions;
tenant rules and business authorization.
```

---

## 9. Signal est first-class persisted

**Statut:** `IMPLEMENTED_ORGO`

Source :

```text
Orgo
TARGET_ARCHITECTURE / v3 architecture docs
```

Énoncé :

```text
The delivered runtime now adds persisted Signal.
```

Champs :

```text
organization_id
source
external_reference
idempotency_key
type/classification/severity
payload
status
timestamps
```

---

## 10. Signal avant orchestration

**Statut:** `SOURCE_CANON` / `IMPLEMENTED_ORGO`

Source :

```text
Orgo
v3 architecture / Signal contract
```

Invariant :

```text
normalize
→ deduplicate/idempotency check
→ persist Signal
→ workflow/orchestration evaluation
```

---

## 11. Un Signal n'est pas automatiquement une Task

**Statut:** `SOURCE_CANON`

Sources :

```text
Orgo wiki/Glossary.md
Orgo Signal contract
```

Énoncé :

```text
A Signal is not automatically a Task.
Several Signals may relate to one Case.
```

---

## 12. Workflow simulation sans mutation

**Statut:** `IMPLEMENTED_ORGO`

Sources :

```text
Orgo workflow docs
COMPLETION_DECISIONS.md
```

Invariant :

```text
same input + same rules
→ same resolved actions
→ no mutation in simulation mode
```

La documentation active précise aussi que simulation retourne des action intents sans invoquer les handlers.

---

## 13. Workflow actions utilisées

**Statut:** `IMPLEMENTED_ORGO`

Source :

```text
Orgo
COMPLETION_DECISIONS.md
Workflow authoring and action syntax
```

Supportées :

```text
CREATE_CASE
CREATE_TASK
UPDATE_TASK
ASSIGN_TASK
ROUTE
ESCALATE
SET_METADATA
ATTACH_TEMPLATE
ADD_LABEL
NOTIFY
REQUEST_INTEGRATION
```

Conséquence :

```text
la fixture A014 utilise ces actions;
elle ne crée pas un moteur parallèle.
```

---

## 14. External effects durable + receipt-driven

**Statut:** `SOURCE_CANON` / `IMPLEMENTED_ORGO`

Sources :

```text
Orgo TARGET_ARCHITECTURE
COMPLETION_DECISIONS.md
```

Invariant :

```text
external/long-running effects are durable,
idempotent and receipt-driven
```

Pattern :

```text
business mutation + OutboxMessage
→ commit
→ worker
→ adapter
→ receipt / retry / terminal failure
```

---

## 15. IntegrationOperation séparée de Work status

**Statut:** `SOURCE_CANON` / `IMPLEMENTED_ORGO`

Source :

```text
Orgo target architecture
```

Énoncé :

```text
IntegrationOperation tracks an external operation independently
from Work status.
```

Conséquence :

```text
Konnaxion publication success
≠ Case resolved
```

---

## 16. Bridge Orgo-owned

**Statut:** `IMPLEMENTED_ORGO` pour le protocole

Source :

```text
Orgo
Docs/Technical-Reference/INTEGRATION_BRIDGE.md
```

Énoncé :

```text
The adapters implement an Orgo-owned bridge protocol,
not assumed native provider endpoints.
A provider-side adapter must translate it
and enforce its own authorization.
```

---

## 17. Konnaxion operations

**Statut:** `IMPLEMENTED_ORGO`

Source :

```text
INTEGRATION_BRIDGE.md
```

Allowlist :

```text
Konnaxion
publish
distribute
```

Conséquence :

```text
la vertical slice choisit uniquement publish.
```

---

## 18. `accepted` ≠ `succeeded`

**Statut:** `IMPLEMENTED_ORGO`

Source :

```text
INTEGRATION_BRIDGE.md
COMPLETION_DECISIONS.md
```

Énoncé :

```text
accepted leaves the operation running
until authenticated final callback
```

Conséquence :

```text
la démo technique peut montrer l'asynchronisme réel.
```

---

## 19. Transport success ≠ business approval

**Statut:** `SOURCE_CANON` / `IMPLEMENTED_ORGO`

Sources :

```text
INTEGRATION_BRIDGE.md
COMPLETION_DECISIONS.md
```

Énoncé :

```text
A transport success alone is not an approval.
```

---

## 20. Orgo/Konnaxion objets non aliases

**Statut:** `SOURCE_CANON`

Sources :

```text
Orgo Konnaxion integration boundary
Konnaxion Konsultations boundary
```

Invariants :

```text
Orgo Case ≠ Konnaxion Topic
Orgo Task ≠ Konnaxion Consultation
```

---

## 21. Scénario pédagogique A014

**Statut:** `DEMO_CONTRACT_V1` + éléments tirés de la réforme source

Sources :

```text
Reforme universitaire...
documents fournis par l'utilisateur
```

Éléments utilisés :

```text
équipes hétérogènes
rôles tournants
sprints
journaux de contribution
évaluation 50/30/20
pilotage avant extension
```

À vérifier avant implémentation finale :

```text
la sémantique exacte des composantes 50/30/20
le vocabulaire final de la réforme
les éventuelles modifications depuis le ZIP fourni
```

---

## 22. Personas et chiffres

**Statut:** `SYNTHETIC_FIXTURE`

Aucune source externe.

```text
Maya
Elias
Nadia
Amélie
Karim
Jordan

58/29/13
6 signalements
2 clarifications
8 équipes
7 chartes
```

Ces données existent uniquement pour rendre la boucle démontrable.

---

## 23. Contrat UCKK→Orgo

**Statut:** `DEMO_CONTRACT_V1`

Raisonnement :

```text
UCKK possède la décision
Orgo accepte les Signals via API
Orgo exige organization/idempotency/correlation semantics
```

Le DTO exact est proposé dans `04_ARCHITECTURE_ET_CONTRATS.md`.

Avant revendication de production :

```text
GAP_TO_VERIFY:
exact UCKK event/hook
exact Orgo active request schema
exact auth token scopes
```

---

## 24. Impact update Konnaxion

**Statut:** `DEMO_CONTRACT_V1`

Konnaxion possède déjà des concepts d'impact/accountability dans la documentation, et Orgo possède `publish` au niveau bridge.

Ce pack propose le schéma :

```text
konnaxion.impact-update.demo.v1
```

Il n'est pas revendiqué comme schéma backend existant.

---

## 25. Sources externes conceptuelles

La recherche approfondie peut utiliser, comme analogies et validation de framing :

```text
living labs
pilot governance
deliberative democracy
institutional learning
double-loop learning
sociotechnical systems
evidence-to-decision loops
```

Ces références servent au **positionnement intellectuel**, pas à définir les contrats runtime.

Les contrats runtime sont gouvernés par les repos fournis.

---

## 26. Discipline de maintenance

Lorsqu'une capacité passe de :

```text
DEMO_CONTRACT_V1
```

à une implémentation réelle :

1. mettre à jour ce ledger;
2. pointer vers le fichier/code canonique;
3. retirer la formulation “proposée”;
4. ajouter un test;
5. mettre à jour `07_IMPLEMENTATION_PLAN.md`;
6. garder la frontière d'autorité inchangée sauf décision architecturale explicite.
