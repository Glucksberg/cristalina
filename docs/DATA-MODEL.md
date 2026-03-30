# Cristalina
## Data Model
### Version 1.0-draft

This document defines the primary data objects, fields, states, and relationships used by Cristalina.

---

## 1. Overview

Cristalina stores memory as typed objects distributed across four main classes:

- Event
- Proposal
- Canonical Memory Object
- Derived Artifact

Each object class serves a distinct role. Implementations MUST preserve these distinctions.

---

## 2. Object Classes

## 2.1 Event

An Event is a raw, append-only record of something that happened, was observed, was inferred, or was produced operationally.

### Required fields

```yaml
id: evt-2026-03-29-001
kind: heartbeat
ts: 2026-03-29T02:00:00Z
summary: "Agent reviewed memory research and generated 2 proposals."
source_type: agent_runtime
privacy_scope: agent_operational
```

### Recommended fields

```yaml
actor: fluck
session_id: hb-072
project: cristalina
related_entities: [memory, protocol, openclaw]
artifacts:
  - reports/2026-03-29-hb72.md
```

### Allowed `kind` values

- `heartbeat`
- `interaction`
- `observation`
- `inference`
- `contradiction_detected`
- `proposal_generated`
- `compilation`
- `validation_failure`
- `ratification_applied`
- `other`

---

## 2.2 Proposal

A Proposal is a structured candidate change to canonical memory.

### Required fields

```yaml
id: prop-2026-03-29-001
type: revise_preference
target: core/preferences/communication.yaml#verbosity
reason: "Recent sessions suggest concise operational mode is preferred."
supporting_events:
  - evt-2026-03-29-010
  - evt-2026-03-29-011
confidence: 0.68
status: pending
privacy_scope: owner_private
```

### Recommended fields

```yaml
created_at: 2026-03-29T03:05:00Z
created_by: agent
impact_level: medium
requires_human_approval: true
question_candidate: "Do you still want concise answers during operational work?"
```

### Allowed `status` values

- `pending`
- `queued_for_curation`
- `approved`
- `rejected`
- `deferred`
- `applied`
- `expired`

### Allowed `type` examples

- `new_fact`
- `revise_fact`
- `revise_preference`
- `new_value`
- `revise_value`
- `identity_adjustment`
- `privacy_change`
- `supersede_memory`
- `deprecate_memory`
- `open_contradiction`

---

## 2.3 Canonical Memory Object

Canonical memory is stable, governed memory stored under the core.

### Minimum schema

```yaml
id: fact-001
kind: preference
statement: "User prefers concise operational replies unless requesting deep architecture work."
status: ratified
confidence: 0.92
source_type: human_reply
source_ref: proposals/2026-03/daily-curation-2026-03-29.yaml#q2
created_at: 2026-03-29T03:10:00Z
last_confirmed_at: 2026-03-29T03:10:00Z
confirmed_by: owner
evidence_count: 1
privacy_scope: owner_private
supersedes: []
tags: [communication, style]
```

### Required fields

- `id`
- `kind`
- `statement`
- `status`
- `confidence`
- `source_type`
- `source_ref`
- `created_at`
- `last_confirmed_at`
- `confirmed_by`
- `evidence_count`
- `privacy_scope`

### Recommended fields

- `supersedes`
- `superseded_by`
- `valid_from`
- `valid_to`
- `tags`
- `related_entities`
- `notes`

### Allowed `kind` families

- `fact`
- `preference`
- `constraint`
- `project`
- `relationship`
- `belief`
- `identity_trait`
- `style_rule`
- `value`
- `priority`

### Allowed `status` values

- `draft`
- `candidate`
- `ratified`
- `crystallized`
- `deprecated`
- `archived`
- `disputed`

---

## 2.4 Relationship Object

Relationships express structured links between entities.

```yaml
id: rel-001
from: user
relation: prefers
to: concise_answers
status: ratified
confidence: 0.91
valid_from: 2026-03-29
valid_to:
source_type: human_reply
source_ref: proposals/2026-03/daily-curation-2026-03-29.yaml#q2
privacy_scope: owner_private
```

### Common `relation` values

- `prefers`
- `works_on`
- `trusts`
- `avoids`
- `owns`
- `depends_on`
- `contradicts`
- `supersedes`
- `belongs_to`
- `cares_about`

---

## 2.5 Value Object

Values define priorities and behavioral guardrails.

```yaml
id: val-001
statement: "Privacy is more important than convenience."
status: ratified
confidence: 0.95
priority: high
source_type: human_reply
source_ref: proposals/2026-03/daily-curation-2026-03-29.yaml#q1
privacy_scope: owner_private
```

### Additional recommended fields

- `priority`
- `applies_to`
- `exceptions`
- `examples`

---

## 2.6 Identity Trait Object

Identity traits describe durable aspects of the agent's role or self-presentation.

```yaml
id: idt-001
statement: "The agent acts as the owner's long-term technical companion."
status: ratified
confidence: 0.90
source_type: human_reply
source_ref: proposals/2026-03/daily-curation-2026-03-29.yaml#q3
privacy_scope: owner_private
```

Identity traits MUST remain distinct from values.

---

## 2.7 Style Rule Object

Style rules govern tone and presentation rather than truth or values.

