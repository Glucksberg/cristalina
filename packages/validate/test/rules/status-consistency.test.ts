import { describe, it, expect } from "vitest";
import { statusConsistency } from "../../src/rules/status-consistency.js";
import type { ParsedStore } from "../../src/store/reader.js";

function makeStore(coreObjects: ParsedStore["coreObjects"]): ParsedStore {
  return {
    root: "/test",
    manifest: null,
    manifestFile: null,
    events: [],
    proposals: [],
    curationPackets: [],
    coreObjects,
    contradictions: [],
    files: [],
    parseErrors: [],
  };
}

describe("statusConsistency rule", () => {
  it("reports crystallized memory with low confidence", () => {
    const store = makeStore([
      {
        data: { id: "fact-001", status: "crystallized", confidence: 0.5 },
        file: "core/ratified/facts.yaml",
      },
    ]);
    const diags = statusConsistency(store);
    expect(diags.some((d) => d.rule === "status-consistency/crystallized-low-confidence")).toBe(true);
  });

  it("reports deprecated memory without superseded_by", () => {
    const store = makeStore([
      {
        data: { id: "fact-001", status: "deprecated" },
        file: "core/ratified/facts.yaml",
      },
    ]);
    const diags = statusConsistency(store);
    expect(diags.some((d) => d.rule === "status-consistency/deprecated-no-successor")).toBe(true);
  });

  it("passes with valid status combinations", () => {
    const store = makeStore([
      {
        data: { id: "fact-001", status: "ratified", confidence: 0.85 },
        file: "core/ratified/facts.yaml",
      },
      {
        data: {
          id: "fact-002",
          status: "crystallized",
          confidence: 0.98,
        },
        file: "core/ratified/facts.yaml",
      },
    ]);
    const diags = statusConsistency(store);
    expect(diags).toHaveLength(0);
  });

  it("reports invalid status value", () => {
    const store = makeStore([
      {
        data: { id: "fact-001", status: "INVALID" },
        file: "core/ratified/facts.yaml",
      },
    ]);
    const diags = statusConsistency(store);
    expect(diags.some((d) => d.rule === "status-consistency/invalid")).toBe(true);
  });
});
