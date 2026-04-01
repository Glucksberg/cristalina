import { describe, it, expect } from "vitest";
import { confidenceRange } from "../../src/rules/confidence-range.js";
import type { ParsedStore } from "../../src/store/reader.js";

function makeStore(coreObjects: ParsedStore["coreObjects"]): ParsedStore {
  return {
    root: "/test", manifest: null, manifestFile: null,
    events: [], proposals: [], curationPackets: [], coreObjects, entities: [], policyObjects: [], contradictions: [],
    files: [], parseErrors: [],
  };
}

describe("confidenceRange rule", () => {
  it("reports confidence out of bounds", () => {
    const store = makeStore([
      { data: { id: "fact-001", statement: "test", confidence: 1.5 }, file: "core/ratified/facts.yaml" },
    ]);
    const diags = confidenceRange(store);
    expect(diags.some((d) => d.rule === "confidence-range/bounds")).toBe(true);
  });

  it("reports negative confidence", () => {
    const store = makeStore([
      { data: { id: "fact-001", statement: "test", confidence: -0.1 }, file: "core/ratified/facts.yaml" },
    ]);
    const diags = confidenceRange(store);
    expect(diags.some((d) => d.rule === "confidence-range/bounds")).toBe(true);
  });

  it("reports missing confidence on canonical object", () => {
    const store = makeStore([
      { data: { id: "fact-001", statement: "test" }, file: "core/ratified/facts.yaml" },
    ]);
    const diags = confidenceRange(store);
    expect(diags.some((d) => d.rule === "confidence-range/missing")).toBe(true);
  });

  it("warns about high confidence for agent_inference", () => {
    const store = makeStore([
      { data: { id: "fact-001", statement: "test", confidence: 0.95, source_type: "agent_inference" }, file: "core/ratified/facts.yaml" },
    ]);
    const diags = confidenceRange(store);
    expect(diags.some((d) => d.rule === "confidence-range/high-for-source")).toBe(true);
  });

  it("passes with valid confidence", () => {
    const store = makeStore([
      { data: { id: "fact-001", statement: "test", confidence: 0.85, source_type: "human_reply" }, file: "core/ratified/facts.yaml" },
    ]);
    expect(confidenceRange(store)).toHaveLength(0);
  });
});
