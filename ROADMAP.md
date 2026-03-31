# Cristalina Roadmap

## Status

Cristalina is currently in the **v3 implementation hardening** phase.

The repository is no longer only a protocol draft. It already contains working implementation surface in:

- `packages/types`
- `packages/validate`
- `packages/core`

The immediate goal is no longer to define the shape of the system in the abstract.

The immediate goal is to finish converging the current implementation into a coherent end-to-end v3:

- event -> proposal -> ratification -> canonical apply
- authority -> audience -> projection policy
- canonical core -> compiler -> adapter writeback
- docs -> schemas -> fixtures -> executable behavior

`docs/ARCHITECTURE-V2.md` remains the convergence base, but the repository is now beyond pure v2 clarification work and into executable v3 hardening.

---

## Current Repository Baseline

### Already present

- draft protocol documents
- generated schemas
- store reader and linter
- structured proposal workflow
- ratification normalization and operation planning
- proposal type policy
- provenance-aware promotion policy
- audience-aware visibility model
- actor and channel authority policy
- stable entity and reference support
- compiler and bootstrap generation
- writeback contract and projection manifest support
- channel-profiled projection compilation
- sample store and fixtures

### Still not fully converged

- docs still lag behind what the code already hardened in v3
- sample store parity is not yet strong enough
- policy is still distributed across executable code rather than modeled as first-class policy objects
- adapter drift extraction is only contract-shaped, not yet fully realized as a governed ingest loop
- the full system still needs a deliberate whole-architecture review before broader surface expansion

---

## Phase 0 - Foundation Drafts

### Status
- substantially present

### What this phase established
- protocol vocabulary
- authority thesis
- domain separation
- human curation framing
- OpenClaw boundary definition

### Remaining cleanup from this phase
- merge repository architecture decisions back into the draft spec and data model
- remove ambiguity between canonical files and derived files

---

## Phase 1 - Canonical Model Freeze

### Status
- substantially complete in code, still needs repo-wide parity cleanup

### Goals
- freeze what counts as canonical memory
- make core representation unambiguous
- introduce a first-class distinction between memory objects and policy objects
- stop mixing free-form core documents with governed canonical objects

### Deliverables
- `docs/ARCHITECTURE-V2.md` as the active convergence contract
- canonical container rules for `core/`
- updated sample store shape
- schemas and validator rules aligned with the same canonical representation

### Exit criteria
- every canonical file under `core/` has a declared structural contract
- the example store follows that contract
- validation no longer relies on skipping ambiguous files

---

## Phase 2 - Proposal and Ratification Redesign

### Status
- substantially complete in code

### Goals
- make proposals executable as structured intent
- make ratification faithfully translatable into deterministic operations
- stop collapsing semantic edits into string replacement

### Deliverables
- structured proposal payload model
- stable `target_ref` design
- ratification normalization step before apply
- audited operation plan generated from owner responses

### Exit criteria
- `accept` can create, confirm, supersede, or resolve according to proposal type
- `edit` can yield multiple canonical objects when required by meaning
- proposal reasoning is explanatory but not the only executable input

---

## Phase 3 - Policy and Audience Engine

### Status
- active and materially implemented, but not yet factored into first-class policy objects

### Goals
- replace path heuristics with policy-backed authority checks
- replace privacy ladder assumptions with audience-aware visibility policy
- make "sensitive" and "shareable" resolvable by rules instead of hardcoded guesses

### Deliverables
- policy object model
- audience profiles and capability rules
- policy-backed visibility evaluator
- policy-backed authorization evaluator

### Exit criteria
- `agent_operational` and `project_private` can be handled without pretending they are a total order
- authority checks can express contextual risk, not only file path restrictions

---

## Phase 4 - Core and Compiler Convergence

### Status
- active and materially implemented

### Goals
- align `packages/core` with the frozen model and policy contracts
- make compilation deterministic from canonical data plus policy
- harden auditability and rollback around the real lifecycle

### Deliverables
- v2-aligned operation planner
- v2-aligned canonical store writer
- compiler scoring and selection tied to policy and stable references
- richer projection metadata
- channel-specific projection namespaces and projection profiles
- improved rollback expectations

### Exit criteria
- compiled context is reproducible from canonical objects, policy, and allowed recent signals
- projection metadata explains derivation and audience

---

## Phase 5 - OpenClaw Adapter Hardening

### Status
- active, contract-complete enough to continue, not operationally complete yet

### Goals
- implement the OpenClaw adapter against the converged contracts
- preserve canonical and projection separation under real runtime drift
- make Mode B proposal extraction explicit and auditable

### Deliverables
- `cristalina-openclaw` adapter implementation
- workspace projection templates
- drift detection contract
- proposal extraction rules for generated file edits
- audience-aware runtime profiles

### Exit criteria
- generated files are clearly marked as derived
- runtime edits become drift evidence and proposals, not canonical writes
- projection profiles are audience-safe and token-budget-aware

---

## Phase 6 - Repository Parity and Evaluation

### Status
- not started as a focused pass

### Goals
- verify that docs, schemas, fixtures, validator, and core agree
- measure whether the protocol improves real memory behavior instead of only feeling useful

### Deliverables
- parity fixtures for valid and invalid stores
- regression coverage for proposal promotion and ratification semantics
- contradiction and supersession benchmarks
- context efficiency measurements
- curation acceptance and correction metrics

---

## Phase 7 - Broader Adapter Surface

### Status
- deferred until v3 coherence review and parity pass

### Goals
- define portable contracts beyond OpenClaw
- keep Cristalina runtime-agnostic after v2 convergence

### Candidate targets
- MCP-compatible tools
- local CLI agents
- Python runtimes
- TypeScript runtimes

---

## Deferred / Future

These are explicitly not required for Cristalina v2 convergence:

- graph database integration
- vector database integration
- hosted service layer
- semantic embedding pipeline as a hard dependency
- native multi-agent synchronization

They may be added later as optional extensions once the canonical protocol is stable.

---

## Pause Conditions Before Further Structural Hardening

Before starting another deep hardening pass, pause for a full-system review if any of the following are true:

- the next step introduces a new domain primitive instead of hardening an existing one
- the next step requires simultaneous changes across `packages/types`, `packages/core`, `packages/validate`, and docs or examples
- local inconsistencies are being fixed, but the end-to-end lifecycle is no longer being re-evaluated
- a new feature would expand surface area before repo parity is checked

When one of these conditions is met, the repository should stop local hardening and review the full pipeline again:

```text
event -> proposal -> ratification -> canonical apply -> projection -> drift -> re-ingest
```

The purpose of that pause is not to slow development down.

It is to prevent Cristalina from becoming a stack of good local decisions that no longer compose cleanly as a governed memory system.

---

## Recommended Next Checkpoint

Cristalina has now reached the point where a broad review is justified before too many more structural additions land.

That checkpoint should answer:

- does the v3 codepath already express the protocol thesis end to end?
- which remaining gaps are still architectural?
- which remaining gaps are now mostly documentation, parity, and fixture work?
- what should be frozen before adding broader adapter surface?
