import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolve } from "node:path";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { CristalinaStore } from "../../src/store/store.js";
import { FixedClock } from "../../src/clock/clock.js";
import { DeterministicIdGenerator } from "../../src/id/generator.js";
import { executeOperation } from "../../src/operations/index.js";

let root: string;
let store: CristalinaStore;

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

/** Helper: seed a core object into the store */
function seedObject(data: Record<string, unknown>) {
  store.appendYamlItem(
    `core/ratified/facts.yaml`,
    data,
  );
}

describe("CONFIRM", () => {
  it("increases confidence and updates confirmed_by", async () => {
    seedObject({ id: "fact-test-001", kind: "preference", statement: "test", status: "ratified", confidence: 0.6, evidence_count: 1, privacy_scope: "owner_private" });

    const result = await executeOperation(store, {
      op: "CONFIRM", targetId: "fact-test-001", confirmedBy: "owner",
    });

    expect(result.operation).toBe("CONFIRM");
    const snapshot = await store.read();
    const obj = snapshot.coreObjects.find((o) => o.data.id === "fact-test-001");
    expect(obj!.data.confidence).toBe(0.7);
    expect(obj!.data.confirmed_by).toBe("owner");
    expect(obj!.data.evidence_count).toBe(2);
  });

  it("throws for non-existent target", async () => {
    await expect(
      executeOperation(store, { op: "CONFIRM", targetId: "nope-999", confirmedBy: "owner" }),
    ).rejects.toThrow("Object not found");
  });
});

describe("CREATE", () => {
  it("creates a new canonical object", async () => {
    const result = await executeOperation(store, {
      op: "CREATE",
      kind: "preference",
      statement: "Use concise answers during operational work.",
      source_type: "human_reply",
      source_ref: "curation/q-001",
      confirmedBy: "owner",
      confidence: 0.92,
      privacy_scope: "owner_private",
      tags: ["communication"],
      authorized: true,
    });

    expect(result.operation).toBe("CREATE");
    expect(result.produced[0]).toMatch(/^fact-test-/);

    const snapshot = await store.read();
    const created = snapshot.coreObjects.find((obj) => obj.data.id === result.produced[0]);
    expect(created).toBeTruthy();
    expect(created!.data.statement).toBe("Use concise answers during operational work.");
    expect(created!.data.confirmed_by).toBe("owner");
  });
});

describe("REVISE", () => {
  it("updates the statement", async () => {
    seedObject({ id: "fact-test-001", kind: "preference", statement: "old", status: "ratified", confidence: 0.8, privacy_scope: "owner_private" });

    await executeOperation(store, {
      op: "REVISE", targetId: "fact-test-001", newStatement: "revised statement",
      reason: "user corrected", source_type: "human_reply", source_ref: "q-001", confirmedBy: "owner",
    });

    const snapshot = await store.read();
    const obj = snapshot.coreObjects.find((o) => o.data.id === "fact-test-001");
    expect(obj!.data.statement).toBe("revised statement");
    expect(obj!.data.source_type).toBe("human_reply");
  });
});

describe("EXTEND", () => {
  it("adds evidence and bumps confidence", async () => {
    seedObject({ id: "fact-test-001", kind: "fact", statement: "test", status: "ratified", confidence: 0.7, evidence_count: 2, privacy_scope: "owner_private" });

    await executeOperation(store, {
      op: "EXTEND", targetId: "fact-test-001", additionalEvidence: ["evt-001", "evt-002"],
    });

    const snapshot = await store.read();
    const obj = snapshot.coreObjects.find((o) => o.data.id === "fact-test-001");
    expect(obj!.data.evidence_count).toBe(4);
    expect((obj!.data.confidence as number)).toBeGreaterThan(0.7);
  });
});

describe("CONTRADICT", () => {
  it("creates a contradiction record", async () => {
    seedObject({ id: "fact-test-001", kind: "fact", statement: "A is true", status: "ratified", confidence: 0.8, privacy_scope: "owner_private" });
    seedObject({ id: "fact-test-002", kind: "fact", statement: "A is false", status: "ratified", confidence: 0.7, privacy_scope: "owner_private" });

    const result = await executeOperation(store, {
      op: "CONTRADICT", leftId: "fact-test-001", rightId: "fact-test-002",
      reason: "Conflicting claims about A", priority: "high",
    });

    expect(result.produced[0]).toBe("ctr-test-001");
    const snapshot = await store.read();
    expect(snapshot.contradictions).toHaveLength(1);
    expect(snapshot.contradictions[0].data.status).toBe("open");
  });
});

