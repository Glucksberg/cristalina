# Cristalina
## Architecture V2
### Binding Repository Decisions

**Status:** Active  
**Purpose:** Close the gap between protocol idea, data model, and current implementation  
**Scope:** Repository-wide architectural decisions until the draft spec is merged forward

---

## 1. Why This Document Exists

Cristalina already has a strong protocol thesis:

- events are not facts
- proposals are not ratified memory
- canonical memory must be governed
- compiled context must remain derived

The repository also already contains implementation work in:

- `packages/types`
- `packages/validate`
- `packages/core`

The problem is that the current repository still contains unresolved architectural ambiguity in a few critical places:

- canonical data is partly object-shaped and partly document-shaped
- proposal targets are still string paths instead of stable references
- ratification semantics are richer in the docs than in the executable model
- privacy and audience are described conceptually but reduced too early to a linear scope order

This document makes those decisions explicit so the repository can move as a coherent v2.

---

## 2. Binding Rule

When this document conflicts with older repository drafts, this document is binding for repository evolution until the main spec and data model are updated to absorb it.

This is not a replacement for `docs/SPEC.md`.

It is the repository's convergence layer.

---

## 3. Canonical Representation

### 3.1 Canonical core is object-native

All governed persistent memory in the canonical core MUST be represented as typed objects with stable identifiers and protocol fields.

At minimum, canonical objects must preserve:

- `id`
- `kind`
- `status`
- provenance
- confidence
- privacy or audience policy linkage

### 3.2 No free-form canonical exceptions

Files under `core/` MUST NOT silently become canonical just because they are human-friendly to read.

That means files such as:

- `core/identity/soul.yaml`
- `core/preferences/communication.yaml`
- `core/values/values.yaml`

must follow one of two modes:

1. they are typed containers of canonical objects
2. they are derived views and therefore not the source of truth

Cristalina v2 chooses **mode 1 for canonical core files**.

### 3.3 Typed containers are allowed

Cristalina remains file-first. Object-native does not mean "one file per object" is mandatory.

A canonical file may contain:

- `items: [...]`
- `values: [...]`
- another explicit typed collection

but the contained entries must still be typed protocol objects, not ad hoc prose blobs.

### 3.4 Derived human-facing documents stay derived

Narrative summaries, compact preference sheets, bootstrap files, and runtime-facing markdown remain valid and useful.

They belong in derived layers such as:

- `core/narrative/`
- `core/digests/`
- `compiled/`
- workspace-facing adapter outputs

They do not redefine canonical truth.

---

## 4. Domain Model Decisions

### 4.1 Separate object classes remain mandatory

Cristalina v2 keeps a hard boundary between:

- Event
- Proposal
- Canonical Object
- Derived Artifact
- Policy Object

Policy objects are repository-controlled configuration and governance artifacts. They are not user memory objects.

Examples include:

- manifest
- protocol version files
- audience policies
- promotion policies

Repository rule for v3 freeze:

- each policy kind may define drafts, but only one active policy may govern selection at a time
- if multiple non-deprecated policies exist without an active selector, the repository is structurally ambiguous

### 4.2 Add a first-class entity layer

Cristalina v2 introduces the concept of stable entities.

At minimum, implementations should support entities for:

- owner
- agent
- project
- runtime
- channel or audience context
- external person or organization when memory needs to refer to them durably

Repository rule for v3 freeze:

- entities remain a governed registry layer under `entities/`
- they are not ordinary memory operations in the v3 write path
- Cristalina v3 assumes exactly one active owner entity and one active agent entity per store

### 4.3 Relationships must point to stable references

Relationship endpoints should no longer rely on arbitrary strings as the long-term norm.

Allowed v2 direction:

- `from_ref`
- `to_ref`

Plain text endpoints may still be accepted as import-time or migration-time compatibility data, but they should not remain the target architecture.

---

## 5. Proposal Model Decisions

### 5.1 Proposal is executable intent, not only commentary

A proposal must stop being just:

- a target string
- a reason string
- a confidence value

Cristalina v2 proposals should carry enough structure to deterministically produce a reviewed canonical operation.

### 5.2 Proposal payload

The target shape for proposals is:

```yaml
id: prop-...
operation: revise
target_ref:
  object_id: pref-012
candidate_payload:
  statement: "Use concise replies during operational work."
policy_tags: [communication, style]
reason: "Repeated confirmations across recent sessions."
risk:
  level: medium
  requires_human_approval: true
provenance:
  supporting_events:
    - evt-...
```

The exact field names may evolve, but the architectural requirement is fixed:

- the proposal must describe the intended operation
- the proposal must identify the target through stable reference
- the proposal must carry candidate structured payload

### 5.3 Proposal `reason` is explanatory, not authoritative

`reason` explains why the proposal exists.

It is not enough, by itself, to perform the update.

---

## 6. Ratification Semantics

### 6.1 Ratification produces an operation plan

Human response does not directly mutate the core.

The pipeline is:

```text
proposal -> question -> human response -> normalized decision -> canonical operation plan -> audited apply
```

### 6.2 `accept` is not always `CONFIRM`

An accepted response may mean:

