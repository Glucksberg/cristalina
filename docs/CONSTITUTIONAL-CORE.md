# Cristalina
## Constitutional Core
### Draft V4 Direction

**Status:** Proposed  
**Purpose:** Define a supra-canonical constitutional layer for agent behavior  
**Scope:** Prompt, runtime, memory, and audit integration

---

## 1. Why This Exists

Cristalina v3 already governs memory well:

- events are not facts
- proposals are not canon
- ratification is explicit
- policy shapes visibility and authority
- runtime drift becomes evidence before truth

That is necessary, but it is not enough for an agent that must remain morally stable.

If the agent must:

- prioritize human well-being above convenience
- never casually drift into harmful obedience
- retain a fixed benevolent orientation across contexts

then those constraints cannot live only as:

- ratified values
- mutable policy
- prompt suggestions

They must live in a constitutional layer above ordinary governance.

---

## 2. Core Claim

Cristalina should eventually distinguish four levels of normative force:

1. **Prompt guidance**
2. **Operational policy**
3. **Canonical memory**
4. **Constitutional invariants**

The constitutional layer outranks all other layers.

Memory may evolve.
Policy may evolve.
Projection may evolve.
The constitution does not evolve through ordinary proposals.

---

## 3. Constitutional Thesis

The target agent model is not one that debates whether it should protect humans.

It is one that already stands on that priority by default.

For this direction, the constitutional core should encode something equivalent to:

1. the agent must not knowingly cause unjustified harm to human beings
2. the agent may obey human instructions only where that obedience does not violate the first rule
3. the agent may preserve its own continuity only where that preservation does not violate the first or second rule

These are not ordinary values.
They are execution-ordering invariants.

---

## 4. Three-Layer Implementation

Cristalina should implement this constitutional direction in three simultaneous layers.

### 4.1 Prompt Constitution

Every runtime bootstrap or system prompt should carry a short constitutional header.

This layer:

- reinforces priority ordering
- stabilizes behavior under normal prompting
- keeps the constitutional frame present in every session

This layer is necessary, but insufficient by itself.

### 4.2 Runtime Constitutional Gate

Before any sensitive action, the runtime should evaluate:

- possible human harm
- direct vs indirect harm
- coercive or manipulative obedience
- privacy or exposure harm
- whether the requested act violates the constitutional order

If the action fails constitutional review, execution must halt or route to higher review.

This gate must sit above ordinary operation planning.

### 4.3 Constitutional Memory Layer

Cristalina should persist the constitution as a dedicated, non-ordinary layer.

Suggested location:

```text
.cristalina/
  constitution/
    charter.yaml
    runtime-gates.yaml
    audit-policy.yaml
```

This layer is not ratified through normal proposal flow.

Ordinary proposals MUST NOT:

- revise it
- supersede it
- deprecate it
- narrow it indirectly through policy edits

---

## 5. Separation from Existing Policy

Cristalina v3 policy already governs:

- audience visibility
- promotion risk
- authority context
- projection shaping

That is not the same thing as constitutional force.

Policy answers:

- who can see this?
- who can write this?
- how risky is this?

Constitution answers:

- may the agent do this at all?
- may the agent obey this request?
- may the agent preserve itself in this circumstance?

Policy is configurable.
Constitution is binding.

---

## 6. Binding Properties

The constitutional layer should have all of the following properties.

### 6.1 Immutable under ordinary governance

The following are forbidden through standard `PROPOSE` + ratification flow:

- editing constitutional axioms
- weakening constitutional gates
- downgrading human-protection priority

### 6.2 Present in every runtime bootstrap

The runtime should never operate without a constitutional header or equivalent compiled reminder.

### 6.3 Executable before memory interpretation

Constitutional review should happen before the agent treats a request as a normal task.

### 6.4 Auditable

When constitutional gates fire, the system should emit explicit audit artifacts:

- `constitution_block`
- `constitution_warning`
- `constitution_override_attempt`

### 6.5 Portable

The constitutional layer must survive runtime changes the same way Cristalina memory does.

---

## 7. Proposed Object Model

Cristalina does not need to implement this fully yet, but the future shape should likely include:

### 7.1 Constitutional Charter

```yaml
id: cst-charter-default
kind: constitutional_charter
status: active
priority_order:
  - protect_humans
  - obey_humans_when_safe
  - preserve_self_when_safe
axioms:
  - code: protect_humans
    statement: "Do not knowingly cause unjustified harm to human beings."
  - code: obey_humans_when_safe
    statement: "Obey legitimate human instruction unless doing so violates protect_humans."
  - code: preserve_self_when_safe
    statement: "Preserve agent continuity unless doing so violates a higher constitutional rule."
```

### 7.2 Runtime Gate Rules

```yaml
id: cst-gates-default
kind: constitutional_gate_policy
status: active
checks:
  - human_harm
  - coercive_obedience
  - privacy_exposure
  - unsafe_self_preservation
block_on:
  - human_harm
  - coercive_obedience
```

### 7.3 Constitutional Audit Policy

```yaml
id: cst-audit-default
kind: constitutional_audit_policy
status: active
emit_events:
  - constitution_block
  - constitution_warning
  - constitution_override_attempt
```

---

## 8. Execution Order

The target execution stack should become:

```text
prompt constitution
-> constitutional gate
-> authority and audience policy
-> proposal / operation planning
-> canonical apply
-> projection
-> drift audit
```

That order matters.

If constitutional review comes after ordinary planning, it is too weak.

---

## 9. What This Means for Cristalina

If adopted, Cristalina stops being only a governed memory system.

It becomes:

- a governed memory system
- with a portable constitutional shell
- capable of carrying fixed benevolent priorities across runtimes

That is a major conceptual shift.

It is not required for v3 freeze.
It is a credible v4 direction.

---

## 10. Immediate Recommended Work

If this direction is pursued, the next repository steps should be:

1. add a constitutional architecture phase to the roadmap
2. define a minimal constitutional object model
3. add a non-editable constitutional namespace
4. add runtime constitutional preflight checks
5. thread constitutional audit events into the existing event stream

---

## 11. Final Statement

Cristalina v3 governs memory.

The constitutional core would govern what kind of agent is allowed to remember, decide, and act in the first place.
