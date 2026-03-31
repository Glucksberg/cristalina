# Cristalina

**Cristalina** is a memory protocol for persistent AI agents.

It separates:
- raw events
- memory proposals
- ratified canonical memory
- compiled runtime context
- bootstrap projections for agent runtimes

Cristalina is **not a runtime**. It is a **portable, file-first, human-governed memory protocol** with reference adapters.

## Repository Goals

This repository provides:
- the official protocol spec
- the data model
- the active architecture convergence document
- the OpenClaw reference adapter
- the human curation protocol
- generated schemas for validation
- a sample `.cristalina/` store layout
- reference packages for types, validation, and core lifecycle work

## Repository Layout

```text
.
|-- README.md
|-- manifest.yaml
|-- docs/
|   |-- SPEC.md
|   |-- DATA-MODEL.md
|   |-- CURATION-PROTOCOL.md
|   |-- ARCHITECTURE-V2.md
|   `-- adapters/
|       `-- OPENCLAW-ADAPTER.md
|-- schemas/
|   |-- manifest.schema.json
|   |-- event.schema.json
|   |-- proposal.schema.json
|   `-- memory-object.schema.json
|-- packages/
|   |-- types/
|   |-- validate/
|   `-- core/
`-- examples/
    `-- sample-store/
        `-- .cristalina/
```

## Core Thesis

Models are good at:
- observing
- associating
- summarizing
- proposing

Models should **not** be the unrestricted authority over canonical memory.

Cristalina therefore enforces a governed write model:
- agents may write events and proposals
- the canonical core is updated through ratification
- compiled context is derived, not authoritative

## Start Here

Read in this order:
1. `docs/SPEC.md`
2. `docs/DATA-MODEL.md`
3. `docs/ARCHITECTURE-V2.md`
4. `docs/CURATION-PROTOCOL.md`
5. `docs/adapters/OPENCLAW-ADAPTER.md`

If older draft documents and the current repository implementation diverge, `docs/ARCHITECTURE-V2.md` is the active convergence layer for repository work.

## Current v3 Baseline

The repository already implements:
- append-only events
- structured proposals with stable references
- ratification normalization into canonical operations
- provenance-aware promotion policy
- audience and authority evaluation
- stable entity and relationship references
- HOT/WARM/COLD compiled context
- bootstrap projection
- channel-profiled runtime projection
- OpenClaw writeback contract metadata

## Near-Term Roadmap

- run full-system v3 review checkpoints before adding more primitives
- bring docs and example store into parity with the current codepath
- finish the drift -> proposal extraction loop for runtime-edited projections
- decide which remaining gaps are still architectural and which are now repo hygiene

## Governance Files

- `LICENSE`
- `NOTICE`
- `CONTRIBUTING.md`
- `ROADMAP.md`
- `CHANGELOG.md`
- `releases/v0.1.0.md`

## Repository Status

- Protocol version: `1.0-draft`
- Repository version: `0.3.0-dev`
- Maturity: active v3 hardening on top of architecture v2 convergence
