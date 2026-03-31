import { describe, it, expect } from "vitest";
import { schemaConformance } from "../../src/rules/schema-conformance.js";
import type { ParsedStore } from "../../src/store/reader.js";

function makeStore(overrides: Partial<ParsedStore> = {}): ParsedStore {
  return {
    root: "/test", manifest: null, manifestFile: null,
    events: [], proposals: [], curationPackets: [], coreObjects: [], contradictions: [],
    files: [], parseErrors: [], ...overrides,
  };
}

describe("schemaConformance rule", () => {
  it("valid event passes", () => {
    const store = makeStore({
      events: [{
        data: { id: "evt-001", kind: "heartbeat", ts: "2026-03-29T02:00:00Z", summary: "test", source_type: "runtime_observation", privacy_scope: "agent_operational" },
        file: "events/2026-03/2026-03-29.jsonl", index: 0,
      }],
    });
    expect(schemaConformance(store)).toHaveLength(0);
  });

  it("invalid event reports errors", () => {
    const store = makeStore({
      events: [{
        data: { id: "evt-001", kind: "INVALID", ts: "not-a-date", summary: "test", source_type: "runtime_observation", privacy_scope: "agent_operational" },
        file: "events/2026-03/2026-03-29.jsonl", index: 0,
      }],
    });
    const diags = schemaConformance(store);
    expect(diags.length).toBeGreaterThan(0);
    expect(diags.every((d) => d.rule === "schema-conformance/event")).toBe(true);
  });

  it("valid proposal passes", () => {
    const store = makeStore({
      proposals: [{
        data: {
          id: "prop-001",
          type: "new_fact",
          operation: "create",
          target_ref: { kind: "fact", facet: "working_style" },
          candidate_payload: {
            kind: "fact",
            statement: "User prefers concise replies.",
            privacy_scope: "owner_private",
          },
          reason: "Grounded by recent interactions",
          provenance: { supporting_events: ["evt-001"] },
          confidence: 0.7,
          status: "pending",
          privacy_scope: "owner_private",
        },
        file: "proposals/2026-03/pending-updates.yaml",
        index: 0,
      }],
    });
    expect(schemaConformance(store)).toHaveLength(0);
  });

  it("invalid proposal reports errors", () => {
    const store = makeStore({
      proposals: [{
        data: {
          id: "prop-001",
          type: "revise_fact",
          operation: "revise",
          target_ref: { kind: "fact" },
          candidate_payload: { kind: "fact", privacy_scope: "owner_private" },
          reason: "Missing required fields",
          provenance: { supporting_events: [] },
          confidence: 1.2,
          status: "pending",
          privacy_scope: "owner_private",
        },
        file: "proposals/2026-03/pending-updates.yaml",
        index: 0,
      }],
    });
    const diags = schemaConformance(store);
    expect(diags.some((d) => d.rule === "schema-conformance/proposal")).toBe(true);
  });

  it("valid memory object passes", () => {
    const store = makeStore({
      coreObjects: [{
        data: {
          id: "fact-001", kind: "preference", statement: "test", status: "ratified",
          confidence: 0.9, source_type: "human_reply", source_ref: "test",
          created_at: "2026-03-29T03:10:00Z", last_confirmed_at: "2026-03-29T03:10:00Z",
          confirmed_by: "owner", evidence_count: 1, privacy_scope: "owner_private",
        },
        file: "core/ratified/facts.yaml",
      }],
    });
    expect(schemaConformance(store)).toHaveLength(0);
  });

  it("dispatches value kind to ValueSchema (allows priority field)", () => {
    const store = makeStore({
      coreObjects: [{
        data: {
          id: "val-001", kind: "value", statement: "test", status: "ratified",
          confidence: 0.9, source_type: "human_reply", source_ref: "test",
          privacy_scope: "owner_private", priority: "high",
        },
        file: "core/values/values.yaml",
      }],
    });
    const diags = schemaConformance(store);
    // priority is allowed on ValueSchema — no "unrecognized key" error
    expect(diags.filter((d) => d.message.includes("priority"))).toHaveLength(0);
  });

  it("dispatches identity_trait kind to IdentityTraitSchema", () => {
    const store = makeStore({
      coreObjects: [{
        data: {
          id: "idt-001", kind: "identity_trait", statement: "test", status: "ratified",
          confidence: 0.9, source_type: "human_reply", source_ref: "test",
          privacy_scope: "owner_private",
        },
        file: "core/identity/soul.yaml",
      }],
    });
    expect(schemaConformance(store)).toHaveLength(0);
  });

  it("skips core objects without statement or relation fields", () => {
    const store = makeStore({
      coreObjects: [{
        data: { role: "personal agent", traits: ["practical"] },
        file: "core/identity/soul.yaml",
      }],
    });
    // Flat config objects without id+statement are skipped
    expect(schemaConformance(store)).toHaveLength(0);
  });

  it("accepts relationship objects with stable refs", () => {
    const store = makeStore({
      coreObjects: [{
        data: {
          id: "rel-001",
          kind: "relationship",
          from_ref: { entity_id: "ent-owner", kind: "owner" },
          relation: "prefers",
          to_ref: { object_id: "fact-001", kind: "fact" },
          status: "ratified",
          confidence: 0.9,
          source_type: "human_reply",
          source_ref: "test",
          privacy_scope: "owner_private",
        },
        file: "core/ratified/relationships.yaml",
      }],
    });

    expect(schemaConformance(store)).toHaveLength(0);
  });
});
