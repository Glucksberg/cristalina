import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolve } from "node:path";
import { mkdirSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { CristalinaStore } from "../../src/store/store.js";
import { FixedClock } from "../../src/clock/clock.js";
import { DeterministicIdGenerator } from "../../src/id/generator.js";
import { compile } from "../../src/compiler/index.js";
import { generateBootstrap } from "../../src/compiler/bootstrap.js";
import { scoreObject, assignTier, filterByAudience } from "../../src/compiler/scoring.js";
import type { ParsedObject } from "@cristalina/validate";

let root: string;
let store: CristalinaStore;

beforeEach(() => {
  root = resolve(tmpdir(), `cristalina-test-${randomUUID()}`);
  mkdirSync(root, { recursive: true });
  store = new CristalinaStore({
    root,
    clock: new FixedClock("2026-03-29T12:00:00Z"),
    idGenerator: new DeterministicIdGenerator(),
  });
});

afterEach(() => {
  rmSync(root, { recursive: true });
});

function seedObjects() {
  store.appendYamlItem("core/ratified/facts.yaml", {
    id: "fact-001", kind: "preference", statement: "User prefers concise answers.",
    status: "ratified", confidence: 0.92, source_type: "human_reply", source_ref: "q-1",
    created_at: "2026-03-29T03:00:00Z", last_confirmed_at: "2026-03-29T03:00:00Z",
    confirmed_by: "owner", evidence_count: 2, privacy_scope: "owner_private",
  });
  store.appendYamlItem("core/values/values.yaml", {
    id: "val-001", kind: "value", statement: "Honesty above pleasing.",
    status: "ratified", confidence: 0.95, source_type: "human_reply", source_ref: "q-2",
    created_at: "2026-03-29T03:00:00Z", last_confirmed_at: "2026-03-29T03:00:00Z",
    confirmed_by: "owner", evidence_count: 3, privacy_scope: "owner_private",
  });
  store.appendYamlItem("core/identity/soul.yaml", {
    id: "idt-001", kind: "identity_trait", statement: "Long-term technical companion.",
    status: "ratified", confidence: 0.90, source_type: "human_reply", source_ref: "q-3",
    created_at: "2026-03-29T03:00:00Z", last_confirmed_at: "2026-03-29T03:00:00Z",
    confirmed_by: "owner", evidence_count: 1, privacy_scope: "owner_private",
  });
  store.appendYamlItem("core/ratified/facts.yaml", {
    id: "fact-002", kind: "fact", statement: "Old archived fact.",
    status: "archived", confidence: 0.3, privacy_scope: "owner_private",
  });
}

describe("scoring", () => {
  it("scores ratified objects higher than archived", () => {
    const ratified: ParsedObject = {
      data: { status: "ratified", confidence: 0.9, kind: "fact", evidence_count: 2, last_confirmed_at: "2026-03-29T03:00:00Z" },
      file: "core/ratified/facts.yaml",
    };
    const archived: ParsedObject = {
      data: { status: "archived", confidence: 0.3, kind: "fact" },
      file: "core/ratified/facts.yaml",
    };
    expect(scoreObject(ratified, "2026-03-29T12:00:00Z")).toBeGreaterThan(scoreObject(archived, "2026-03-29T12:00:00Z"));
  });

  it("assigns identity traits to HOT tier", () => {
    const obj: ParsedObject = {
      data: { kind: "identity_trait", status: "ratified", confidence: 0.9 },
      file: "core/identity/soul.yaml",
    };
    const score = scoreObject(obj, "2026-03-29T12:00:00Z");
    expect(assignTier(obj, score)).toBe("hot");
  });

  it("filters by audience scope — agent_operational sees itself and more public", () => {
    const objects: ParsedObject[] = [
      { data: { id: "a", privacy_scope: "owner_private" }, file: "test" },
      { data: { id: "b", privacy_scope: "public_safe" }, file: "test" },
      { data: { id: "c", privacy_scope: "agent_operational" }, file: "test" },
      { data: { id: "d", privacy_scope: "shareable" }, file: "test" },
    ];
    const filtered = filterByAudience(objects, "agent_operational");
    // agent_operational(1) sees: agent_operational(1), project_private(2), shareable(3), public_safe(4)
    // Does NOT see: owner_private(0)
    expect(filtered.map((o) => o.data.id)).toEqual(["b", "c", "d"]);
  });

  it("owner_private audience sees everything", () => {
    const objects: ParsedObject[] = [
      { data: { id: "a", privacy_scope: "owner_private" }, file: "test" },
      { data: { id: "b", privacy_scope: "public_safe" }, file: "test" },
    ];
    const filtered = filterByAudience(objects, "owner_private");
    expect(filtered).toHaveLength(2);
  });

  it("public_safe audience sees only public_safe", () => {
    const objects: ParsedObject[] = [
      { data: { id: "a", privacy_scope: "owner_private" }, file: "test" },
      { data: { id: "b", privacy_scope: "public_safe" }, file: "test" },
      { data: { id: "c", privacy_scope: "shareable" }, file: "test" },
    ];
    const filtered = filterByAudience(objects, "public_safe");
    expect(filtered.map((o) => o.data.id)).toEqual(["b"]);
  });
});

describe("generateBootstrap", () => {
  it("produces SOUL.md with identity traits", () => {
    seedObjects();
    const snapshot = store as unknown as { _snapshot: null };
    snapshot._snapshot = null;
    const objects: ParsedObject[] = [
      { data: { id: "idt-001", kind: "identity_trait", statement: "Technical companion.", status: "ratified", privacy_scope: "owner_private" }, file: "test" },
    ];
    const result = generateBootstrap(objects, []);
    expect(result.soul).toContain("Technical companion.");
  });

  it("produces VALUE.md with values", () => {
    const objects: ParsedObject[] = [
      { data: { id: "val-001", kind: "value", statement: "Honesty above all.", status: "ratified", privacy_scope: "owner_private" }, file: "test" },
    ];
    const result = generateBootstrap(objects, []);
    expect(result.value).toContain("Honesty above all.");
  });
});

describe("compile", () => {
  it("compiles context and writes files", async () => {
    seedObjects();

    const result = await compile(store, { audience: "owner_private" });

    expect(result.hot).toContain("Identity");
    expect(result.hot).toContain("Long-term technical companion.");
    expect(result.hot).toContain("Values");
    expect(result.hot).toContain("Honesty above pleasing.");
    expect(result.metadata.hot_count).toBeGreaterThan(0);

    // Verify files were written
    expect(existsSync(resolve(root, "compiled/hot/session-pack.md"))).toBe(true);
    expect(existsSync(resolve(root, "compiled/bootstrap/SOUL.md"))).toBe(true);
    expect(existsSync(resolve(root, "compiled/bootstrap/VALUE.md"))).toBe(true);
    expect(existsSync(resolve(root, "compiled/bootstrap/USER.md"))).toBe(true);
    expect(existsSync(resolve(root, "compiled/bootstrap/MEMORY.md"))).toBe(true);

    // Verify bootstrap content
    const soul = readFileSync(resolve(root, "compiled/bootstrap/SOUL.md"), "utf-8");
    expect(soul).toContain("Long-term technical companion.");
  });

  it("respects privacy scope filtering", async () => {
    store.appendYamlItem("core/ratified/facts.yaml", {
      id: "fact-public", kind: "fact", statement: "Public fact.",
      status: "ratified", confidence: 0.9, privacy_scope: "public_safe",
    });
    store.appendYamlItem("core/ratified/facts.yaml", {
      id: "fact-private", kind: "fact", statement: "Private secret.",
      status: "ratified", confidence: 0.9, privacy_scope: "owner_private",
    });

    const result = await compile(store, { audience: "public_safe" });
    // public_safe audience should ONLY see public_safe objects, NOT owner_private
    expect(result.bootstrap.memory).toContain("Public fact.");
    expect(result.bootstrap.memory).not.toContain("Private secret.");
  });
});
