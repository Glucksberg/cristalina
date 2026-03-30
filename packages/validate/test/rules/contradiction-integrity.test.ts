import { describe, it, expect } from "vitest";
import { contradictionIntegrity } from "../../src/rules/contradiction-integrity.js";
import type { ParsedStore } from "../../src/store/reader.js";

function makeStore(overrides: Partial<ParsedStore> = {}): ParsedStore {
  return {
    root: "/test", manifest: null, manifestFile: null,
    events: [], proposals: [], coreObjects: [], contradictions: [],
    files: [], parseErrors: [], ...overrides,
  };
}

describe("contradictionIntegrity rule", () => {
  it("reports orphan left reference", () => {
    const store = makeStore({
      contradictions: [
        { data: { id: "ctr-001", left: "fact-999", right: "fact-001", status: "open", reason: "test" }, file: "core/contradictions.yaml" },
      ],
      coreObjects: [
        { data: { id: "fact-001", status: "ratified" }, file: "core/ratified/facts.yaml" },
      ],
    });
    const diags = contradictionIntegrity(store);
    expect(diags.some((d) => d.rule === "contradiction-integrity/orphan-left")).toBe(true);
  });

  it("reports orphan right reference", () => {
    const store = makeStore({
      contradictions: [
        { data: { id: "ctr-001", left: "fact-001", right: "fact-999", status: "open", reason: "test" }, file: "core/contradictions.yaml" },
      ],
      coreObjects: [
        { data: { id: "fact-001", status: "ratified" }, file: "core/ratified/facts.yaml" },
      ],
    });
    const diags = contradictionIntegrity(store);
    expect(diags.some((d) => d.rule === "contradiction-integrity/orphan-right")).toBe(true);
  });

  it("warns about open contradiction with deprecated side", () => {
    const store = makeStore({
      contradictions: [
        { data: { id: "ctr-001", left: "fact-001", right: "fact-002", status: "open", reason: "test" }, file: "core/contradictions.yaml" },
      ],
      coreObjects: [
        { data: { id: "fact-001", status: "deprecated" }, file: "core/ratified/facts.yaml" },
        { data: { id: "fact-002", status: "ratified" }, file: "core/ratified/facts.yaml" },
      ],
    });
    const diags = contradictionIntegrity(store);
    expect(diags.some((d) => d.rule === "contradiction-integrity/stale")).toBe(true);
  });

  it("passes with valid contradiction", () => {
    const store = makeStore({
      contradictions: [
        { data: { id: "ctr-001", left: "fact-001", right: "fact-002", status: "open", reason: "test" }, file: "core/contradictions.yaml" },
      ],
      coreObjects: [
        { data: { id: "fact-001", status: "ratified" }, file: "core/ratified/facts.yaml" },
        { data: { id: "fact-002", status: "ratified" }, file: "core/ratified/facts.yaml" },
      ],
    });
    const diags = contradictionIntegrity(store);
    expect(diags.filter((d) => d.severity === "error")).toHaveLength(0);
  });
});
