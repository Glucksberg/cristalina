import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolve } from "node:path";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { CristalinaStore } from "../../src/store/store.js";
import { FixedClock } from "../../src/clock/clock.js";
import { DeterministicIdGenerator } from "../../src/id/generator.js";
import { ingestProjectionDrift } from "../../src/adapter/writeback.js";

let root: string;
let store: CristalinaStore;

function seedOwnerEntity() {
  store.writeYaml("entities/registry.yaml", {
    items: [
      {
        id: "ent-owner",
        kind: "owner",
        name: "Owner",
        status: "active",
        privacy_scope: "owner_private",
      },
    ],
  });
}

beforeEach(() => {
  root = resolve(tmpdir(), `cristalina-test-${randomUUID()}`);
  mkdirSync(root, { recursive: true });
  store = new CristalinaStore({
    root,
    clock: new FixedClock("2026-03-29T12:00:00Z"),
    idGenerator: new DeterministicIdGenerator(),
  });
});

afterEach(() => {
  rmSync(root, { recursive: true });
});

describe("ingestProjectionDrift", () => {
  it("turns parsable projection drift into drift evidence plus proposals", async () => {
    seedOwnerEntity();

    const previous = `---
generated_by: cristalina-openclaw
---

# USER

## Interaction Preferences
- Use concise replies.
`;

    const current = `---
generated_by: cristalina-openclaw
---

# USER

## Interaction Preferences
- Use concise replies.
- Prefer explicit architecture tradeoffs during design work.
`;

    const result = await ingestProjectionDrift(store, {
      path: "compiled/bootstrap/USER.md",
      artifact_type: "bootstrap_user",
      projection_id: "drv-2026-03-29-001",
      audience: "owner_private",
      projection_profile: "deep",
      diff_summary: "manual edit",
      previous_content: previous,
      current_content: current,
    });

    expect(result.driftEvent.operation).toBe("LOG");
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].operation).toBe("PROPOSE");

    const snapshot = await store.read();
    expect(snapshot.events.some((event) => event.data.kind === "runtime_drift")).toBe(true);
    expect(snapshot.proposals).toHaveLength(1);
    expect(snapshot.proposals[0].data.candidate_payload).toMatchObject({
      kind: "preference",
      statement: "Prefer explicit architecture tradeoffs during design work.",
    });
  });

  it("extracts a revise proposal when one parsable statement is replaced by another", async () => {
    seedOwnerEntity();

    store.appendYamlItem("core/ratified/facts.yaml", {
      id: "fact-001",
      kind: "preference",
      statement: "Use concise replies.",
      status: "ratified",
      confidence: 0.9,
      source_type: "human_reply",
      source_ref: "q-1",
      created_at: "2026-03-29T02:00:00Z",
      last_confirmed_at: "2026-03-29T02:00:00Z",
      confirmed_by: "owner",
      evidence_count: 1,
      privacy_scope: "owner_private",
    });

    const previous = `---
generated_by: cristalina-openclaw
---

# USER

## Interaction Preferences
- Use concise replies.
`;

    const current = `---
generated_by: cristalina-openclaw
---

# USER

## Interaction Preferences
- Prefer explicit architecture tradeoffs during design work.
`;

    const result = await ingestProjectionDrift(store, {
      path: "compiled/bootstrap/USER.md",
      artifact_type: "bootstrap_user",
      projection_id: "drv-2026-03-29-001",
      audience: "owner_private",
      projection_profile: "deep",
      diff_summary: "manual edit",
      previous_content: previous,
      current_content: current,
    });

    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].operation).toBe("PROPOSE");

    const snapshot = await store.read();
    expect(snapshot.proposals[0].data.operation).toBe("revise");
    expect(snapshot.proposals[0].data.target_ref).toMatchObject({ object_id: "fact-001" });
    expect(snapshot.proposals[0].data.candidate_payload).toMatchObject({
      statement: "Prefer explicit architecture tradeoffs during design work.",
    });
  });

  it("keeps ingest compatibility with legacy projection headings", async () => {
    seedOwnerEntity();

    const previous = `---
generated_by: cristalina-openclaw
---

# MEMORY

## Active Memory
- Existing stable fact.
`;

    const current = `---
generated_by: cristalina-openclaw
---

# MEMORY

## Active Memory
- Existing stable fact.
- Newly surfaced working fact.
`;

    const result = await ingestProjectionDrift(store, {
      path: "compiled/bootstrap/MEMORY.md",
      artifact_type: "bootstrap_memory",
      projection_id: "drv-2026-03-29-001",
      audience: "owner_private",
      projection_profile: "deep",
      diff_summary: "legacy heading edit",
      previous_content: previous,
      current_content: current,
    });

    expect(result.proposals).toHaveLength(1);
    const snapshot = await store.read();
    expect(snapshot.proposals[0].data.candidate_payload).toMatchObject({
      kind: "fact",
      statement: "Newly surfaced working fact.",
    });
  });

  it("preserves constraint semantics from tagged user model entries", async () => {
    seedOwnerEntity();

    const previous = `---
generated_by: cristalina-openclaw
---

# USER

## User Model
- [fact] The user likes concise summaries.
`;

    const current = `---
generated_by: cristalina-openclaw
---

# USER

## User Model
- [fact] The user likes concise summaries.
- [constraint] Avoid late-night deploy recommendations.
`;

    await ingestProjectionDrift(store, {
      path: "compiled/bootstrap/USER.md",
      artifact_type: "bootstrap_user",
      projection_id: "drv-2026-03-29-002",
      audience: "owner_private",
      projection_profile: "deep",
      diff_summary: "tagged user model edit",
      previous_content: previous,
      current_content: current,
    });

    const snapshot = await store.read();
    expect(snapshot.proposals).toHaveLength(1);
    expect(snapshot.proposals[0].data.candidate_payload).toMatchObject({
      kind: "constraint",
      statement: "Avoid late-night deploy recommendations.",
    });
  });

  it("preserves belief semantics from tagged working set entries", async () => {
    seedOwnerEntity();

    const previous = `---
generated_by: cristalina-openclaw
---

# MEMORY

## Working Set
- [fact] The architecture doc is in progress.
`;

    const current = `---
generated_by: cristalina-openclaw
---

# MEMORY

## Working Set
- [fact] The architecture doc is in progress.
- [belief] The current retrieval design still needs real-world pressure.
`;

    await ingestProjectionDrift(store, {
      path: "compiled/bootstrap/MEMORY.md",
      artifact_type: "bootstrap_memory",
      projection_id: "drv-2026-03-29-003",
      audience: "owner_private",
      projection_profile: "deep",
      diff_summary: "tagged working set edit",
      previous_content: previous,
      current_content: current,
    });

    const snapshot = await store.read();
    expect(snapshot.proposals).toHaveLength(1);
    expect(snapshot.proposals[0].data.candidate_payload).toMatchObject({
      kind: "belief",
      statement: "The current retrieval design still needs real-world pressure.",
    });
  });

  it("treats open loops as tagged constraints rather than generic facts", async () => {
    seedOwnerEntity();

    const previous = `---
generated_by: cristalina-openclaw
---

# MEMORY

## Open Loops
`;

    const current = `---
generated_by: cristalina-openclaw
---

# MEMORY

## Open Loops
- Confirm whether live portal updates should surface failed ingests.
`;

    await ingestProjectionDrift(store, {
      path: "compiled/bootstrap/MEMORY.md",
      artifact_type: "bootstrap_memory",
      projection_id: "drv-2026-03-29-004",
      audience: "owner_private",
      projection_profile: "deep",
      diff_summary: "open loop edit",
      previous_content: previous,
      current_content: current,
    });

    const snapshot = await store.read();
    expect(snapshot.proposals).toHaveLength(1);
    expect(snapshot.proposals[0].data.candidate_payload).toMatchObject({
      kind: "constraint",
      statement: "Confirm whether live portal updates should surface failed ingests.",
      tags: ["open_loop"],
    });
  });

  it("uses project proposal types for active project drift", async () => {
    seedOwnerEntity();

    const previous = `---
generated_by: cristalina-openclaw
---

# MEMORY

## Active Projects
- Cristalina v3 runtime cognition pass.
`;

    const current = `---
generated_by: cristalina-openclaw
---

# MEMORY

## Active Projects
- Cristalina v3 runtime cognition hardening pass.
`;

    store.appendYamlItem("core/ratified/facts.yaml", {
      id: "proj-001",
      kind: "project",
      statement: "Cristalina v3 runtime cognition pass.",
      status: "ratified",
      confidence: 0.93,
      source_type: "human_reply",
      source_ref: "q-2",
      created_at: "2026-03-29T02:00:00Z",
      last_confirmed_at: "2026-03-29T02:00:00Z",
      confirmed_by: "owner",
      evidence_count: 1,
      privacy_scope: "owner_private",
    });

    await ingestProjectionDrift(store, {
      path: "compiled/bootstrap/MEMORY.md",
      artifact_type: "bootstrap_memory",
      projection_id: "drv-2026-03-29-005",
      audience: "owner_private",
      projection_profile: "deep",
      diff_summary: "project edit",
      previous_content: previous,
      current_content: current,
    });

    const snapshot = await store.read();
    expect(snapshot.proposals).toHaveLength(1);
    expect(snapshot.proposals[0].data.type).toBe("revise_project");
    expect(snapshot.proposals[0].data.operation).toBe("revise");
    expect(snapshot.proposals[0].data.candidate_payload).toMatchObject({
      kind: "project",
      statement: "Cristalina v3 runtime cognition hardening pass.",
    });
  });

  it("pairs multiple similar edits as revisions instead of create-plus-deprecate churn", async () => {
    seedOwnerEntity();

    store.appendYamlItem("core/ratified/facts.yaml", {
      id: "fact-101",
      kind: "fact",
      statement: "Document the runtime cognition flow.",
      status: "ratified",
      confidence: 0.9,
      source_type: "human_reply",
      source_ref: "q-3",
      created_at: "2026-03-29T02:00:00Z",
      last_confirmed_at: "2026-03-29T02:00:00Z",
      confirmed_by: "owner",
      evidence_count: 1,
      privacy_scope: "owner_private",
    });

    store.appendYamlItem("core/ratified/facts.yaml", {
      id: "fact-102",
      kind: "fact",
      statement: "Stress-test writeback against mixed memory edits.",
      status: "ratified",
      confidence: 0.9,
      source_type: "human_reply",
      source_ref: "q-4",
      created_at: "2026-03-29T02:00:00Z",
      last_confirmed_at: "2026-03-29T02:00:00Z",
      confirmed_by: "owner",
      evidence_count: 1,
      privacy_scope: "owner_private",
    });

    const previous = `---
generated_by: cristalina-openclaw
---

# MEMORY

## Working Set
- [fact] Document the runtime cognition flow.
- [fact] Stress-test writeback against mixed memory edits.
`;

    const current = `---
generated_by: cristalina-openclaw
---

# MEMORY

## Working Set
- [fact] Document the runtime cognition round-trip flow.
- [fact] Stress-test writeback against mixed semantic edits.
`;

    await ingestProjectionDrift(store, {
      path: "compiled/bootstrap/MEMORY.md",
      artifact_type: "bootstrap_memory",
      projection_id: "drv-2026-03-29-006",
      audience: "owner_private",
      projection_profile: "deep",
      diff_summary: "multi-edit refine",
      previous_content: previous,
      current_content: current,
    });

    const snapshot = await store.read();
    expect(snapshot.proposals).toHaveLength(2);
    expect(snapshot.proposals.every((proposal) => proposal.data.operation === "revise")).toBe(true);
    expect(snapshot.proposals.every((proposal) => proposal.data.type === "revise_fact")).toBe(true);
    expect(snapshot.proposals.map((proposal) => proposal.data.target_ref.object_id).sort()).toEqual([
      "fact-101",
      "fact-102",
    ]);
  });
});
