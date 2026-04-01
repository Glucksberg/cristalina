# Cristalina
## OpenClaw Adapter Specification
### Version 1.0-draft

This document defines the reference adapter between Cristalina Core and OpenClaw.

---

## 1. Purpose

Cristalina OpenClaw exists to let OpenClaw consume memory safely without granting the runtime unrestricted authority over the canonical store.

The adapter's job is to:

- expose runtime-friendly projections
- preserve the integrity of the core
- keep privacy and scope intact
- convert governed memory into OpenClaw-compatible startup files

---

## 2. Design Constraint

OpenClaw operates through workspace files. That is compatible with Cristalina only if the adapter preserves a strict boundary between:

- **canonical store** (`.cristalina/`)
- **runtime projection** (`workspace-facing files`)

The runtime-facing files are compiled artifacts, not the source of truth.

---

## 3. Adapter Responsibilities

Cristalina OpenClaw MUST:

1. read canonical state from Cristalina Core
2. compile OpenClaw-compatible startup files
3. write only derived projection files to the workspace-facing layer
4. protect canonical state from unrestricted runtime overwrite
5. preserve scope-aware filtering
6. record projection provenance and generation time

Cristalina OpenClaw MUST NOT:

- treat runtime-edited projection files as canonical by default
- allow OpenClaw free write access to the canonical core
- escalate privacy scope during projection

---

## 4. Input Sources

The adapter SHOULD read from:

- `core/ratified/`
- `core/values/`
- `core/identity/`
- `core/preferences/`
- `core/narrative/`
- `entities/`
- `policy/`
- `compiled/hot/`
- `compiled/warm/`
- recent `events/` when policy allows

It MAY read from `proposals/` only for surfacing review context, not for treating them as truth.

---

## 5. Output Targets

The adapter SHOULD generate, at minimum:

- `SOUL.md`
- `VALUE.md`
- `USER.md`
- `MEMORY.md`

Depending on the OpenClaw setup, it MAY also generate:

- `IDENTITY.md`
- `STYLE.md`
- `HEARTBEAT.md`
- `PROJECT.md`

---

## 6. Projection Rules

## 6.1 SOUL.md

Contains:

- role
- stable identity traits
- self-presentation
- durable interaction stance

Must not contain:

- raw contradiction logs
- unresolved proposals
- private details outside scope

## 6.2 VALUE.md

Contains:

- priorities
- non-negotiable guardrails
- conflict ordering between values

Must remain distinct from tone or style.

## 6.3 USER.md

Contains:

- user-facing relationship summary
- durable communication preferences safe for the intended audience
- operational context needed for useful interactions

## 6.4 MEMORY.md

Contains:

- compact, high-utility memory summary
- recent high-value stable facts
- active projects
- urgent open loops

Must be concise and runtime-efficient.

---

## 7. Scope Filtering

Projection MUST filter by audience.

### Example audiences

- owner private DM
- project-private workspace
- group channel
- public-safe export

The same canonical memory store MAY produce different startup projections for different channels.

A memory marked `owner_private` MUST NOT appear in a group-safe or public-safe projection.

---

## 8. Writeback Policy

OpenClaw-facing files may be edited by the runtime, but those edits MUST be treated as one of the following:

- scratch output
- proposal material
- runtime-local drift

They MUST NOT automatically overwrite canonical memory.

### Safe writeback modes

#### Mode A — No writeback
Runtime edits are ignored by the core.

#### Mode B — Proposal extraction
Runtime edits are parsed into proposals for review.

In the current repository baseline, machine-parsable extraction is limited to:

- `create`
- `confirm`
- `revise`
- `deprecate`

#### Mode C — Restricted deterministic writeback
Only specific machine-safe fields are synchronized under explicit policy.

Cristalina OpenClaw SHOULD default to **Mode B**.

---

## 9. File Generation Pipeline

Recommended pipeline:

```text
core -> compiler -> scope filter -> projection templates -> workspace files
```

Optional extended pipeline:

