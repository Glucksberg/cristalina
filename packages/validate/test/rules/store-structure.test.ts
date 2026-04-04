import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { storeStructure } from "../../src/rules/store-structure.js";
import type { ParsedStore } from "../../src/store/reader.js";

function makeStore(files: string[], root: string = "/test"): ParsedStore {
  return {
    root, manifest: null, manifestFile: null,
    events: [], proposals: [], curationPackets: [], coreObjects: [], entities: [], policyObjects: [], contradictions: [],
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
      "entities/registry.yaml",
      "policy/audience.yaml",
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
      "entities/registry.yaml",
      "policy/audience.yaml",
      "compiled/hot/session-pack.md",
    ]);
    const diags = storeStructure(store);
    expect(diags.some((d) => d.rule === "store-structure/event-naming")).toBe(true);
  });

  it("does not warn about expected directories when they exist but are empty", () => {
    const root = mkdtempSync(resolve(tmpdir(), "cristalina-structure-"));
    mkdirSync(resolve(root, "events"), { recursive: true });
    mkdirSync(resolve(root, "proposals"), { recursive: true });
    mkdirSync(resolve(root, "core", "ratified"), { recursive: true });
    mkdirSync(resolve(root, "core", "identity"), { recursive: true });
    mkdirSync(resolve(root, "core", "values"), { recursive: true });
    mkdirSync(resolve(root, "entities"), { recursive: true });
    mkdirSync(resolve(root, "policy"), { recursive: true });
    mkdirSync(resolve(root, "compiled"), { recursive: true });

    const diags = storeStructure(makeStore([], root));
    expect(diags.filter((d) => d.severity === "warning")).toHaveLength(0);

    rmSync(root, { recursive: true, force: true });
  });
});
