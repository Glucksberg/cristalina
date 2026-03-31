# Cristalina Roadmap

## Status

Cristalina is currently in the **architecture v2 convergence** phase.

The repository is no longer only a protocol draft. It already contains working surface area in:

- `packages/types`
- `packages/validate`
- `packages/core`

The immediate goal is to make the repository internally consistent before adding more feature surface.

That means aligning:

- protocol idea
- data model
- sample store
- validation rules
- core lifecycle operations
- adapter contracts

The binding architectural direction for this work is defined in `docs/ARCHITECTURE-V2.md`.

---

## Current Repository Baseline

### Already present

- draft protocol documents
- starter schemas
- store reader and linter
- core operation surface
- compiler and bootstrap generator prototypes
- sample store and fixtures

### Not yet converged

- canonical representation is still mixed between typed objects and document-shaped files
- proposal payloads are not structured enough for deterministic apply
- ratification semantics are richer in the docs than in the executable model
- privacy and audience are still modeled too narrowly
- OpenClaw writeback policy is specified conceptually but not yet contract-complete

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
- current phase

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

### Goals
- align `packages/core` with the frozen model and policy contracts
- make compilation deterministic from canonical data plus policy
- harden auditability and rollback around the real lifecycle

### Deliverables
- v2-aligned operation planner
- v2-aligned canonical store writer
- compiler scoring and selection tied to policy and stable references
- richer projection metadata
- improved rollback expectations

### Exit criteria
- compiled context is reproducible from canonical objects, policy, and allowed recent signals
- projection metadata explains derivation and audience

---

## Phase 5 - OpenClaw Adapter Hardening

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
