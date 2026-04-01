import { describe, it, expect } from "vitest";
import { idPrefix } from "../../src/rules/id-prefix.js";
import type { ParsedStore } from "../../src/store/reader.js";

function makeStore(overrides: Partial<ParsedStore> = {}): ParsedStore {
  return {
    root: "/test", manifest: null, manifestFile: null,
    events: [], proposals: [], curationPackets: [], coreObjects: [], entities: [], policyObjects: [], contradictions: [],
    files: [], parseErrors: [], ...overrides,
  };
}

describe("idPrefix rule", () => {
  it("passes with correct event prefix", () => {
    const store = makeStore({
      events: [{ data: { id: "evt-001" }, file: "events/2026-03/2026-03-29.jsonl", index: 0 }],
    });
    expect(idPrefix(store)).toHaveLength(0);
  });

  it("reports wrong event prefix", () => {
    const store = makeStore({
      events: [{ data: { id: "bad-001" }, file: "events/2026-03/2026-03-29.jsonl", index: 0 }],
    });
    const diags = idPrefix(store);
    expect(diags.some((d) => d.rule === "id-prefix/wrong")).toBe(true);
  });

  it("reports wrong prefix for value kind", () => {
    const store = makeStore({
      coreObjects: [{ data: { id: "fact-001", kind: "value" }, file: "core/values/values.yaml" }],
    });
    const diags = idPrefix(store);
    expect(diags.some((d) => d.rule === "id-prefix/wrong" && d.message.includes("val-"))).toBe(true);
  });

  it("passes correct prefix for identity_trait kind", () => {
    const store = makeStore({
      coreObjects: [{ data: { id: "idt-001", kind: "identity_trait" }, file: "core/identity/soul.yaml" }],
    });
    expect(idPrefix(store)).toHaveLength(0);
  });

  it("reports missing ID on event", () => {
    const store = makeStore({
      events: [{ data: { kind: "heartbeat" }, file: "events/2026-03/2026-03-29.jsonl", index: 0 }],
    });
    const diags = idPrefix(store);
    expect(diags.some((d) => d.rule === "id-prefix/missing")).toBe(true);
  });

  it("reports wrong contradiction prefix", () => {
    const store = makeStore({
      contradictions: [{ data: { id: "bad-001" }, file: "core/contradictions.yaml" }],
    });
    const diags = idPrefix(store);
    expect(diags.some((d) => d.rule === "id-prefix/wrong" && d.message.includes("ctr-"))).toBe(true);
  });
});
