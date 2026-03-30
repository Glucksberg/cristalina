# Contributing to Cristalina

Thanks for your interest in Cristalina.

Cristalina is a protocol-first project. Contributions are welcome, but changes must preserve the core design goals:

- human-governed canonical memory
- file-first portability
- explicit privacy scopes
- provenance and auditability
- strict separation between canonical core and compiled runtime context

## Ways to contribute

You can contribute by:

- improving the spec language
- proposing schema refinements
- adding validation rules
- writing adapter contracts for new runtimes
- expanding examples and fixtures
- identifying protocol ambiguities
- contributing reference tooling

## Before opening a pull request

Please read, in order:

1. `docs/SPEC.md`
2. `docs/DATA-MODEL.md`
3. `docs/CURATION-PROTOCOL.md`
4. `docs/adapters/OPENCLAW-ADAPTER.md`
5. `ROADMAP.md`

## Contribution types

### 1. Spec clarification
Use this for wording changes, normative tightening, or removing ambiguity.

### 2. Data model change
Use this when changing required fields, states, or object semantics.

### 3. Adapter change
Use this when refining the OpenClaw adapter or proposing a new adapter contract.

### 4. Tooling or validation
Use this for schema validators, linters, migration tools, or test fixtures.

## Rules for protocol changes

Any pull request that changes protocol semantics should:

- explain the problem clearly
- state whether the change is backward compatible
- identify affected files and schemas
- update examples when relevant
- update changelog entries
- add or update release notes if the change is material

## Style guidelines

- Prefer precise language over broad claims.
- Keep protocol wording normative where needed.
- Do not silently change terminology.
- If a new term is introduced, define it in context.
- Examples should be minimal but realistic.

## Versioning expectations

Cristalina uses two separate version tracks:

- **protocol version**: changes to the protocol itself
- **repository version**: changes to this repository and its reference materials

Breaking protocol changes must be called out explicitly.

## Pull request checklist

Before submitting, verify that:

- the change is scoped and documented
- markdown files still read cleanly end-to-end
- examples still match the docs
- schema changes are reflected in `schemas/`
- `CHANGELOG.md` has been updated

## Discussion first for large changes

Please open an issue before submitting large changes involving:

- core authority model
- privacy scopes
- confidence lifecycle semantics
- curation flow
- bootstrap projection semantics
- adapter contracts

## Contribution license

By contributing to this repository, you agree that your contributions will be licensed under the repository license.
