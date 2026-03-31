import { describe, it, expect } from "vitest";
import { storeStructure } from "../../src/rules/store-structure.js";
import type { ParsedStore } from "../../src/store/reader.js";

function makeStore(files: string[]): ParsedStore {
  return {
    root: "/test", manifest: null, manifestFile: null,
    events: [], proposals: [], curationPackets: [], coreObjects: [], contradictions: [],
    files, parseErrors: [],
  };
}

describe("storeStructure rule", () => {
  it("warns about missing expected directories", () => {
    const store = makeStore([]);
    const diags = storeStructure(store);
    expect(diags.some((d) => d.rule === "store-structure/missing-dir")).toBe(true);
  });

  it("passes with all expected directories", () => {
    const store = makeStore([
      "events/2026-03/2026-03-29.jsonl",
      "proposals/2026-03/daily-curation.yaml",
      "core/ratified/facts.yaml",
      "core/identity/soul.yaml",
      "core/values/values.yaml",
      "core/privacy/policy.yaml",
      "compiled/hot/session-pack.md",
    ]);
    const diags = storeStructure(store);
    const warnings = diags.filter((d) => d.severity === "warning");
    expect(warnings).toHaveLength(0);
  });

  it("flags non-standard event file naming", () => {
    const store = makeStore([
      "events/random-file.txt",
      "proposals/2026-03/test.yaml",
      "core/ratified/facts.yaml",
      "core/identity/soul.yaml",
      "core/values/values.yaml",
      "core/privacy/policy.yaml",
      "compiled/hot/session-pack.md",
    ]);
    const diags = storeStructure(store);
    expect(diags.some((d) => d.rule === "store-structure/event-naming")).toBe(true);
  });
});
