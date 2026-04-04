# Cristalina
## Runtime Cognition Flow
### v3 Baseline

This document explains how the current repository models runtime thought, why some projection surfaces were refined, and how runtime writing should flow back into governed memory.

It is both a design note and a process record for the April 2026 runtime audit.

---

## 1. Why This Exists

Cristalina already had strong governance:

- events are not memory
- proposals are not truth
- bootstrap files are derived
- runtime drift does not automatically overwrite the core

The remaining issue was not governance. It was cognition shape.

Two projection files were still carrying too many jobs at once:

- `USER.md`
- `MEMORY.md`

That created unnecessary semantic mixing during runtime writing and drift ingest.

---

## 2. Problem Observed

### 2.1 `USER.md` was overloaded

Historically it mixed:

- interaction preferences
- durable user facts
- relationship assumptions
- operational reminders

That made runtime edits hard to classify cleanly.

### 2.2 `MEMORY.md` was overloaded

Historically it mixed:

- hot semantic memory
- values and identity echoes
- project state
- open loops

That made the file useful in practice, but cognitively muddy.

The result was predictable:

- the runtime wrote in markdown sections
- the ingest pipeline had to guess too much about what kind of memory a section represented

---

## 3. Runtime Mental Layers

Cristalina v3 should be read as a stack of mental layers:

1. `events/`
Raw observation and activity traces.

2. `proposals/`
Candidate meaning extracted from observation or runtime drift.

3. Canonical core under `core/`
Governed durable memory.

4. Compiled context under `compiled/`
Derived operational packs selected for usefulness.

5. Bootstrap projection
Small startup surfaces for runtime consumption and constrained editing.

6. Runtime drift
Evidence that a projection was edited, not automatic truth.

This means the runtime does not write memory directly. It writes against a projection surface that can become:

- drift evidence
- extracted proposals
- or nothing, if the edit is not machine-safe

---

## 4. Projection Responsibilities

The bootstrap files now have clearer jobs.

### 4.1 `SOUL.md`

Owns:

- identity traits
- self-presentation
- style rules

It is the runtime's self-model.

### 4.2 `VALUE.md`

Owns:

- values
- priorities
- explicit guardrails

It is the runtime's decision ordering surface.

### 4.3 `USER.md`

Owns:

- interaction preferences
- user model

It should answer:

- how should I interact?
- what stable user-specific facts constrain that interaction?

It should not try to become a general memory dump.

### 4.4 `MEMORY.md`

Owns:

- active projects
- working set
- open loops

It should answer:

- what is active right now?
- what semantic memory is operationally hot?
- what is unresolved?

It should not duplicate identity, values, or broad preference state unless absolutely necessary.

---

## 5. Current Repository Decisions

The repository baseline now treats projection sections as:

### `USER.md`

- `Interaction Preferences`
- `User Model`

### `MEMORY.md`

- `Active Projects`
- `Working Set`
- `Open Loops`

These names are intentional. They map better to runtime cognition than the older pairings:

- `Preferences`
- `Known Facts`
- `Active Memory`

Backward compatibility is preserved during ingest:

- `Preferences` is still understood as `Interaction Preferences`
- `Known Facts` is still understood as `User Model`
- `Active Memory` is still understood as `Working Set`

---

## 6. Ingest Consequences

The writeback contract now becomes easier to reason about:

- `Interaction Preferences` extracts `preference`
- `User Model` extracts `fact`, `constraint`, and `belief`
- `Active Projects` extracts `project`
- `Working Set` extracts `fact`, `constraint`, and `belief`
- `Open Loops` extracts `constraint` tagged as `open_loop`

This is still conservative.

The ingest pipeline remains:

1. detect drift
2. write a runtime drift event
3. extract only machine-safe proposal candidates
4. require governance before canonical apply

Unsupported semantics remain drift evidence only.

### 6.1 Typed runtime bullets

Mixed semantic sections now support typed bullets for round-trip fidelity:

```md
## User Model
- [fact] The user prefers concise summaries.
- [constraint] Avoid late-night deploy advice.

## Working Set
- [belief] The current retrieval design still needs field pressure.
```

If a heading supports mixed semantic kinds, the ingest path preserves the tag instead of flattening everything into `fact`.

### 6.2 Open loops are not contradictions

`Open Loops` now means unresolved constraints or follow-up obligations that are operationally live.

They are not the same thing as protocol contradictions.

The runtime may *display* contradictions in `MEMORY.md`, but the baseline writeback contract does not ingest the `Contradictions` section as machine-safe memory edits.

### 6.3 Revision pairing is now less brittle

The writeback path now tries to pair multiple same-kind edits as revisions when the semantic shape still looks like a refinement rather than a replacement.

That reduces proposal churn such as:

- one create proposal for the new line
- one deprecate proposal for the old line

when the runtime really performed a textual refinement of an existing memory.

---

## 7. What This Does Not Introduce Yet

This refinement does **not** add a brand-new persistent layer called `working_memory/`.

That is still future work if the repository later needs a first-class short-horizon cognitive layer between:

- event logging
- proposal generation

For v3, the repository keeps the architecture lean and improves cognition shape by clarifying projection roles first.

---

## 8. Portal Interpretation

The live portal should now be read with these meanings:

- `USER.md` is the runtime-facing user model and interaction policy surface
- `MEMORY.md` is the runtime-facing working set, not the whole long-term memory

This distinction matters because the portal is not just a viewer. It is also the clearest explanation of what the runtime is currently allowed to think with.

---

## 9. Process Record

This document came from a runtime audit that found one recurring issue:

- the system governed memory better than it separated kinds of runtime thought

The remediation strategy was:

1. keep the canonical model unchanged
2. reduce projection overload
3. preserve ingest compatibility with older headings
4. preserve semantic kinds through projection round-trip
5. distinguish open loops from contradictions
6. document the runtime cognition model explicitly

That keeps the repository stable while making later expansion safer.

---

## 10. Final Statement

Cristalina should not mimic human memory by becoming messy.

It should mimic human memory by separating:

- durable self-model
- durable values
- user model
- working set
- unresolved tension

and by making each of those surfaces legible enough to govern.
