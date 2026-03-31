# Cristalina
## Official Specification
### Version 1.0-draft

**Status:** Draft  
**Type:** Memory protocol for persistent AI agents  
**Scope:** Runtime-agnostic, filesystem-first, human-governed long-term memory

---

## 1. Purpose

Cristalina defines how an AI agent should:

- record events
- propose memory updates
- ratify durable truth
- compile operational context
- preserve privacy
- maintain identity over time
- remain portable across runtimes
- stay auditable and reversible

Cristalina is **not** a runtime. It is **not** only a plugin. It is a **memory protocol** with a canonical core and runtime adapters.

---

## 2. Core Thesis

AI models are strong at:

- spotting patterns
- synthesizing signals
- suggesting associations
- compressing context

AI models are weak at being the final authority over persistent truth.

Cristalina therefore separates:

1. **what happened**
2. **what the agent thinks that means**
3. **what becomes stable memory**
4. **what gets projected to the runtime**

This separation is mandatory.

---

## 3. Design Principles

### 3.1 Curation over free rewrite
Canonical memory must not remain under unrestricted model write access.

### 3.2 File-first
Primary storage must be legible, diffable, versionable, and recoverable.

### 3.3 Events are cheap, truth is expensive
Event logging may be automatic. Stable truth requires governance.

### 3.4 Proposals are not facts
An inference, summary, or pattern match is not canonical memory.

### 3.5 Human governance is first-class
The owner is the final authority over values, identity, durable preferences, and sensitive facts.

### 3.6 Privacy is mandatory
Every memory object must carry an explicit privacy scope.

### 3.7 Compiled context is derived, not canonical
Operational context serves a runtime but does not redefine the core by itself.

### 3.8 Identity and values are distinct
A system may speak like the owner without sharing every one of the owner's values by default; values must be explicit.

### 3.9 Auditability beats magic
Every meaningful change must leave a trail.

### 3.10 Replaceable adapters
The protocol must survive runtime changes.

---

## 4. Normative Language

The following terms are normative:

- **MUST**: required
- **MUST NOT**: forbidden
- **SHOULD**: strongly recommended
- **MAY**: optional
- **CANONICAL**: persistent, governed truth
- **COMPILED**: derived operational representation
- **RATIFIED**: confirmed by the human or by an approved formal workflow
- **CRYSTALLIZED**: highly stable memory protected from ordinary decay

---

## 5. System Domains

Cristalina is divided into five logical domains.

### 5.1 Events
Append-only raw records of observation and activity.

### 5.2 Proposals
Structured candidate changes suggested by the agent or tooling.

### 5.3 Core
Stable, governed memory.

### 5.4 Compiled Context
Temporary operational packs generated for a runtime.

### 5.5 Bootstrap Projection
Minimal startup files consumed by a runtime session.

---

## 6. Authority Model

### 6.1 Direct agent write
The agent MAY write directly to:

- `events/`
- `proposals/`
- `scratch/`
- `reports/`

### 6.2 Restricted agent write
The agent MUST NOT freely write to:

- `core/ratified/`
- `core/values/`
- `core/identity/`
- `core/preferences/`
- `core/privacy/`

### 6.3 Canonical updates
Canonical changes MUST happen through one of the following:

- explicit human reply
- ratification workflow
- deterministic protocol transformation authorized by policy

### 6.4 Interpretation guardrail
The system MUST preserve the user's meaning faithfully when applying a human-approved update. Silent reinterpretation is forbidden.

---

## 7. Storage Model

Recommended layout:

```text
.cristalina/
  protocol/
    manifest.yaml
    version.yaml

  events/
    YYYY-MM/
      YYYY-MM-DD.jsonl

  proposals/
    YYYY-MM/
      daily-curation-YYYY-MM-DD.yaml
      pending-updates.yaml

  core/
    ratified/
      facts.yaml
      relationships.yaml
      contradictions.yaml
    identity/
      soul.yaml
      style.yaml
    values/
      values.yaml
    narrative/
      story.md
    privacy/
      policy.yaml

  compiled/
    hot/
      session-pack.md
    warm/
      extended-context.md
    cold/
      deep-recall-index.yaml
    bootstrap/
      SOUL.md
      VALUE.md
      USER.md
      MEMORY.md
    metadata/
      projection-manifest.yaml
    channels/
      <channel>/
        hot/
        warm/
        cold/
        bootstrap/
        metadata/

  audits/
    validation.log
    changes.log
    contradictions.yaml

  backups/
    snapshots/
    signed/
```