```text
core -> compiler -> HOT/WARM selection -> scope filter -> projection templates -> checksum -> workspace files
```

---

## 10. Runtime Drift Handling

Runtime drift occurs when the workspace-facing view diverges from the canonical store.

Examples:

- the runtime rewrites `MEMORY.md`
- the runtime appends self-observations into `SOUL.md`
- the runtime changes tone instructions in a way not reflected in the core

The adapter SHOULD detect drift by:

- checksums
- generation timestamps
- projection metadata
- scheduled comparison

Drift SHOULD produce:

- a warning
- a runtime drift event
- one or more governed proposals when the edited sections are machine-parsable
- or a projection refresh

Drift MUST NOT silently become canonical.

---

## 11. Suggested Metadata Header

Generated files SHOULD include frontmatter or a header block such as:

```yaml
---
generated_by: cristalina-openclaw
source: canonical_projection
audience: owner_private_dm
generated_at: 2026-03-29T06:10:00Z
projection_id: proj-2026-03-29-01
---
```

This helps prevent confusion between generated artifacts and manually governed truth.

When the adapter supports governed re-ingest, that metadata SHOULD also include enough writeback contract information to distinguish:

- generated artifact kind
- machine-extractable sections
- projection profile
- checksum lineage

---

## 12. Projection Strategy

The adapter SHOULD prioritize:

1. high-confidence ratified memory
2. active current projects
3. identity essentials
4. top values and guardrails
5. recently confirmed preferences
6. urgent loops

It SHOULD deprioritize:

- stale archived material
- disputed items unless operationally critical
- large narrative history
- unresolved low-confidence proposals

---

## 13. Boot Efficiency

OpenClaw startup files should be compact.

Recommended practice:

- `SOUL.md`: compact and stable
- `VALUE.md`: short and explicit
- `USER.md`: practical relationship and preference summary
- `MEMORY.md`: token-budgeted high-yield summary

The adapter MAY produce multiple projection profiles depending on token budget.

Example profiles:

- `tiny`
- `standard`
- `deep`

---

## 14. Heartbeat Integration

If OpenClaw runs scheduled agent loops, the adapter MAY expose a heartbeat-specific projection that includes:

- current open loops
- active proposals awaiting evidence
- recent contradictions
- project priorities

This heartbeat view is still derived and MUST NOT become canonical by itself.

---

## 15. Failure Modes

The adapter SHOULD account for:

- missing canonical files
- invalid schemas
- illegal scope values
- runtime edits to generated files
- projection compilation failures
- stale compiled artifacts

When a failure occurs, the adapter SHOULD:

- fall back to the last valid projection
- log the error
- avoid writing malformed startup files

---

## 16. Security Baseline

Cristalina OpenClaw SHOULD:

- keep secrets out of startup projections
- redact sensitive content during compilation
- log projection audiences
- preserve privacy scopes end-to-end
- avoid pushing owner-private content into shared channels

---

## 17. Reference Mapping

Suggested mapping from Cristalina to OpenClaw-facing files:

| Cristalina Source | OpenClaw Output |
|---|---|
| `core/identity/soul.yaml` | `SOUL.md` |
| `core/values/values.yaml` | `VALUE.md` |
| `core/preferences/communication.yaml` + relationship summary | `USER.md` |
| `compiled/hot/session-pack.md` + selected ratified memory | `MEMORY.md` |
| `core/identity/style.yaml` | optional `STYLE.md` |
| `core/narrative/open_loops.md` | optional heartbeat/project projection |

---

## 18. Compliance

An implementation may call itself **Cristalina OpenClaw** only if it:

- maintains canonical/projection separation
- does not allow unrestricted runtime overwrite of the core
- supports scope-aware projection
- treats runtime edits as non-canonical unless reviewed
- generates the required startup files from Cristalina Core

---

## 19. Final Statement

Cristalina OpenClaw does not replace Cristalina Core.

It is the translation layer that lets OpenClaw benefit from governed long-term memory without turning runtime-facing workspace files into the sole authority over truth.
