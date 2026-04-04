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
|   |-- portal/
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
1. `docs/ARCHITECTURE-V2.md`
2. `docs/SPEC.md`
3. `docs/DATA-MODEL.md`
4. `docs/RUNTIME-COGNITION-FLOW.md`
5. `docs/CONSTITUTIONAL-CORE.md`
6. `docs/CURATION-PROTOCOL.md`
7. `docs/adapters/OPENCLAW-ADAPTER.md`

If older draft documents and the current repository implementation diverge, `docs/ARCHITECTURE-V2.md` is the active convergence layer for repository work. The spec and adapter docs also contain optional and future-facing sections; treat the v3 baseline described in this README and the convergence doc as authoritative for what ships today.

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
- clarified runtime cognition surfaces for `USER.md` and `MEMORY.md`
- semantic round-trip for mixed runtime sections (`fact`, `constraint`, `belief`, `project`)
- OpenClaw writeback contract metadata
- governed drift -> proposal extraction for machine-parsable projection edits
- a live operator portal that explains the store and streams updates over WebSocket
- a minimal `cristalina-openclaw` bootstrap and ingest CLI over the v3 contracts

## Live Portal

Cristalina now includes `@cristalina/portal`, a read-only operator surface for inspecting a store in real time.

It is useful when you want:
- a quick visual map of the main files that define the memory
- live SOUL/VALUE/USER/MEMORY previews generated from the current canonical store
- validation status, recent events, proposals, and core objects in one place
- WebSocket-driven updates while the store changes under active runtime work

Run it locally with:

```bash
pnpm portal serve --store examples/sample-store/.cristalina --port 8787
```

Or through the installable CLI surface:

```bash
pnpm cli -- portal serve --store examples/sample-store/.cristalina --port 8787
```

## First-Run Onboarding

The repo now exposes a first-run onboarding flow through the main CLI:

```bash
pnpm onboard:setup
```

Or directly:

```bash
pnpm cli -- onboard setup
```

What it does:
- launches a menu-driven wizard in interactive terminals
- initializes a starter `.cristalina` store if the target path is still empty
- preserves an existing store instead of overwriting canonical data
- bootstraps an OpenClaw workspace if you pass `--workspace`
- writes onboarding guidance into the store or workspace
- can launch the live portal with `--launch-portal`

If you want to seed the wizard or skip it entirely, flags still work:

```bash
pnpm onboard:setup -- --wizard --store ./.cristalina
pnpm onboard:setup -- --store ./.cristalina --workspace /absolute/path/to/openclaw --yes
```

## Run OpenClaw Against v3

The minimal adapter package is `@cristalina/openclaw` with the `cristalina-openclaw` bin.

Typical loop:
1. `pnpm build`
2. `pnpm openclaw bootstrap --store examples/sample-store/.cristalina --workspace <your-openclaw-workspace>`
3. point OpenClaw at `SOUL.md`, `VALUE.md`, `USER.md`, and `MEMORY.md` in that workspace
4. after runtime edits, run `pnpm openclaw ingest --store examples/sample-store/.cristalina --workspace <your-openclaw-workspace>`

Current safety behavior:
- bootstrap refuses to overwrite workspace files if they still contain un-ingested runtime drift
- ingest compares against the workspace baseline captured at the last sync, not only against the current compiled store
- drift-only edits are reported explicitly when no machine-safe proposals can be extracted

This is intentionally v3-only: bootstrap plus projection sync plus governed drift ingest, without the constitutional v4 runtime layer.

## Installable CLI

The installable surface is now the `cristalina` package.

Intended usage after publish:
1. `npm install -g cristalina`
2. `cristalina onboard setup --store <path-to-store> --workspace <path-to-workspace> --yes`
3. `cristalina validate lint <path-to-store>`
4. `cristalina openclaw bootstrap --store <path-to-store> --workspace <path-to-workspace>`
5. `cristalina openclaw ingest --store <path-to-store> --workspace <path-to-workspace>`
6. `cristalina portal serve --store <path-to-store> --port 8787`

Equivalent ephemeral usage:
- `npx cristalina validate lint <path>`
- `npx cristalina openclaw bootstrap --store <path> --workspace <path>`

## OpenClaw Onboarding Script

Before npm publishing, the repo also provides a root onboarding script for mapped OpenClaw workspaces:

1. create `config/openclaw-workspaces.local.json` from `config/openclaw-workspaces.example.json`
2. fill it with absolute paths to your OpenClaw runtime workspaces
3. run:

```bash
pnpm onboard:openclaw
```

The script:
- explains the Cristalina memory model briefly
- lets you choose one mapped OpenClaw workspace
- wipes that workspace safely
- bootstraps `SOUL.md`, `VALUE.md`, `USER.md`, and `MEMORY.md`
- writes `CRISTALINA-ONBOARDING.md` into the target workspace

## Linux One-Liner From GitHub

For pre-npm testing on Linux, the repo also includes a direct GitHub installer:

```bash
curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/<ref>/scripts/install-openclaw-from-github.sh | \
  bash -s -- --repo <owner>/<repo> --ref <ref> --workspace-path /absolute/path/to/openclaw
```

What it does:
- downloads the repo snapshot from GitHub
- runs `pnpm install`
- runs `pnpm build`
- wipes the target OpenClaw workspace
- bootstraps the Cristalina runtime projection into that workspace

For now this is the cleanest "one command and install into my OpenClaw instance" path before npm publish.

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
