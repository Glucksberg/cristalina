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
- the OpenClaw reference adapter
- the human curation protocol
- starter schemas for validation
- a sample `.cristalina/` store layout

## Repository Layout

```text
.
├── README.md
├── manifest.yaml
├── docs/
│   ├── SPEC.md
│   ├── DATA-MODEL.md
│   ├── CURATION-PROTOCOL.md
│   └── adapters/
│       └── OPENCLAW-ADAPTER.md
├── schemas/
│   ├── manifest.schema.json
│   ├── event.schema.json
│   ├── proposal.schema.json
│   └── memory-object.schema.json
└── examples/
    └── sample-store/
        └── .cristalina/
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
3. `docs/CURATION-PROTOCOL.md`
4. `docs/adapters/OPENCLAW-ADAPTER.md`

## v1 Focus

Cristalina v1 includes:
- append-only events
- proposal-based memory promotion
- ratified canonical core
- privacy scopes
- provenance fields
- HOT/WARM/COLD compiled context
- bootstrap projection
- OpenClaw adapter

## Near-Term Roadmap

- formalize migration/version rules
- add deterministic validators
- add CLI scaffolding
- add reference tests for context compilation
- define adapter contract for non-OpenClaw runtimes


## Governance Files

- `LICENSE`
- `NOTICE`
- `CONTRIBUTING.md`
- `ROADMAP.md`
- `CHANGELOG.md`
- `releases/v0.1.0.md`


## Repository Status

- Protocol version: `1.0-draft`
- Repository version: `0.1.0`
- Maturity: draft / architecture review
