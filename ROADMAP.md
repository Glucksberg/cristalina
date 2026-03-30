# Cristalina Roadmap

## Status

Cristalina is currently in the **protocol hardening** phase.

The immediate goal is to turn the draft spec into a stable, portable memory protocol with a strong OpenClaw reference adapter.

---

## Phase 0 — Foundation Hardening

### Goals
- lock the protocol vocabulary
- stabilize the authority model
- finalize the core directory layout
- establish mandatory privacy scopes
- formalize human curation mechanics

### Deliverables
- `docs/SPEC.md` refined to v1 review quality
- `docs/DATA-MODEL.md` aligned with examples and schemas
- `docs/CURATION-PROTOCOL.md` hardened for implementation
- OpenClaw adapter boundaries clarified

---

## Phase 1 — Validation and Tooling

### Goals
- make the protocol machine-checkable
- reduce ambiguity in store integrity
- prevent illegal write patterns

### Deliverables
- stricter JSON schemas
- manifest validator
- store linter
- privacy-scope validation rules
- contradiction integrity checks
- rollback and snapshot expectations

---

## Phase 2 — Cristalina Core

### Goals
- implement the canonical write path
- separate raw events, proposals, ratified memory, and compiled context
- support deterministic compilation

### Deliverables
- `cristalina-core` reference implementation
- canonical store writer
- proposal promotion workflow
- compiled context generator
- bootstrap projection generator
- audit log generation

---

## Phase 3 — Cristalina OpenClaw

### Goals
- make Cristalina usable from OpenClaw without exposing the core to unrestricted runtime writes
- generate runtime-friendly projections safely

### Deliverables
- `cristalina-openclaw` adapter
- projection rules for `SOUL.md`, `VALUE.md`, `USER.md`, `MEMORY.md`
- audience-aware output profiles
- safe sync workflow between store and workspace

---

## Phase 4 — Evaluation

### Goals
- measure whether the protocol improves real agent memory behavior
- distinguish subjective usefulness from actual memory quality

### Deliverables
- recall quality benchmarks
- curation acceptance metrics
- contradiction resolution metrics
- context efficiency measurements
- regression fixtures

---

## Phase 5 — Broader Adapter Surface

### Goals
- define portable adapter contracts beyond OpenClaw
- keep the protocol independent from any single runtime

### Candidate targets
- MCP-compatible tools
- local CLI agents
- Python runtimes
- TypeScript runtimes

---

## Deferred / Future

These are explicitly **not required** for Cristalina v1:

- graph database integration
- vector database integration
- multi-agent synchronization
- hosted service layer
- semantic embedding pipeline as a hard dependency

They may be added later as optional extensions.
