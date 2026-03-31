import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolve } from "node:path";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { CristalinaStore } from "../../src/store/store.js";
import { FixedClock } from "../../src/clock/clock.js";
import { DefaultIdGenerator, DeterministicIdGenerator } from "../../src/id/generator.js";
import { appendJsonlLine } from "../../src/store/writer.js";
import { generateCurationPacket } from "../../src/promotion/curation.js";
import { executeOperation } from "../../src/operations/index.js";

let root: string;
let store: CristalinaStore;

beforeEach(() => {
  root = resolve(tmpdir(), `cristalina-test-${randomUUID()}`);
  mkdirSync(root, { recursive: true });
  store = new CristalinaStore({
    root,
    clock: new FixedClock(),
    idGenerator: new DeterministicIdGenerator(),
  });
});

afterEach(() => {
  rmSync(root, { recursive: true });
});

describe("CristalinaStore", () => {
  it("reads an empty store", async () => {
    const snapshot = await store.read();
    expect(snapshot.events).toHaveLength(0);
    expect(snapshot.coreObjects).toHaveLength(0);
  });

  it("caches reads until invalidated", async () => {
    const a = await store.read();
    const b = await store.read();
    expect(a).toBe(b); // Same reference

    store.invalidate();
    const c = await store.read();
    expect(c).not.toBe(a); // New snapshot
  });

  it("appendJsonl writes and invalidates cache", async () => {
    await store.read(); // Prime cache
    store.appendJsonl("events/2026-03/2026-03-29.jsonl", {
      id: "evt-001", kind: "heartbeat", ts: "2026-03-29T12:00:00Z",
      summary: "test", source_type: "runtime_observation", privacy_scope: "agent_operational",
    });
    const snapshot = await store.read(); // Should re-read from disk
    expect(snapshot.events).toHaveLength(1);
    expect(snapshot.events[0].data.id).toBe("evt-001");
  });

  it("appendYamlItem writes and invalidates cache", async () => {
    store.appendYamlItem("core/ratified/facts.yaml", {
      id: "fact-001", kind: "fact", statement: "test",
    });
    const snapshot = await store.read();
    expect(snapshot.coreObjects).toHaveLength(1);
  });

  it("updateYamlItem patches existing item", async () => {
    store.appendYamlItem("core/ratified/facts.yaml", {
      id: "fact-001", confidence: 0.5,
    });
    const updated = store.updateYamlItem("core/ratified/facts.yaml", "fact-001", { confidence: 0.9 });
    expect(updated).toBe(true);
    const snapshot = await store.read();
    expect(snapshot.coreObjects[0].data.confidence).toBe(0.9);
  });

  it("findById locates objects across collections", async () => {
    store.appendJsonl("events/2026-03/2026-03-29.jsonl", { id: "evt-001", kind: "heartbeat", ts: "2026-03-29T12:00:00Z", summary: "t", source_type: "runtime_observation", privacy_scope: "agent_operational" });
    store.appendYamlItem("core/ratified/facts.yaml", { id: "fact-001", statement: "t" });
    store.writeYaml("proposals/2026-03/daily-curation-2026-03-29.yaml", {
      packet_id: "dcp-2026-03-29-001",
      created_at: "2026-03-29T12:00:00Z",
      owner: "owner",
      question_count: 0,
      questions: [],
    });

    const evt = await store.findById("evt-001");
    expect(evt).not.toBeNull();
    expect(evt!.data.kind).toBe("heartbeat");

    const fact = await store.findById("fact-001");
    expect(fact).not.toBeNull();

    const packet = await store.findById("dcp-2026-03-29-001");
    expect(packet).not.toBeNull();
    expect(packet!.data.packet_id).toBe("dcp-2026-03-29-001");

    const missing = await store.findById("nope-999");
    expect(missing).toBeNull();
  });

  it("seeds curation packet IDs from existing packet files", async () => {
    const seededStore = new CristalinaStore({
      root,
      clock: new FixedClock("2026-03-29T12:00:00Z"),
      idGenerator: new DefaultIdGenerator(new FixedClock("2026-03-29T12:00:00Z")),
    });

    seededStore.writeYaml("proposals/2026-03/daily-curation-2026-03-29.yaml", {
      packet_id: "dcp-2026-03-29-001",
      created_at: "2026-03-29T12:00:00Z",
      owner: "owner",
      question_count: 1,
      questions: [
        {
          id: "q-2026-03-29-001",
          type: "factual_correction",
          question: "Question?",
          proposal_refs: ["prop-2026-03-29-001"],
          priority: "medium",
        },
      ],
    });

    await executeOperation(seededStore, {
      op: "PROPOSE",
      type: "new_fact",
      operation: "create",
      target_ref: { kind: "fact", facet: "working_style" },
      candidate_payload: {
        kind: "fact",
        statement: "User prefers concise updates.",
        privacy_scope: "owner_private",
      },
      reason: "Test proposal",
      provenance: { supporting_events: [] },
      confidence: 0.7,
      privacy_scope: "owner_private",
    });

    const snapshot = await seededStore.read();
    const packet = generateCurationPacket(snapshot, seededStore.clock, seededStore.idGen);
    expect(packet).not.toBeNull();
    expect(packet!.data.packet_id).toBe("dcp-2026-03-29-002");
  });

  it("refresh forces a fresh read", async () => {
    const a = await store.read();
    // Manually write a file bypassing the store
    appendJsonlLine(root, "events/2026-03/2026-03-29.jsonl", { id: "evt-sneaky" });
    // Cached read won't see it
    const b = await store.read();
    expect(b.events).toHaveLength(0);
    // Refresh will
    const c = await store.refresh();
    expect(c.events).toHaveLength(1);
  });
});