describe("SUPERSEDE", () => {
  it("deprecates old and creates new with bidirectional links", async () => {
    seedObject({ id: "fact-old-001", kind: "preference", statement: "old pref", status: "ratified", confidence: 0.8, privacy_scope: "owner_private" });

    const result = await executeOperation(store, {
      op: "SUPERSEDE", oldId: "fact-old-001", newStatement: "new pref",
      source_type: "human_reply", source_ref: "q-002", confirmedBy: "owner",
      confidence: 0.92, privacy_scope: "owner_private",
    });

    const newId = result.produced[0];
    expect(newId).toMatch(/^fact-test-/);

    const snapshot = await store.read();
    const old = snapshot.coreObjects.find((o) => o.data.id === "fact-old-001");
    const newObj = snapshot.coreObjects.find((o) => o.data.id === newId);

    expect(old!.data.status).toBe("deprecated");
    expect((old!.data.superseded_by as string[])).toContain(newId);
    expect(newObj!.data.statement).toBe("new pref");
    expect((newObj!.data.supersedes as string[])).toContain("fact-old-001");
  });
});

describe("DEPRECATE", () => {
  it("sets status to deprecated", async () => {
    seedObject({ id: "fact-test-001", kind: "fact", statement: "test", status: "ratified", confidence: 0.8, privacy_scope: "owner_private" });

    await executeOperation(store, {
      op: "DEPRECATE", targetId: "fact-test-001", reason: "no longer relevant",
    });

    const snapshot = await store.read();
    const obj = snapshot.coreObjects.find((o) => o.data.id === "fact-test-001");
    expect(obj!.data.status).toBe("deprecated");
  });
});

describe("CRYSTALLIZE", () => {
  it("crystallizes high-confidence ratified object", async () => {
    seedObject({ id: "fact-test-001", kind: "fact", statement: "test", status: "ratified", confidence: 0.97, privacy_scope: "owner_private" });

    await executeOperation(store, { op: "CRYSTALLIZE", targetId: "fact-test-001" });

    const snapshot = await store.read();
    const obj = snapshot.coreObjects.find((o) => o.data.id === "fact-test-001");
    expect(obj!.data.status).toBe("crystallized");
  });

  it("rejects low confidence", async () => {
    seedObject({ id: "fact-test-001", kind: "fact", statement: "test", status: "ratified", confidence: 0.5, privacy_scope: "owner_private" });

    await expect(
      executeOperation(store, { op: "CRYSTALLIZE", targetId: "fact-test-001" }),
    ).rejects.toThrow("confidence 0.5 < 0.95");
  });

  it("rejects non-ratified status", async () => {
    seedObject({ id: "fact-test-001", kind: "fact", statement: "test", status: "draft", confidence: 0.97, privacy_scope: "owner_private" });

    await expect(
      executeOperation(store, { op: "CRYSTALLIZE", targetId: "fact-test-001" }),
    ).rejects.toThrow('must be "ratified"');
  });
});

describe("ARCHIVE", () => {
  it("archives a deprecated object", async () => {
    seedObject({ id: "fact-test-001", kind: "fact", statement: "test", status: "deprecated", confidence: 0.5, privacy_scope: "owner_private" });

    await executeOperation(store, { op: "ARCHIVE", targetId: "fact-test-001", reason: "cleanup" });

    const snapshot = await store.read();
    const obj = snapshot.coreObjects.find((o) => o.data.id === "fact-test-001");
    expect(obj!.data.status).toBe("archived");
  });

  it("rejects archiving already-archived object", async () => {
    seedObject({ id: "fact-test-001", kind: "fact", statement: "test", status: "archived", confidence: 0.5, privacy_scope: "owner_private" });

    await expect(
      executeOperation(store, { op: "ARCHIVE", targetId: "fact-test-001" }),
    ).rejects.toThrow("already archived");
  });

  it("rejects archiving crystallized object", async () => {
    seedObject({ id: "fact-test-001", kind: "fact", statement: "test", status: "crystallized", confidence: 0.98, privacy_scope: "owner_private" });

    await expect(
      executeOperation(store, { op: "ARCHIVE", targetId: "fact-test-001" }),
    ).rejects.toThrow("supersede it first");
  });
});

// === Review fix tests ===