---

## 8. Information Flow

Canonical flow:

```text
events -> proposals -> ratified core -> digests -> compiled context -> bootstrap
```

This flow is **not circular by default**.

The following MUST NOT occur automatically:

- compiled context becoming canonical truth
- bootstrap files redefining the core
- narrative rewriting ratified facts

Promotion between layers requires protocol-compliant governance.

---

## 9. Memory States

Every canonical memory object MUST have one state:

- `draft`
- `candidate`
- `ratified`
- `crystallized`
- `deprecated`
- `archived`
- `disputed`

### State meanings

- **draft**: incomplete and not yet ready for review
- **candidate**: ready for ratification
- **ratified**: confirmed and active
- **crystallized**: highly stable and protected
- **deprecated**: preserved but no longer active
- **archived**: removed from operational recall
- **disputed**: conflicting or under arbitration

---

## 10. Confidence Lifecycle

### 10.1 Birth
All memory objects MUST be born with explicit confidence.

Recommended initial ranges:

- agent inference: `0.30–0.60`
- strong synthesis with evidence: `0.55–0.75`
- explicit human reply: `0.80–0.95`

### 10.2 Confirmation
Confidence SHOULD increase when a memory receives:

- direct human confirmation
- repeated consistency over time
- multiple independent pieces of supporting evidence

### 10.3 Decay
Ratified memory MAY decay when:

- it goes unvalidated for too long
- it is partly contradicted
- it loses operational relevance

### 10.4 Crystallization
A memory MAY become `crystallized` when it has:

- high confidence
- multiple independent confirmations
- demonstrated temporal stability

Crystallized memories MUST NOT suffer ordinary decay.

### 10.5 Supersession
When a memory changes, the old memory SHOULD be superseded, not erased.

---

## 11. Memory Operations

Cristalina defines the following operations:

- `LOG`
- `PROPOSE`
- `CREATE`
- `CONFIRM`
- `REVISE`
- `EXTEND`
- `CONTRADICT`
- `SUPERSEDE`
- `DEPRECATE`
- `CRYSTALLIZE`
- `ARCHIVE`

Each implementation SHOULD log the operation, actor, timestamp, target, and provenance.

---

## 12. Human Governance

### 12.1 Daily curation packet
Cristalina SHOULD generate a compact daily curation packet for the owner.

Default target:

- up to 3 questions per day

Adaptive target:

- 1 question on quiet days
- 3 questions on normal days
- 5 or more when activity, conflict, or uncertainty is high

### 12.2 Question classes
The protocol SHOULD support at least:

- **factual correction**
- **value arbitration**
- **identity/style calibration**

### 12.3 Allowed human actions
The owner SHOULD be able to:

- accept
- reject
- edit
- defer
- mark uncertain

### 12.4 Ratification semantics
Owner responses SHOULD be normalized into an explicit operation plan before touching canonical state.

The canonical result of `accept` or `edit` depends on the proposal's declared operation and may become:

- `CREATE`
- `CONFIRM`
- `REVISE`
- `SUPERSEDE`
- `DEPRECATE`
- `CONTRADICT`

### 12.5 High-risk classes
Updates affecting the following MUST require human approval:

- values
- privacy policy
- identity
- sensitive preferences
- public-facing behavioral rules

---

## 13. Values, Identity, Style

### 13.1 Values
Values define priorities and guardrails.

### 13.2 Identity
Identity defines role, self-presentation, durable traits, and relationship to the owner.

### 13.3 Style
Style defines tone, verbosity, humor, formality, and response density.

### 13.4 Reflection
Cristalina SHOULD maintain an identity reflection layer where the agent can ask whether its style drift is still desired.

---

## 14. Privacy and Scope

### 14.1 Scope is mandatory
Every memory object MUST carry a privacy scope.

Minimum supported scopes:

- `owner_private`
- `agent_operational`
- `project_private`
- `shareable`
- `public_safe`

### 14.2 Non-escalation rule
A memory MUST NOT rise in privacy scope automatically.

### 14.3 Audience-aware projection
Compiled context and bootstrap projection MUST respect audience and channel.

### 14.4 Sensitive categories
Implementations SHOULD treat the following with reinforced caution:

- credentials
- precise location
- finances
- health
- intimate relationships
- private strategy
- security instructions

---

## 15. Provenance

Every canonical memory MUST include, at minimum:

- `source_type`
- `source_ref`
- `created_at`
- `last_confirmed_at`
- `confirmed_by`
- `evidence_count`
- `confidence`
- `privacy_scope`

Recommended `source_type` values:

- `human_reply`
- `human_message`
- `agent_inference`
- `agent_synthesis`
- `runtime_observation`
- `external_source`
- `imported`

---

## 16. Contradictions

Cristalina MUST support explicit contradiction handling.

When two memories conflict, the system SHOULD:

1. mark both as related
2. log the contradiction
3. adjust confidence as policy requires
4. open an arbitration proposal
5. escalate to the owner when needed

Conflicts in values, identity, privacy, and active projects SHOULD be treated as high priority.

---

## 17. Narrative Layer

Narrative is a living projection, not the whole core.

Typical files:

- `story.md`
- `arcs.md`
- `open_loops.md`

Narrative MAY be rewritten. Narrative MUST be derived from canonical state plus recent activity. Narrative MUST NOT silently rewrite ratified truth.

---

## 18. Compiled Context

### 18.1 Purpose
Compiled context exists to serve a runtime with precision and token discipline.

### 18.2 Tiers

#### HOT
Immediate context:
- identity essentials
- critical values
- active preferences
- current project
- urgent loops

#### WARM
Relevant but not always required:
- recent history
- recurring decisions
- stable patterns
- project context

#### COLD
Rare but recoverable:
- older history
- deep digests
- archived reference material

### 18.3 Rule
Compiled context SHOULD be reproducible from core + events + policy.

---

## 19. Bootstrap Projection

Bootstrap projection is the minimal startup view for a runtime.

Recommended files:

- `SOUL.md`
- `VALUE.md`
- `USER.md`
- `MEMORY.md`

Rules:

- bootstrap MUST derive from the core
- bootstrap MUST respect scope and audience
- bootstrap SHOULD remain compact and operational

---

## 20. Auditing and Rollback

Cristalina MUST support:

- core diffs
- ratification history
- contradiction logs
- validation logs
- restore-ready snapshots

Rollback MUST be possible for:

- accidental promotion
- bad supersession
- broken compilation
- incorrect runtime projection

Implementations that support channel-specific projection SHOULD preserve per-channel namespaces so distinct runtime surfaces do not overwrite one another.

---

## 21. Validation

Implementations SHOULD validate:

- schema correctness
- missing provenance
- illegal scope escalation
- orphan supersede chains
- disputed memories without arbitration
- bootstrap inconsistency
- compiled-context drift

---

## 22. Reference Components

### 22.1 Cristalina Core
The canonical implementation of the protocol.

Responsibilities:

- schemas
- lifecycle
- provenance
- curation logic
- compilation
- privacy enforcement
- audit and rollback

### 22.2 Cristalina OpenClaw
Reference adapter for OpenClaw.

Responsibilities:

- generate OpenClaw-facing startup files
- preserve separation between canonical storage and runtime projection
- prevent free rewrite of the core by the runtime

### 22.3 Optional future components
Future adapters MAY exist for:

- MCP
- Python runtimes
- TypeScript runtimes
- CLI tools
- local agents

---

## 23. Security Baseline

Implementations SHOULD adopt at minimum:

- secrets outside the memory store
- signed or verifiable backups
- redaction before export
- access logging
- privacy-aware compilation

---

## 24. Non-goals for v1

Cristalina v1 does not require:

- a vector database
- a graph database
- a cloud backend
- embeddings
- native multi-agent sync
- advanced semantic retrieval

These MAY exist as later extensions.

---

## 25. Compliance Profiles

### 25.1 Cristalina-Compatible
Implements:

- domain separation
- memory operations
- human governance
- provenance
- privacy scope
- distinction between canonical and compiled context

### 25.2 Cristalina-Core
Implements the full reference core.

### 25.3 Cristalina-OpenClaw
Implements the official OpenClaw adapter.

---

## 26. Canonical v1 Summary

Cristalina v1 defines:

- append-only events
- separated proposals
- ratified core
- confidence lifecycle
- values distinct from identity
- mandatory privacy scopes
- HOT/WARM/COLD compilation
- bootstrap projection
- daily curation packets
- auditing and rollback
- a reference OpenClaw adapter

---

## 27. Final Statement

Cristalina exists to solve a difficult problem plainly:

> an agent may observe a lot, infer a lot, and suggest a lot,
> but the memory that matters must remain portable, legible, governed, and trustworthy.
