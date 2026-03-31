import { describe, it, expect } from "vitest";
import { requiredProvenance } from "../../src/rules/required-provenance.js";
import type { ParsedStore } from "../../src/store/reader.js";

function makeStore(coreObjects: ParsedStore["coreObjects"]): ParsedStore {
  return {
    root: "/test", manifest: null, manifestFile: null,
    events: [], proposals: [], curationPackets: [], coreObjects, contradictions: [],
    files: [], parseErrors: [],
  };
}

describe("requiredProvenance rule", () => {
  it("reports each missing provenance field", () => {
    const store = makeStore([
      {
        data: { id: "fact-001", statement: "test", status: "ratified" },
        file: "core/ratified/facts.yaml",
      },
    ]);
    const diags = requiredProvenance(store);
    const missing = diags.map((d) => d.path);
    expect(missing).toContain("source_type");
    expect(missing).toContain("source_ref");
    expect(missing).toContain("created_at");
    expect(missing).toContain("confidence");
    expect(missing).toContain("privacy_scope");
  });

  it("passes when all provenance fields are present", () => {
    const store = makeStore([
      {
        data: {
          id: "fact-001", statement: "test", source_type: "human_reply", source_ref: "test",
          created_at: "2026-03-29T03:10:00Z", last_confirmed_at: "2026-03-29T03:10:00Z",
          confirmed_by: "owner", evidence_count: 1, confidence: 0.9, privacy_scope: "owner_private",
        },
        file: "core/ratified/facts.yaml",
      },
    ]);
    expect(requiredProvenance(store)).toHaveLength(0);
  });

  it("skips objects without statement field", () => {
    const store = makeStore([
      { data: { role: "agent", traits: ["practical"] }, file: "core/identity/soul.yaml" },
    ]);
    expect(requiredProvenance(store)).toHaveLength(0);
  });
});
