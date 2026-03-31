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
      op: "PROPOSE",
      type: "revise_preference",
      operation: "supersede",
      target_ref: {
        object_id: "fact-pref-001",
        kind: "preference",
        facet: "communication_style",
      },
      candidate_payload: {
        kind: "preference",
        statement: "Use concise answers during operational work.",
        privacy_scope: "owner_private",
        tags: ["communication", "style"],
      },
      reason: "User seems to prefer concise answers.",
      provenance: {
        supporting_events: ["evt-001"],
      },
      confidence: 0.68,
      privacy_scope: "owner_private",
      risk: {
        level: "medium",
        requires_human_approval: true,
      },
    });
    await executeOperation(store, {
      op: "PROPOSE",
      type: "new_value",
      operation: "create",
      target_ref: {
        kind: "value",
        facet: "privacy",
      },
      candidate_payload: {
        kind: "value",
        statement: "Privacy should be treated as a first-order concern.",
        privacy_scope: "owner_private",
      },
      reason: "Privacy is important.",
      provenance: {
        supporting_events: ["evt-002"],
      },
      confidence: 0.7,
      privacy_scope: "owner_private",
      risk: {
        level: "high",
        requires_human_approval: true,
      },
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
      op: "PROPOSE",
      type: "new_fact",
      operation: "create",
      target_ref: { kind: "fact", facet: "working_style" },
      candidate_payload: {
        kind: "fact",
        statement: "Low risk fact.",
        privacy_scope: "owner_private",
      },
      reason: "Low risk fact.",
      provenance: { supporting_events: [] },
      confidence: 0.8,
      privacy_scope: "owner_private",
    });
    await executeOperation(store, {
      op: "PROPOSE",
      type: "new_value",
      operation: "create",
      target_ref: { kind: "value", facet: "privacy" },
      candidate_payload: {
        kind: "value",
        statement: "High risk value.",
        privacy_scope: "owner_private",
      },
      reason: "High risk value.",
      provenance: { supporting_events: [] },
      confidence: 0.5,
      privacy_scope: "owner_private",
      risk: {
        level: "high",
        requires_human_approval: true,
      },
    });

    const snapshot = await store.read();
    const packet = generateCurationPacket(snapshot, store.clock, store.idGen);

    expect(packet!.questions[0].type).toBe("value_arbitration");
  });
});

describe("applyRatification", () => {
  it("accept -> SUPERSEDE when proposal operation is supersede", async () => {
    store.appendYamlItem("core/ratified/facts.yaml", {
      id: "fact-seed-001",
      kind: "preference",
      statement: "Old pref",
      status: "ratified",
      confidence: 0.7,
      evidence_count: 1,
      privacy_scope: "owner_private",
    });

    await executeOperation(store, {
      op: "PROPOSE",
      type: "revise_preference",
      operation: "supersede",
      target_ref: {
        object_id: "fact-seed-001",
        kind: "preference",
        facet: "communication_style",
      },
      candidate_payload: {
        kind: "preference",
        statement: "Use concise answers by default.",
        privacy_scope: "owner_private",
      },
      reason: "Recent answers suggest concise mode is preferred.",
      provenance: { supporting_events: ["evt-001"] },
      confidence: 0.82,
      privacy_scope: "owner_private",
      risk: {
        level: "medium",
        requires_human_approval: true,
      },
    });

    const result = await applyRatification(store, {
      responses: [
        { question_ref: "q-001", answer_type: "accept", answer_text: "Yes, confirmed." },
      ],
      questionToProposal: new Map([["q-001", "prop-test-001"]]),
    });

    expect(result.applied).toHaveLength(1);
    expect(result.applied[0].operation).toBe("SUPERSEDE");
    expect(result.plans[0].proposal_status).toBe("applied");

    const snapshot = await store.read();
    const oldObj = snapshot.coreObjects.find((obj) => obj.data.id === "fact-seed-001");
    const newObj = snapshot.coreObjects.find((obj) => obj.data.id === "fact-test-001");
    const proposal = snapshot.proposals.find((obj) => obj.data.id === "prop-test-001");

    expect(oldObj!.data.status).toBe("deprecated");
    expect(newObj!.data.statement).toBe("Use concise answers by default.");
    expect(proposal!.data.status).toBe("applied");
  });

  it("edit -> REVISE using normalized payload", async () => {
    store.appendYamlItem("core/ratified/facts.yaml", {
      id: "fact-seed-001",
      kind: "preference",
      statement: "Old pref",
      status: "ratified",
      confidence: 0.7,
      privacy_scope: "owner_private",
    });

    await executeOperation(store, {
      op: "PROPOSE",
      type: "revise_fact",
      operation: "revise",
      target_ref: {
        object_id: "fact-seed-001",
        kind: "preference",
      },
      candidate_payload: {
        kind: "preference",
        statement: "Use concise answers.",
        privacy_scope: "owner_private",
      },
      reason: "Human clarification is needed.",
      provenance: { supporting_events: [] },
      confidence: 0.7,
      privacy_scope: "owner_private",
    });

    const result = await applyRatification(store, {
      responses: [
        { question_ref: "q-001", answer_type: "edit", answer_text: "Actually, I prefer depth." },
      ],
      questionToProposal: new Map([["q-001", "prop-test-001"]]),
    });

    expect(result.applied).toHaveLength(1);
    expect(result.applied[0].operation).toBe("REVISE");
    expect(result.decisions[0].candidate_payload.statement).toBe("Actually, I prefer depth.");

    const snapshot = await store.read();
    const obj = snapshot.coreObjects.find((o) => o.data.id === "fact-seed-001");
    expect(obj!.data.statement).toBe("Actually, I prefer depth.");
  });

  it("reject -> LOG event and marks proposal rejected", async () => {
    await executeOperation(store, {
      op: "PROPOSE",
      type: "new_fact",
      operation: "create",
      target_ref: {
        kind: "fact",
        facet: "working_style",
      },
      candidate_payload: {
        kind: "fact",
        statement: "The user prefers terse status updates.",
        privacy_scope: "owner_private",
      },
      reason: "Draft proposal to review.",
      provenance: { supporting_events: [] },
      confidence: 0.6,
      privacy_scope: "owner_private",
    });

    const result = await applyRatification(store, {
      responses: [
        { question_ref: "q-001", answer_type: "reject", answer_text: "No, wrong." },
      ],
      questionToProposal: new Map([["q-001", "prop-test-001"]]),
    });

    expect(result.applied).toHaveLength(1);
    expect(result.applied[0].operation).toBe("LOG");

    const snapshot = await store.read();
    const proposal = snapshot.proposals.find((obj) => obj.data.id === "prop-test-001");
    expect(proposal!.data.status).toBe("rejected");
  });

  it("skips unknown question refs", async () => {
    const result = await applyRatification(store, {
      responses: [
        { question_ref: "q-unknown", answer_type: "accept", answer_text: "ok" },
      ],
      questionToProposal: new Map(),
    });

    expect(result.applied).toHaveLength(0);
    expect(result.skipped).toContain("q-unknown");
  });
});
