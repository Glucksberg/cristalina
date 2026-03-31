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
      }],
    });

    expect(stableReferences(store)).toHaveLength(0);
  });
});
