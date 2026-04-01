# Changelog

All notable changes to this repository will be documented in this file.

This project tracks:

- **protocol version** for changes to Cristalina semantics
- **repository version** for changes to docs, schemas, examples, and adapters

The format is based on Keep a Changelog, adapted for a protocol-first repository.

## [Unreleased]

### Added
- `docs/ARCHITECTURE-V2.md` as the active repository convergence document
- `docs/CONSTITUTIONAL-CORE.md` as the proposed v4 constitutional architecture direction
- `@cristalina/openclaw` as a minimal runtime adapter package with `bootstrap` and `ingest` commands

### Changed
- rebased `ROADMAP.md` around architecture v2 convergence instead of a purely future-looking core plan
- updated `README.md` to reflect existing packages and the new document order
- updated `manifest.yaml` to reflect the real repository surface and current module statuses
- expanded `schemas/manifest.schema.json` so the manifest can declare the architecture convergence document
- expanded the manifest surface so the repository can declare the constitutional core document
- rebased repo docs and roadmap so OpenClaw is now a runnable v3 adapter surface, not only a hardened contract

### Notes
- repository work is now explicitly organized around canonical model freeze, proposal and ratification redesign, policy-backed privacy and authority, and adapter hardening

## [0.1.0] - 2026-03-29

### Added
- initial `README.md`
- initial `manifest.yaml`
- official draft spec in `docs/SPEC.md`
- data model in `docs/DATA-MODEL.md`
- human curation protocol in `docs/CURATION-PROTOCOL.md`
- OpenClaw adapter draft in `docs/adapters/OPENCLAW-ADAPTER.md`
- starter schemas in `schemas/`
- sample `.cristalina/` store under `examples/sample-store/`
- repository governance files
- initial release notes for `v0.1.0`

### Notes
- protocol status is still `draft`
- OpenClaw support is a reference adapter draft, not yet a production implementation
