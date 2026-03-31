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

  it("uses proposal type policy to classify privacy questions", async () => {
    await executeOperation(store, {
      op: "PROPOSE",
      type: "privacy_change",
      operation: "revise",
      target_ref: {
        object_id: "fact-privacy-001",
        kind: "fact",
        facet: "sharing_rules",
      },
      candidate_payload: {
        kind: "fact",
        statement: "Do not mention the private repository outside owner-private contexts.",
        privacy_scope: "owner_private",
      },
      reason: "The current sharing boundary is too loose.",
      provenance: { supporting_events: [] },
      confidence: 0.59,
      privacy_scope: "owner_private",
    });

    const snapshot = await store.read();
    const packet = generateCurationPacket(snapshot, store.clock, store.idGen);

    expect(packet).not.toBeNull();
    expect(packet!.questions[0].type).toBe("privacy_clarification");
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

    expect(result.applied).toHaveLength(2);
    expect(result.applied[0].operation).toBe("LOG");
    expect(result.applied[1].operation).toBe("SUPERSEDE");
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

    expect(result.applied).toHaveLength(2);
    expect(result.applied[0].operation).toBe("LOG");
    expect(result.applied[1].operation).toBe("REVISE");
    expect(result.decisions[0].candidate_payload.statement).toBe("Actually, I prefer depth.");

    const snapshot = await store.read();
    const obj = snapshot.coreObjects.find((o) => o.data.id === "fact-seed-001");
    expect(obj!.data.statement).toBe("Actually, I prefer depth.");
  });

  it("edit on confirm -> REVISE when human meaning changes the statement", async () => {
    store.appendYamlItem("core/ratified/facts.yaml", {
      id: "fact-seed-001",
      kind: "preference",
      statement: "Keep concise answers.",
      status: "ratified",
      confidence: 0.8,
      privacy_scope: "owner_private",
    });

    await executeOperation(store, {
      op: "PROPOSE",
      type: "revise_preference",
      operation: "confirm",
      target_ref: {
        object_id: "fact-seed-001",
        kind: "preference",
      },
      candidate_payload: {
        kind: "preference",
        privacy_scope: "owner_private",
      },
      reason: "Needs owner confirmation.",
      provenance: { supporting_events: [] },
      confidence: 0.85,
      privacy_scope: "owner_private",
    });

    const result = await applyRatification(store, {
      responses: [
        { question_ref: "q-001", answer_type: "edit", answer_text: "Default to depth for architecture work." },
      ],
      questionToProposal: new Map([["q-001", "prop-test-001"]]),
    });

    expect(result.decisions[0].operation).toBe("revise");
    expect(result.applied).toHaveLength(2);
    expect(result.applied[0].operation).toBe("LOG");
    expect(result.applied[1].operation).toBe("REVISE");

    const snapshot = await store.read();
    const obj = snapshot.coreObjects.find((entry) => entry.data.id === "fact-seed-001");
    expect(obj!.data.statement).toBe("Default to depth for architecture work.");
  });

  it("accept on confirm keeps CONFIRM planning isolated from edit semantics", async () => {
    store.appendYamlItem("core/ratified/facts.yaml", {
      id: "fact-seed-001",
      kind: "fact",
      statement: "The user prefers concise status updates.",
      status: "candidate",
      confidence: 0.61,
      privacy_scope: "owner_private",
    });

    await executeOperation(store, {
      op: "PROPOSE",
      type: "revise_fact",
      operation: "confirm",
      target_ref: {
        object_id: "fact-seed-001",
        kind: "fact",
      },
      candidate_payload: {
        kind: "fact",
        privacy_scope: "owner_private",
      },
      reason: "Needs explicit confirmation before crystallizing behavior.",
      provenance: { supporting_events: [] },
      confidence: 0.72,
      privacy_scope: "owner_private",
    });

    const result = await applyRatification(store, {
      responses: [
        { question_ref: "q-001", answer_type: "accept", answer_text: "Yes." },
      ],
      questionToProposal: new Map([["q-001", "prop-test-001"]]),
    });

    expect(result.decisions[0].operation).toBe("confirm");
    expect(result.applied).toHaveLength(2);
    expect(result.applied[0].operation).toBe("LOG");
    expect(result.applied[1].operation).toBe("CONFIRM");

    const snapshot = await store.read();
    const obj = snapshot.coreObjects.find((entry) => entry.data.id === "fact-seed-001");
    expect(obj!.data.status).toBe("ratified");
  });

  it("edit on create keeps create semantics while replacing the proposed statement", async () => {
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
        statement: "The user likes terse updates.",
        privacy_scope: "owner_private",
      },
      reason: "Initial draft from observation.",
      provenance: { supporting_events: [] },
      confidence: 0.67,
      privacy_scope: "owner_private",
    });

    const result = await applyRatification(store, {
      responses: [
        { question_ref: "q-001", answer_type: "edit", answer_text: "The user wants detailed architecture updates." },
      ],
      questionToProposal: new Map([["q-001", "prop-test-001"]]),
    });

    expect(result.decisions[0].operation).toBe("create");
    expect(result.decisions[0].candidate_payload.statement).toBe("The user wants detailed architecture updates.");
    expect(result.applied).toHaveLength(2);
    expect(result.applied[0].operation).toBe("LOG");
    expect(result.applied[1].operation).toBe("CREATE");

    const snapshot = await store.read();
    const created = snapshot.coreObjects.find((entry) => entry.data.id === "fact-test-001");
    expect(created!.data.statement).toBe("The user wants detailed architecture updates.");
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

  it("rejects ratification for proposals with incompatible type semantics persisted on disk", async () => {
    store.appendYamlItem("proposals/2026-03/pending-updates.yaml", {
      id: "prop-bad-001",
      type: "open_contradiction",
      operation: "create",
      target_ref: {
        kind: "fact",
        facet: "working_style",
      },
      candidate_payload: {
        kind: "fact",
        statement: "Bad contradiction proposal.",
        privacy_scope: "owner_private",
      },
      reason: "Malformed imported proposal.",
      provenance: {
        supporting_events: [],
      },
      confidence: 0.5,
      status: "pending",
      privacy_scope: "owner_private",
      created_at: "2026-03-29T12:00:00Z",
      created_by: "agent",
    });

    await expect(applyRatification(store, {
      responses: [
        { question_ref: "q-001", answer_type: "accept", answer_text: "ok" },
      ],
      questionToProposal: new Map([["q-001", "prop-bad-001"]]),
    })).rejects.toThrow('Proposal prop-bad-001 uses incompatible operation "create" for proposal type "open_contradiction"');
  });

  it("records provenance and policy tags in ratification audit logs", async () => {
    store.appendYamlItem("core/ratified/facts.yaml", {
      id: "fact-seed-001",
      kind: "preference",
      statement: "Keep concise answers.",
      status: "ratified",
      confidence: 0.8,
      privacy_scope: "owner_private",
    });

    await executeOperation(store, {
      op: "PROPOSE",
      type: "privacy_change",
      operation: "revise",
      target_ref: {
        object_id: "fact-seed-001",
        kind: "preference",
      },
      candidate_payload: {
        kind: "preference",
        statement: "Never mention internal repository names in shareable contexts.",
        privacy_scope: "owner_private",
      },
      reason: "Privacy boundary needs explicit reinforcement.",
      provenance: { supporting_events: [] },
      confidence: 0.62,
      privacy_scope: "owner_private",
      policy_tags: ["privacy", "sharing"],
    });

    const result = await applyRatification(store, {
      responses: [
        { question_ref: "q-001", answer_type: "accept", answer_text: "Yes." },
      ],
      questionToProposal: new Map([["q-001", "prop-test-001"]]),
    });

    expect(result.applied[0].operation).toBe("LOG");
    const logEffect = result.applied[0].effects[0] as { data: Record<string, unknown> };
    const details = logEffect.data.details as Record<string, unknown>;
    expect(details.policy_tags).toEqual(["privacy", "sharing"]);
    expect(details.supporting_event_count).toBe(0);
    expect(details.approval_reasons).toEqual(expect.arrayContaining([
      "high_risk_type:privacy_change",
      "sensitive_policy_tag:privacy",
      "sensitive_policy_tag:sharing",
      "thin_provenance",
    ]));
  });
});
