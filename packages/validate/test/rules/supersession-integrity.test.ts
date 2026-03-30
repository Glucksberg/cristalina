import { describe, it, expect } from "vitest";
import { supersessionIntegrity } from "../../src/rules/supersession-integrity.js";
import type { ParsedStore } from "../../src/store/reader.js";

function makeStore(coreObjects: ParsedStore["coreObjects"]): ParsedStore {
  return {
    root: "/test",
    manifest: null,
    manifestFile: null,
    events: [],
    proposals: [],
    coreObjects,
    contradictions: [],
    files: [],
    parseErrors: [],
  };
}

describe("supersessionIntegrity rule", () => {
  it("reports supersedes reference to non-existent object", () => {
    const store = makeStore([
      {
        data: { id: "fact-001", supersedes: ["fact-999"] },
        file: "core/ratified/facts.yaml",
      },
    ]);
    const diags = supersessionIntegrity(store);
    expect(diags.some((d) => d.rule === "supersession-integrity/missing-target")).toBe(true);
  });

  it("warns about missing back-reference", () => {
    const store = makeStore([
      {
        data: { id: "fact-001" },
        file: "core/ratified/facts.yaml",
      },
      {
        data: { id: "fact-002", supersedes: ["fact-001"] },
        file: "core/ratified/facts.yaml",
      },
    ]);
    const diags = supersessionIntegrity(store);
    expect(diags.some((d) => d.rule === "supersession-integrity/missing-backref")).toBe(true);
  });

  it("passes with valid bidirectional supersession", () => {
    const store = makeStore([
      {
        data: { id: "fact-001", superseded_by: ["fact-002"] },
        file: "core/ratified/facts.yaml",
      },
      {
        data: { id: "fact-002", supersedes: ["fact-001"] },
        file: "core/ratified/facts.yaml",
      },
    ]);
    const diags = supersessionIntegrity(store);
    const errors = diags.filter((d) => d.severity === "error");
    expect(errors).toHaveLength(0);
  });
});
