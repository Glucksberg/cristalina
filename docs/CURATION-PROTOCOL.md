# Cristalina
## Human Curation Protocol
### Version 1.0-draft

This document defines how Cristalina involves the owner in the governance of canonical memory.

---

## 1. Purpose

Cristalina uses human curation to reduce overreliance on model obedience while preserving the model's strength at association and proposal.

The curation protocol exists to answer a single question:

> What should become stable memory, and under what interpretation?

---

## 2. Core Principle

The agent may:

- observe
- summarize
- infer
- propose
- ask

The owner decides what becomes stable truth in sensitive and durable areas.

---

## 3. Daily Curation Packet

Cristalina SHOULD generate a daily curation packet.

Default target:

- up to 3 questions per day

Adaptive target:

- 1 on low-activity days
- 3 on normal days
- 5 or more during periods of heavy change, contradiction, or uncertainty

A good implementation should optimize for **high leverage**, not volume.

---

## 4. Selection Policy

Questions SHOULD be selected based on expected value.

Priority factors include:

- high uncertainty
- high operational impact
- contradiction
- possible drift in identity or style
- active project relevance
- privacy sensitivity
- repeated signals across sessions

Low-value or easily inferable noise SHOULD be filtered out.

---

## 5. Question Classes

## 5.1 Factual Correction

Used when the system suspects a durable fact or preference may be inaccurate, outdated, or incomplete.

Examples:

- "Does this still hold true?"
- "Has this changed recently?"
- "Am I understanding this correctly?"

## 5.2 Value Arbitration

Used when tradeoffs require explicit ordering.

Examples:

- "In this context, should I prioritize speed or depth?"
- "Is privacy still more important than convenience here?"

## 5.3 Identity and Style Calibration

Used when behavioral drift may need confirmation.

Examples:

- "Am I becoming too verbose?"
- "Do you want me to keep mirroring your conversational style?"

## 5.4 Contradiction Resolution

Used when two memories cannot remain active under the same conditions.

Examples:

- "I have two conflicting preferences recorded. Which one should stay active?"

## 5.5 Privacy Clarification

Used when scope is unclear or risk is high.

Examples:

- "Should this remain private to you, or can it be shared in project contexts?"

---

## 6. Question Construction Rules

A curation question SHOULD be:

- compact
- specific
- attributable to one or more proposals
- framed in natural language
- answerable with low effort

A curation question SHOULD NOT:

- contain multiple hidden decisions
- smuggle in a preferred answer
- reinterpret the owner's prior words silently
- demand long writing by default

---

## 7. Allowed Answer Types

The owner SHOULD be able to respond using one of these modes:

- `accept`
- `reject`
- `edit`
- `defer`
- `uncertain`

Implementations MAY support richer free-text replies, but SHOULD preserve these canonical forms.

---

## 8. Ratification Semantics

## 8.1 Accept
The proposal becomes approved for application.

## 8.2 Reject
The proposal is denied and should not be silently retried unchanged.

## 8.3 Edit
The human modifies the proposed memory. The edited meaning is authoritative.

## 8.4 Defer
No canonical change yet. The proposal remains pending or queued.

## 8.5 Uncertain
No stable conclusion yet. The system may keep the proposal open or seek better evidence later.

---

## 9. Faithful Reproduction Rule

When applying a human response, Cristalina MUST reproduce the owner's meaning faithfully.

The system MAY:

- normalize formatting
- structure fields
- split one answer into multiple canonical objects if semantics demand it

The system MUST NOT:

- silently broaden scope
- strengthen a weak answer beyond what was said
- reinterpret ambiguity as certainty
- convert a tentative answer into a crystallized truth

---

## 10. Ratification Pipeline

Recommended flow:

```text
events -> proposals -> question selection -> owner response -> ratification -> canonical update -> audit log
```

### Expanded flow

```text
signal detection
  -> proposal creation
  -> curation queue scoring
  -> question generation
  -> owner response
  -> semantic normalization
  -> canonical operation (CONFIRM/REVISE/SUPERSEDE/etc.)
  -> audit entry
  -> projection refresh
```

---

## 11. High-Risk Domains

The following categories SHOULD require explicit human approval before canonical update:

- values
- privacy policies
- identity traits
- public-facing tone rules
- sensitive preferences
- external sharing permissions

For these, automatic promotion is forbidden.

---

## 12. Daily Packet Format

Example:

```yaml
packet_id: dcp-2026-03-29
created_at: 2026-03-29T20:00:00Z
owner: markus
question_count: 3
questions:
  - id: q-01
    type: factual_correction
    question: "Do you still want concise operational answers by default?"
    proposal_refs: [prop-2026-03-29-001]
    priority: medium
  - id: q-02
    type: value_arbitration
    question: "For project coordination, should I optimize more for speed or depth?"
    proposal_refs: [prop-2026-03-29-006]
    priority: high
  - id: q-03
    type: identity_style_calibration
    question: "I'm mirroring your conversational style more lately. Keep that, or dial it back?"
    proposal_refs: [prop-2026-03-29-011]
    priority: medium
```

---

## 13. Response Format

Example:

```yaml
packet_id: dcp-2026-03-29
responses:
  - question_ref: q-01
    answer_type: accept
    answer_text: "Yes. Keep concise unless I ask for depth."
  - question_ref: q-02
    answer_type: edit
    answer_text: "Default to speed, but switch to depth for architectural decisions."
  - question_ref: q-03
    answer_type: edit
    answer_text: "Keep some of my tone, but don't get too wordy."
answered_at: 2026-03-29T22:10:00Z
answered_by: owner
```

---

## 14. Adaptive Intensity

Cristalina MAY adjust how many questions it asks.

### Suggested policy

- 0 to 1 questions when there is no meaningful uncertainty
- 3 questions as the standard target
- 5 or more only when strong evidence suggests unusually high value

Implementations SHOULD avoid becoming annoying.

---

## 15. Asking the Right Questions

A good curation protocol does not ask about everything.

It asks when:

- the answer will unlock better future behavior
- the answer will resolve conflict
- the answer will stabilize identity, values, or preferences
- the system is about to make a risky assumption

This protocol is about leverage, not bureaucracy.

---

## 16. Auditing

Each curation cycle SHOULD log:

- packet creation time
- included questions
- linked proposals
- owner responses
- applied canonical operations
- resulting object IDs

A later reviewer SHOULD be able to answer:

- why was this question asked?
- what proposal triggered it?
- what did the owner answer?
- how did the core change afterward?

---

## 17. Failure Modes

The curation protocol SHOULD defend against:

- vague compound questions
- accidental scope escalation
- missing proposal linkage
- silent reinterpretation of the answer
- auto-confirmation without explicit approval
- repeated pestering on low-value topics

---

## 18. Example Canonical Application

### Proposal

```yaml
id: prop-2026-03-29-011
type: identity_adjustment
reason: "The agent increasingly mirrors the owner's long-form style."
status: pending
```

### Question

"I'm mirroring your style more lately. Keep that, or dial it back?"

### Human answer

"Keep some of it, but don't get too wordy."

### Canonical result

```yaml
id: sty-019
statement: "Mirror some of the owner's conversational warmth, but keep operational replies concise."
status: ratified
confidence: 0.89
source_type: human_reply
source_ref: daily-curation-2026-03-29/q3
privacy_scope: owner_private
```

---

## 19. Final Statement

Cristalina uses human curation not to slow the agent down, but to give durable memory a trustworthy authority structure.

The model remains useful for association and proposal.
The owner remains authoritative for stable meaning.