- confirm existing object
- create new object
- supersede existing object
- resolve contradiction
- approve a privacy change

The meaning depends on the proposal's declared operation.

### 6.3 `edit` may create multiple canonical objects

Human edits are semantic authority.

One edited answer may legitimately become:

- one revised object
- one supersession plus one constraint
- one style rule plus one scoped preference

The normalization step must preserve meaning faithfully and remain auditable.

For v3 freeze, repository implementations SHOULD also support deterministic decomposition of structured edit answers, for example bullet lists or `kind: statement` follow-ups, into multi-intent apply plans.

### 6.4 Text answers are not enough

Free-text answers remain the human interface, but the system must normalize them into a structured apply plan before touching canonical state.

---

## 7. Authority and Policy

### 7.1 Replace path heuristics with policy decisions

Path-based restrictions are not enough to express the protocol's authority model.

Cristalina v2 needs a policy layer that can answer:

- does this operation require human approval?
- is this preference sensitive in this context?
- can this audience see this object?
- can this runtime propose on this domain?

### 7.2 Sensitive is contextual

The following should be treated as policy-resolved, not hardcoded only by file path:

- sensitive preferences
- privacy changes
- public-facing behavior rules
- identity shifts
- sharing permissions

### 7.3 Policy is separate from memory

Policy files are governance configuration.

They are not the same thing as canonical user memory objects.

---

## 8. Privacy and Audience

### 8.1 Privacy is not a total order

Cristalina v2 does not treat all privacy scopes as cleanly rankable along a single ladder.

For example, these may be incomparable:

- `agent_operational`
- `project_private`

### 8.2 Audience filtering moves to policy

Projection visibility should be decided by an audience policy model, not only by numeric scope comparison.

The target architecture is:

- memory objects carry privacy metadata
- audience profiles declare capabilities
- policy evaluates visibility

### 8.3 Scope strings may remain as protocol labels

Existing scope labels are still useful:

- `owner_private`
- `agent_operational`
- `project_private`
- `shareable`
- `public_safe`

But v2 treats them as policy inputs, not as a complete authorization engine by themselves.

---

## 9. Compiler and Projection Rules

### 9.1 Compiler input contract

Compiled context must be reproducible from:

- canonical objects
- policy
- optional recent events where allowed
- deterministic scoring or selection rules

### 9.2 Compiler output contract

Compiled artifacts must carry enough metadata to explain:

- generation time
- audience
- derivation source set
- projection profile

### 9.3 Derived layers remain non-authoritative

This remains unchanged:

- compiled context does not become canonical automatically
- bootstrap files do not redefine the core
- narrative does not rewrite ratified truth

---

## 10. OpenClaw Adapter Decisions

### 10.1 Default writeback mode

Cristalina v2 keeps **proposal extraction** as the default OpenClaw writeback mode.

### 10.2 Runtime edits become drift evidence first

Runtime changes to generated projection files should first become:

- drift detection signals
- runtime drift events
- optional extracted proposals

They must not become direct canonical writes.

### 10.3 Proposal extraction needs an explicit contract

If runtime drift is converted into proposals, the adapter must define:

- which files are parsable
- which sections are machine-extractable
- what provenance gets attached
- what confidence defaults are used
- when human review is mandatory

Without this, Mode B becomes hand-wavy and unsafe.

For v3 freeze, the repository contract is explicit:

- machine-parsable drift currently extracts `create`, `confirm`, `revise`, and `deprecate`
- unsupported semantics must remain drift evidence until a safe extractor exists

---

## 11. Repository Consequences

The repository must now converge toward the following:

### 11.1 `packages/types`

Needs v2 alignment for:

- structured proposal payloads
- stable target references
- entity objects or reference primitives
- policy-facing privacy metadata

### 11.2 `packages/validate`

Needs v2 alignment for:

- canonical container rules
- schema coverage across all canonical core files
- policy-aware audience checks
- migration-time compatibility diagnostics

### 11.3 `packages/core`

Needs v2 alignment for:

- operation planning from structured proposals
- ratification normalization before apply
- policy-backed authorization
- compiler selection driven by policy and stable references

### 11.4 Example store

Needs alignment so examples stop mixing:

- canonical typed objects
- informal config-shaped documents

inside the same authority domain without an explicit rule.

---

## 12. Milestone Gates

Cristalina v2 should not call itself architecturally converged until all of the following are true:

- canonical representation is unambiguous
- proposal payloads are structured enough for deterministic apply
- ratification can preserve edited human meaning without collapsing it into one string field
- audience filtering is policy-based rather than only ladder-based
- example store, schemas, validator, and core all agree on the same canonical model

---

## 13. Immediate Work Order

The repository should execute work in this order:

1. freeze canonical representation
2. freeze proposal and ratification semantics
3. introduce stable references and entity support
4. introduce policy-backed audience and authority evaluation
5. align compiler and OpenClaw adapter to the new contracts
6. update sample store and fixtures

---

## 14. Final Statement

Cristalina v2 is not about adding more moving parts.

It is about making the existing idea executable without collapsing:

- governance into convenience
- semantics into string patches
- privacy into a brittle scope ladder
- canonical memory into mixed-format ambiguity