describe("Authority enforcement (B3)", () => {
  function seedValueObject(id: string) {
    store.appendYamlItem("core/values/values.yaml", {
      id, kind: "value", statement: "test value", status: "ratified", confidence: 0.9, privacy_scope: "owner_private",
      source_type: "human_reply", source_ref: "test", evidence_count: 1,
    });
  }

  it("CONFIRM on high-risk kind requires authorized", async () => {
    seedValueObject("val-auth-001");
    await expect(
      executeOperation(store, { op: "CONFIRM", targetId: "val-auth-001", confirmedBy: "agent" }),
    ).rejects.toThrow("requires authorization");
  });

  it("CONFIRM on high-risk kind succeeds with authorized: true", async () => {
    seedValueObject("val-auth-001");
    const result = await executeOperation(store, {
      op: "CONFIRM", targetId: "val-auth-001", confirmedBy: "owner", authorized: true,
    });
    expect(result.operation).toBe("CONFIRM");
  });

  it("REVISE on high-risk kind requires authorized", async () => {
    seedValueObject("val-auth-001");
    await expect(
      executeOperation(store, {
        op: "REVISE", targetId: "val-auth-001", newStatement: "new",
        reason: "test", source_type: "human_reply", source_ref: "q-1", confirmedBy: "owner",
      }),
    ).rejects.toThrow("requires authorization");
  });

  it("DEPRECATE on high-risk kind requires authorized", async () => {
    seedValueObject("val-auth-001");
    await expect(
      executeOperation(store, { op: "DEPRECATE", targetId: "val-auth-001", reason: "test" }),
    ).rejects.toThrow("requires authorization");
  });
});

describe("State transition guards (C3+C4)", () => {
  it("REVISE rejects archived object", async () => {
    seedObject({ id: "fact-test-001", kind: "fact", statement: "old", status: "archived", confidence: 0.5, privacy_scope: "owner_private" });
    await expect(
      executeOperation(store, {
        op: "REVISE", targetId: "fact-test-001", newStatement: "new",
        reason: "test", source_type: "human_reply", source_ref: "q-1", confirmedBy: "owner",
      }),
    ).rejects.toThrow("Cannot revise archived");
  });

  it("REVISE rejects crystallized object", async () => {
    seedObject({ id: "fact-test-001", kind: "fact", statement: "old", status: "crystallized", confidence: 0.98, privacy_scope: "owner_private" });
    await expect(
      executeOperation(store, {
        op: "REVISE", targetId: "fact-test-001", newStatement: "new",
        reason: "test", source_type: "human_reply", source_ref: "q-1", confirmedBy: "owner",
      }),
    ).rejects.toThrow("Cannot revise crystallized");
  });

  it("DEPRECATE rejects crystallized object", async () => {
    seedObject({ id: "fact-test-001", kind: "fact", statement: "test", status: "crystallized", confidence: 0.98, privacy_scope: "owner_private" });
    await expect(
      executeOperation(store, { op: "DEPRECATE", targetId: "fact-test-001", reason: "test" }),
    ).rejects.toThrow("Cannot deprecate crystallized");
  });
});

describe("CONTRADICT marks disputed (C2)", () => {
  it("sets both sides to disputed status", async () => {
    seedObject({ id: "fact-test-001", kind: "fact", statement: "A", status: "ratified", confidence: 0.8, privacy_scope: "owner_private" });
    seedObject({ id: "fact-test-002", kind: "fact", statement: "not A", status: "ratified", confidence: 0.7, privacy_scope: "owner_private" });

    await executeOperation(store, {
      op: "CONTRADICT", leftId: "fact-test-001", rightId: "fact-test-002", reason: "conflict",
    });

    const snapshot = await store.read();
    const left = snapshot.coreObjects.find((o) => o.data.id === "fact-test-001");
    const right = snapshot.coreObjects.find((o) => o.data.id === "fact-test-002");
    expect(left!.data.status).toBe("disputed");
    expect(right!.data.status).toBe("disputed");
  });
});

describe("SUPERSEDE ID prefix (B2)", () => {
  it("generates val- prefix when superseding a value", async () => {
    store.appendYamlItem("core/values/values.yaml", {
      id: "val-old-001", kind: "value", statement: "old value", status: "ratified", confidence: 0.8, privacy_scope: "owner_private",
    });
    const result = await executeOperation(store, {
      op: "SUPERSEDE", oldId: "val-old-001", newStatement: "new value",
      source_type: "human_reply", source_ref: "q-1", confirmedBy: "owner",
      confidence: 0.92, privacy_scope: "owner_private", authorized: true,
    });
    expect(result.produced[0]).toMatch(/^val-/);
  });
});