```yaml
id: sty-001
statement: "Use concise language for operational requests and expand only when asked."
status: ratified
confidence: 0.88
source_type: human_reply
source_ref: proposals/2026-03/daily-curation-2026-03-29.yaml#q3
privacy_scope: owner_private
```

---

## 2.8 Derived Artifact

Derived artifacts are generated outputs, not canonical truth.

Examples:

- `compiled/hot/session-pack.md`
- `compiled/bootstrap/MEMORY.md`
- `core/narrative/story.md`
- `core/digests/weekly/2026-W13.md`

### Recommended metadata

```yaml
id: drv-001
artifact_type: bootstrap_projection
created_at: 2026-03-29T03:20:00Z
derived_from:
  - core/ratified/facts.yaml
  - core/preferences/communication.yaml
  - core/identity/soul.yaml
intended_audience: owner_private_runtime
```

Derived artifacts MUST NOT be treated as canonical sources by default.

---

## 3. Shared Fields

The following fields are strongly recommended across most object classes.

### 3.1 Identity fields

- `id`
- `kind`
- `status`

### 3.2 Provenance fields

- `source_type`
- `source_ref`
- `created_at`
- `confirmed_by`
- `last_confirmed_at`
- `evidence_count`

### 3.3 Trust fields

- `confidence`
- `confidence_notes`

### 3.4 Privacy fields

- `privacy_scope`
- `audience_exceptions`

### 3.5 Temporal fields

- `valid_from`
- `valid_to`
- `supersedes`
- `superseded_by`

### 3.6 Discovery fields

- `tags`
- `related_entities`
- `project`

---

## 4. Scope Model

Every memory object MUST include a privacy scope.

### Minimum scopes

- `owner_private`
- `agent_operational`
- `project_private`
- `shareable`
- `public_safe`

### Scope rules

- scope escalation MUST NOT happen automatically
- projection MUST filter by scope
- sensitive objects SHOULD default to `owner_private`

---

## 5. Confidence Policy

Confidence is represented as a float from `0.00` to `1.00`.

### Suggested interpretation

- `0.00–0.29`: weak or highly uncertain
- `0.30–0.59`: tentative inference
- `0.60–0.79`: fairly strong
- `0.80–0.94`: human-confirmed or strongly corroborated
- `0.95–1.00`: crystallization candidate or crystallized

### Rules

- confidence MUST be explicit for canonical memory
- decay SHOULD be policy-driven
- crystallization MUST require more than a single casual signal

---

## 6. Supersession Model

When one memory replaces another, implementations SHOULD record both sides.

```yaml
id: fact-019
statement: "User prefers long-form answers in all contexts."
status: deprecated
superseded_by:
  - fact-041
```

```yaml
id: fact-041
statement: "User prefers concise operational answers unless asking for depth."
status: ratified
supersedes:
  - fact-019
```

Deletion SHOULD be avoided except for corrupted or illegal data.

---

## 7. Contradiction Model

Contradictions SHOULD be expressed explicitly.

```yaml
id: ctr-001
left: fact-041
right: fact-044
reason: "Both cannot be simultaneously active under the same scope."
status: open
opened_at: 2026-03-29T04:00:00Z
priority: high
requires_human_review: true
```

### Recommended contradiction statuses

- `open`
- `queued`
- `resolved`
- `dismissed`

---

## 8. Question and Ratification Model

Cristalina SHOULD support compact, traceable curation questions.

### Question object

```yaml
id: q-2026-03-29-02
type: factual_correction
question: "Do you still want concise operational answers?"
proposal_refs:
  - prop-2026-03-29-001
priority: medium
```

### Response object

```yaml
id: qr-2026-03-29-02
question_ref: q-2026-03-29-02
answer_type: accept
answer_text: "Yes, keep concise by default."
answered_at: 2026-03-29T05:00:00Z
answered_by: owner
```

### Allowed `answer_type`

- `accept`
- `reject`
- `edit`
- `defer`
- `uncertain`

---

## 9. Narrative Objects

Narrative artifacts may be free-form, but SHOULD still carry metadata.

Example frontmatter:

```yaml
---
artifact_type: narrative
source_class: derived
created_at: 2026-03-29T06:00:00Z
scope: owner_private
---
```

Narrative files MUST NOT be mistaken for ratified canonical objects.

---

## 10. Minimal Validation Rules

A compliant implementation SHOULD reject or flag:

- canonical objects missing provenance
- canonical objects missing scope
- invalid status values
- invalid confidence values
- illegal automatic scope escalation
- supersession references to missing objects
- contradiction records missing both sides

---

## 11. Recommended IDs

Implementations MAY choose any stable ID scheme, but SHOULD use readable prefixes:

- `evt-` for events
- `prop-` for proposals
- `fact-` for canonical facts
- `rel-` for relationships
- `val-` for values
- `idt-` for identity traits
- `sty-` for style rules
- `ctr-` for contradictions
- `drv-` for derived artifacts
- `q-` for curation questions
- `qr-` for curation responses

---

## 12. Final Constraint

The data model exists to enforce a hard distinction between:

- what was seen
- what was suggested
- what was approved
- what was projected

If an implementation collapses those layers, it is no longer faithfully implementing Cristalina.
