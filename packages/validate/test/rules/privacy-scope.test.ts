import { describe, it, expect } from "vitest";
import { privacyScope } from "../../src/rules/privacy-scope.js";
import type { ParsedStore } from "../../src/store/reader.js";

function makeStore(overrides: Partial<ParsedStore> = {}): ParsedStore {
  return {
    root: "/test",
    manifest: null,
    manifestFile: null,
    events: [],
    proposals: [],
    coreObjects: [],
    contradictions: [],
    files: [],
    parseErrors: [],
    ...overrides,
  };
}

describe("privacyScope rule", () => {
  it("reports missing privacy_scope", () => {
    const store = makeStore({
      coreObjects: [
        { data: { id: "fact-001", statement: "test" }, file: "core/ratified/facts.yaml" },
      ],
    });
    const diags = privacyScope(store);
    expect(diags.some((d) => d.rule === "privacy-scope/missing")).toBe(true);
  });

  it("reports invalid privacy_scope", () => {
    const store = makeStore({
      events: [
        {
          data: { id: "evt-001", privacy_scope: "invalid_scope" },
          file: "events/2026-03/2026-03-29.jsonl",
          index: 0,
        },
      ],
    });
    const diags = privacyScope(store);
    expect(diags.some((d) => d.rule === "privacy-scope/invalid")).toBe(true);
  });

  it("passes with valid privacy_scope", () => {
    const store = makeStore({
      events: [
        {
          data: { id: "evt-001", privacy_scope: "owner_private" },
          file: "events/2026-03/2026-03-29.jsonl",
          index: 0,
        },
      ],
      coreObjects: [
        {
          data: { id: "fact-001", privacy_scope: "agent_operational" },
          file: "core/ratified/facts.yaml",
        },
      ],
    });
    const diags = privacyScope(store);
    expect(diags).toHaveLength(0);
  });

  it("does not check escalation (handled by scope-escalation rule)", () => {
    const store = makeStore({
      coreObjects: [
        {
          data: { id: "fact-001", privacy_scope: "owner_private", status: "deprecated" },
          file: "core/ratified/facts.yaml",
        },
        {
          data: {
            id: "fact-002",
            privacy_scope: "public_safe",
            supersedes: ["fact-001"],
            source_type: "agent_inference",
          },
          file: "core/ratified/facts.yaml",
        },
      ],
    });
    const diags = privacyScope(store);
    // Should have zero diagnostics — both objects have valid scopes
    expect(diags).toHaveLength(0);
  });
});
