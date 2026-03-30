import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolve } from "node:path";
import { mkdirSync, rmSync, readFileSync } from "node:fs";
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

describe("LOG operation", () => {
  it("creates an event in the correct JSONL file", async () => {
    const result = await executeOperation(store, {
      op: "LOG",
      kind: "heartbeat",
      summary: "Agent started session.",
      source_type: "runtime_observation",
      privacy_scope: "agent_operational",
      actor: "fluck",
    });

    expect(result.operation).toBe("LOG");
    expect(result.produced).toHaveLength(1);
    expect(result.produced[0]).toBe("evt-test-001");

    // Verify the event was written
    const snapshot = await store.read();
    expect(snapshot.events).toHaveLength(1);
    expect(snapshot.events[0].data.id).toBe("evt-test-001");
    expect(snapshot.events[0].data.kind).toBe("heartbeat");
    expect(snapshot.events[0].data.actor).toBe("fluck");
  });

  it("writes an audit entry", async () => {
    await executeOperation(store, {
      op: "LOG",
      kind: "observation",
      summary: "Observed user preference.",
      source_type: "agent_inference",
      privacy_scope: "owner_private",
    });

    const auditContent = readFileSync(resolve(root, "audits/changes.log"), "utf-8").trim();
    const entry = JSON.parse(auditContent);
    expect(entry.operation).toBe("LOG");
    expect(entry.produced).toContain("evt-test-001");
  });

  it("increments event IDs", async () => {
    await executeOperation(store, { op: "LOG", kind: "heartbeat", summary: "first", source_type: "runtime_observation", privacy_scope: "agent_operational" });
    await executeOperation(store, { op: "LOG", kind: "heartbeat", summary: "second", source_type: "runtime_observation", privacy_scope: "agent_operational" });

    const snapshot = await store.read();
    expect(snapshot.events).toHaveLength(2);
    expect(snapshot.events[0].data.id).toBe("evt-test-001");
    expect(snapshot.events[1].data.id).toBe("evt-test-002");
  });
});

describe("PROPOSE operation", () => {
  it("creates a proposal in pending-updates.yaml", async () => {
    const result = await executeOperation(store, {
      op: "PROPOSE",
      type: "revise_preference",
      target: "core/preferences/communication.yaml#verbosity",
      reason: "Recent sessions suggest concise mode is preferred.",
      supporting_events: ["evt-test-001"],
      confidence: 0.68,
      privacy_scope: "owner_private",
      impact_level: "medium",
    });

    expect(result.operation).toBe("PROPOSE");
    expect(result.produced[0]).toBe("prop-test-001");

    const snapshot = await store.read();
    expect(snapshot.proposals).toHaveLength(1);
    expect(snapshot.proposals[0].data.type).toBe("revise_preference");
    expect(snapshot.proposals[0].data.status).toBe("pending");
  });

  it("writes an audit entry", async () => {
    await executeOperation(store, {
      op: "PROPOSE",
      type: "new_fact",
      target: "core/ratified/facts.yaml",
      reason: "New observation.",
      supporting_events: [],
      confidence: 0.5,
      privacy_scope: "owner_private",
    });

    const auditContent = readFileSync(resolve(root, "audits/changes.log"), "utf-8").trim();
    const entry = JSON.parse(auditContent);
    expect(entry.operation).toBe("PROPOSE");
  });
});
