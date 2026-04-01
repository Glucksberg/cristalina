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
|   |-- CONSTITUTIONAL-CORE.md
|   `-- adapters/
|       `-- OPENCLAW-ADAPTER.md
|-- schemas/
|   |-- manifest.schema.json
|   |-- event.schema.json
|   |-- proposal.schema.json
|   |-- memory-object.schema.json
|   |-- entity.schema.json
|   `-- policy-object.schema.json
|-- packages/
|   |-- cli/
|   |-- types/
|   |-- validate/
|   |-- core/
|   `-- openclaw/
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
4. `docs/CONSTITUTIONAL-CORE.md`
5. `docs/CURATION-PROTOCOL.md`
6. `docs/adapters/OPENCLAW-ADAPTER.md`

If older draft documents and the current repository implementation diverge, `docs/ARCHITECTURE-V2.md` is the active convergence layer for repository work.

## Current v3 Baseline

The repository already implements:
- append-only events
- structured proposals with stable references
- ratification normalization into canonical operations
- multi-intent ratification planning
- structured edit decomposition for multi-intent ratification
- provenance-aware promotion policy
- first-class policy objects
- deterministic policy selection
- audience and authority evaluation
- stable entity and relationship references
- governed entity registry
- HOT/WARM/COLD compiled context
- bootstrap projection
- channel-profiled runtime projection
- OpenClaw writeback contract metadata
- governed drift -> proposal extraction for machine-parsable projection edits
- a minimal `cristalina-openclaw` bootstrap and ingest CLI over the v3 contracts

## Run OpenClaw Against v3

The minimal adapter package is `@cristalina/openclaw` with the `cristalina-openclaw` bin.

Typical loop:
1. `pnpm build`
2. `pnpm openclaw bootstrap --store examples/sample-store/.cristalina --workspace <your-openclaw-workspace>`
3. point OpenClaw at `SOUL.md`, `VALUE.md`, `USER.md`, and `MEMORY.md` in that workspace
4. after runtime edits, run `pnpm openclaw ingest --store examples/sample-store/.cristalina --workspace <your-openclaw-workspace>`

This is intentionally v3-only: bootstrap plus projection sync plus governed drift ingest, without the constitutional v4 runtime layer.

## Installable CLI

The installable surface is now the `cristalina` package.

Intended usage after publish:
1. `npm install -g cristalina`
2. `cristalina validate lint <path-to-store>`
3. `cristalina openclaw bootstrap --store <path-to-store> --workspace <path-to-workspace>`
4. `cristalina openclaw ingest --store <path-to-store> --workspace <path-to-workspace>`

Equivalent ephemeral usage:
- `npx cristalina validate lint <path>`
- `npx cristalina openclaw bootstrap --store <path> --workspace <path>`

## Near-Term Roadmap

- keep docs, schemas, fixtures, and sample store in parity with the current codepath
- run freeze and evaluation passes before adding more primitives
- measure contradiction handling, curation quality, and projection usefulness
- freeze the v3 baseline before expanding adapter surface or adding new protocol primitives

## V4 Direction

- add a constitutional layer above ordinary memory and policy
- keep constitutional axioms present in prompt, runtime, and memory simultaneously
- move human-protection invariants out of mutable policy and into a supra-canonical shell

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
- Maturity: v3 parity and freeze on top of architecture v2 convergence
