import { describe, it, expect } from "vitest";
import { stableReferences } from "../../src/rules/stable-references.js";
import type { ParsedStore } from "../../src/store/reader.js";

function makeStore(overrides: Partial<ParsedStore> = {}): ParsedStore {
  return {
    root: "/test",
    manifest: null,
    manifestFile: null,
    events: [],
    proposals: [],
    curationPackets: [],
    coreObjects: [],
    entities: [],
    policyObjects: [],
    contradictions: [],
    files: [],
    parseErrors: [],
    ...overrides,
  };
}

describe("stableReferences rule", () => {
  it("warns on legacy textual relationship endpoints", () => {
    const store = makeStore({
      coreObjects: [{
        data: {
          id: "rel-001",
          kind: "relationship",
          from: "user",
          relation: "prefers",
          to: "concise_answers",
          status: "ratified",
          confidence: 0.9,
          source_type: "human_reply",
          source_ref: "q-1",
          privacy_scope: "owner_private",
        },
        file: "core/ratified/relationships.yaml",
      }],
      entities: [{ data: { id: "ent-owner", kind: "owner", name: "Owner", status: "active", privacy_scope: "owner_private" }, file: "entities/registry.yaml" }],
    });

    const diags = stableReferences(store);
    expect(diags).toHaveLength(2);
    expect(diags.every((diag) => diag.rule === "stable-references")).toBe(true);
  });

  it("does not warn once stable refs are present", () => {
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
          source_ref: "q-1",
          privacy_scope: "owner_private",
        },
        file: "core/ratified/relationships.yaml",
      }, {
        data: {
          id: "fact-001",
          kind: "fact",
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
        },
        file: "core/ratified/facts.yaml",
      }],
      entities: [{ data: { id: "ent-owner", kind: "owner", name: "Owner", status: "active", privacy_scope: "owner_private" }, file: "entities/registry.yaml" }],
    });

    expect(stableReferences(store)).toHaveLength(0);
  });

  it("warns when stable refs point to non-active entities", () => {
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
          source_ref: "q-1",
          privacy_scope: "owner_private",
        },
        file: "core/ratified/relationships.yaml",
      }, {
        data: {
          id: "fact-001",
          kind: "fact",
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
        },
        file: "core/ratified/facts.yaml",
      }],
      entities: [{ data: { id: "ent-owner", kind: "owner", name: "Owner", status: "deprecated", privacy_scope: "owner_private" }, file: "entities/registry.yaml" }],
    });

    const diags = stableReferences(store);
    expect(diags.some((diag) => diag.message.includes("non-active entity"))).toBe(true);
  });
});
