import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolve } from "node:path";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { CristalinaStore } from "../../src/store/store.js";
import { FixedClock } from "../../src/clock/clock.js";
import { DeterministicIdGenerator } from "../../src/id/generator.js";
import { generateCurationPacket } from "../../src/promotion/curation.js";
import { applyRatification } from "../../src/promotion/ratification.js";
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

describe("generateCurationPacket", () => {
  it("returns null for empty store", async () => {
    const snapshot = await store.read();
    const packet = generateCurationPacket(snapshot, store.clock, store.idGen);
    expect(packet).toBeNull();
  });

  it("generates a packet from pending proposals", async () => {
    await executeOperation(store, {
      op: "PROPOSE", type: "revise_preference", target: "core/preferences/communication.yaml",
      reason: "User seems to prefer concise answers.", supporting_events: ["evt-001"],
      confidence: 0.68, privacy_scope: "owner_private",
      question_candidate: "Do you prefer concise answers?",
    });
    await executeOperation(store, {
      op: "PROPOSE", type: "new_value", target: "core/values/values.yaml",
      reason: "Privacy is important.", supporting_events: ["evt-002"],
      confidence: 0.7, privacy_scope: "owner_private",
    });

    const snapshot = await store.read();
    const packet = generateCurationPacket(snapshot, store.clock, store.idGen);

    expect(packet).not.toBeNull();
    expect(packet!.questions.length).toBeGreaterThanOrEqual(1);
    expect(packet!.questions.length).toBeLessThanOrEqual(5);
    expect(packet!.data.packet_id).toMatch(/^dcp-/);
  });

  it("prioritizes high-risk proposals", async () => {
    await executeOperation(store, {
      op: "PROPOSE", type: "new_fact", target: "core/ratified/facts.yaml",
      reason: "Low risk fact.", supporting_events: [], confidence: 0.8,
      privacy_scope: "owner_private",
    });
    await executeOperation(store, {
      op: "PROPOSE", type: "new_value", target: "core/values/values.yaml",
      reason: "High risk value.", supporting_events: [], confidence: 0.5,
      privacy_scope: "owner_private", impact_level: "high",
    });

    const snapshot = await store.read();
    const packet = generateCurationPacket(snapshot, store.clock, store.idGen);

    // The value proposal should be first (higher score)
    expect(packet!.questions[0].type).toBe("value_arbitration");
  });
});

describe("applyRatification", () => {
  it("accept -> CONFIRM on target", async () => {
    // Seed a core object and a proposal targeting it
    store.appendYamlItem("core/ratified/facts.yaml", {
      id: "fact-seed-001", kind: "preference", statement: "Old pref",
      status: "ratified", confidence: 0.7, evidence_count: 1, privacy_scope: "owner_private",
    });

    const result = await applyRatification(store, {
      responses: [
        { question_ref: "q-001", answer_type: "accept", answer_text: "Yes, confirmed." },
      ],
      questionToProposal: new Map([["q-001", "prop-001"]]),
      questionToTarget: new Map([["q-001", "fact-seed-001"]]),
    });

    expect(result.applied).toHaveLength(1);
    expect(result.applied[0].operation).toBe("CONFIRM");

    const snapshot = await store.read();
    const obj = snapshot.coreObjects.find((o) => o.data.id === "fact-seed-001");
    expect(obj!.data.confirmed_by).toBe("owner");
  });

  it("edit -> REVISE on target", async () => {
    store.appendYamlItem("core/ratified/facts.yaml", {
      id: "fact-seed-001", kind: "preference", statement: "Old pref",
      status: "ratified", confidence: 0.7, privacy_scope: "owner_private",
    });

    const result = await applyRatification(store, {
      responses: [
        { question_ref: "q-001", answer_type: "edit", answer_text: "Actually, I prefer depth." },
      ],
      questionToProposal: new Map([["q-001", "prop-001"]]),
      questionToTarget: new Map([["q-001", "fact-seed-001"]]),
    });

    expect(result.applied).toHaveLength(1);
    expect(result.applied[0].operation).toBe("REVISE");

    const snapshot = await store.read();
    const obj = snapshot.coreObjects.find((o) => o.data.id === "fact-seed-001");
    expect(obj!.data.statement).toBe("Actually, I prefer depth.");
  });

  it("reject -> LOG event", async () => {
    const result = await applyRatification(store, {
      responses: [
        { question_ref: "q-001", answer_type: "reject", answer_text: "No, wrong." },
      ],
      questionToProposal: new Map([["q-001", "prop-001"]]),
      questionToTarget: new Map(),
    });

    expect(result.applied).toHaveLength(1);
    expect(result.applied[0].operation).toBe("LOG");
  });

  it("skips unknown question refs", async () => {
    const result = await applyRatification(store, {
      responses: [
        { question_ref: "q-unknown", answer_type: "accept", answer_text: "ok" },
      ],
      questionToProposal: new Map(),
      questionToTarget: new Map(),
    });

    expect(result.applied).toHaveLength(0);
    expect(result.skipped).toContain("q-unknown");
  });
});
