import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { readStore } from "../../src/store/reader.js";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

const FIXTURES = resolve(import.meta.dirname, "../fixtures");

function tmpStore(): string {
  const dir = resolve(tmpdir(), `cristalina-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("readStore", () => {
  it("reads valid store without parse errors", async () => {
    const store = await readStore(resolve(FIXTURES, "valid-store"));
    expect(store.parseErrors).toHaveLength(0);
    expect(store.events.length).toBeGreaterThan(0);
    expect(store.coreObjects.length).toBeGreaterThan(0);
  });

  it("reports not-found for missing directory", async () => {
    const store = await readStore(resolve(FIXTURES, "does-not-exist"));
    expect(store.parseErrors.some((d) => d.rule === "store/not-found")).toBe(true);
  });

  it("handles empty YAML file gracefully", async () => {
    const dir = tmpStore();
    mkdirSync(resolve(dir, "core/ratified"), { recursive: true });
    writeFileSync(resolve(dir, "core/ratified/facts.yaml"), "");

    const store = await readStore(dir);
    expect(store.parseErrors.some((d) => d.message.includes("empty"))).toBe(true);

    rmSync(dir, { recursive: true });
  });

  it("handles YAML that parses to scalar", async () => {
    const dir = tmpStore();
    mkdirSync(resolve(dir, "core/ratified"), { recursive: true });
    writeFileSync(resolve(dir, "core/ratified/facts.yaml"), "42");

    const store = await readStore(dir);
    expect(store.parseErrors.some((d) => d.rule === "parse/yaml")).toBe(true);

    rmSync(dir, { recursive: true });
  });

  it("handles malformed JSONL", async () => {
    const dir = tmpStore();
    mkdirSync(resolve(dir, "events/2026-03"), { recursive: true });
    writeFileSync(resolve(dir, "events/2026-03/2026-03-29.jsonl"), "not json\n{\"id\":\"evt-001\"}\n");

    const store = await readStore(dir);
    expect(store.parseErrors.some((d) => d.rule === "parse/json")).toBe(true);
    expect(store.events).toHaveLength(1); // second line is valid

    rmSync(dir, { recursive: true });
  });

  it("reads proposals as single objects (no hybrid merging)", async () => {
    const dir = tmpStore();
    mkdirSync(resolve(dir, "proposals/2026-03"), { recursive: true });
    writeFileSync(resolve(dir, "proposals/2026-03/daily.yaml"), `
id: curation-2026-03-29
question_count: 2
questions:
  - id: q1
    type: factual_correction
    question: "Test?"
  - id: q2
    type: value_arbitration
    question: "Test 2?"
`);

    const store = await readStore(dir);
    // Should be stored as a single proposal object, not merged hybrids
    expect(store.proposals).toHaveLength(1);
    expect(store.proposals[0].data.id).toBe("curation-2026-03-29");

    rmSync(dir, { recursive: true });
  });
});
