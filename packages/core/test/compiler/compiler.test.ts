import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolve } from "node:path";
import { mkdirSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { parse as yamlParse } from "yaml";
import { CristalinaStore } from "../../src/store/store.js";
import { FixedClock } from "../../src/clock/clock.js";
import { DeterministicIdGenerator } from "../../src/id/generator.js";
import { compile } from "../../src/compiler/index.js";
import { generateBootstrap } from "../../src/compiler/bootstrap.js";
import { scoreObject, assignTier, filterByAudience } from "../../src/compiler/scoring.js";
import { buildRuntimeDriftLogInput } from "../../src/adapter/writeback.js";
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

  it("filters by audience matrix - agent_operational sees operational and outward scopes only", () => {
    const objects: ParsedObject[] = [
      { data: { id: "a", privacy_scope: "owner_private" }, file: "test" },
      { data: { id: "b", privacy_scope: "public_safe" }, file: "test" },
      { data: { id: "c", privacy_scope: "agent_operational" }, file: "test" },
      { data: { id: "p", privacy_scope: "project_private" }, file: "test" },
      { data: { id: "d", privacy_scope: "shareable" }, file: "test" },
    ];
    const filtered = filterByAudience(objects, "agent_operational");
    expect(filtered.map((o) => o.data.id)).toEqual(["b", "c", "d"]);
  });

  it("project_private audience does not automatically see agent_operational objects", () => {
    const objects: ParsedObject[] = [
      { data: { id: "a", privacy_scope: "agent_operational" }, file: "test" },
      { data: { id: "b", privacy_scope: "project_private" }, file: "test" },
      { data: { id: "c", privacy_scope: "shareable" }, file: "test" },
    ];
    const filtered = filterByAudience(objects, "project_private");
    expect(filtered.map((o) => o.data.id)).toEqual(["b", "c"]);
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

  it("embeds runtime attention guidance in SOUL.md", () => {
    const result = generateBootstrap([], []);
    expect(result.soul).toContain("## Runtime Attention");
    expect(result.soul).toContain("Do not confuse preference, fact, belief, constraint, and project.");
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

    expect(existsSync(resolve(root, "compiled/hot/session-pack.md"))).toBe(true);
    expect(existsSync(resolve(root, "compiled/warm/extended-context.md"))).toBe(true);
    expect(existsSync(resolve(root, "compiled/bootstrap/SOUL.md"))).toBe(true);
    expect(existsSync(resolve(root, "compiled/bootstrap/VALUE.md"))).toBe(true);
    expect(existsSync(resolve(root, "compiled/bootstrap/USER.md"))).toBe(true);
    expect(existsSync(resolve(root, "compiled/bootstrap/MEMORY.md"))).toBe(true);
    expect(existsSync(resolve(root, "compiled/metadata/projection-manifest.yaml"))).toBe(true);

    const soul = readFileSync(resolve(root, "compiled/bootstrap/SOUL.md"), "utf-8");
    expect(soul).toContain("generated_by: cristalina-openclaw");
    expect(soul).toContain("writeback_mode: proposal_extraction");
    expect(soul).toContain("Long-term technical companion.");

    const manifest = yamlParse(readFileSync(resolve(root, "compiled/metadata/projection-manifest.yaml"), "utf-8")) as Record<string, unknown>;
    expect(manifest.projection_id).toBe(result.metadata.projection_id);
    expect(manifest.writeback_mode).toBe("proposal_extraction");
    expect(manifest.projection_profile).toBe("deep");
    expect(Array.isArray(manifest.artifacts)).toBe(true);
    expect((manifest.artifacts as Array<Record<string, unknown>>)).toHaveLength(7);
  });

  it("writes channel-specific projections into namespaced paths and records the profile", async () => {
    seedObjects();

    const result = await compile(store, { audience: "public_safe", channel: "group_channel" });

    expect(result.metadata.channel).toBe("group_channel");
    expect(result.metadata.projection_profile).toBe("tiny");
    expect(existsSync(resolve(root, "compiled/channels/group_channel/bootstrap/MEMORY.md"))).toBe(true);
    expect(existsSync(resolve(root, "compiled/channels/group_channel/metadata/projection-manifest.yaml"))).toBe(true);
    expect(existsSync(resolve(root, "compiled/bootstrap/MEMORY.md"))).toBe(false);

    const manifest = yamlParse(
      readFileSync(resolve(root, "compiled/channels/group_channel/metadata/projection-manifest.yaml"), "utf-8"),
    ) as Record<string, unknown>;
    expect(manifest.channel).toBe("group_channel");
    expect(manifest.projection_profile).toBe("tiny");

    const artifacts = manifest.artifacts as Array<Record<string, unknown>>;
    expect(artifacts.every((artifact) => String(artifact.path).startsWith("compiled/channels/group_channel/"))).toBe(true);
  });

  it("respects projection policy objects from the store", async () => {
    seedObjects();
    store.writeYaml("policy/projection.yaml", {
      id: "pol-projection-default",
      kind: "projection_policy",
      status: "active",
      default_profiles: {
        owner_private: "tiny",
        agent_operational: "standard",
        project_private: "standard",
        shareable: "standard",
        public_safe: "tiny",
      },
      channel_profile_rules: [
        { match_prefix: "owner_", profile: "tiny" },
      ],
      tier_limits: {
        tiny: { hot: 1, warm: 1, cold: 1 },
        standard: { hot: 14, warm: 18, cold: 24 },
        deep: { hot: 24, warm: 40, cold: 60 },
      },
      always_hot_kinds: ["identity_trait", "value", "priority", "style_rule"],
    });

    const result = await compile(store, { audience: "owner_private" });

    expect(result.metadata.projection_profile).toBe("tiny");
    expect(result.metadata.hot_count).toBe(1);
  });

  it("prefers the active projection policy when multiple definitions exist", async () => {
    seedObjects();
    store.writeYaml("policy/projection.yaml", {
      items: [
        {
          id: "pol-projection-draft",
          kind: "projection_policy",
          status: "draft",
          default_profiles: {
            owner_private: "deep",
            agent_operational: "standard",
            project_private: "standard",
            shareable: "standard",
            public_safe: "tiny",
          },
          tier_limits: {
            tiny: { hot: 8, warm: 6, cold: 8 },
            standard: { hot: 14, warm: 18, cold: 24 },
            deep: { hot: 24, warm: 40, cold: 60 },
          },
        },
        {
          id: "pol-projection-active",
          kind: "projection_policy",
          status: "active",
          default_profiles: {
            owner_private: "tiny",
            agent_operational: "standard",
            project_private: "standard",
            shareable: "standard",
            public_safe: "tiny",
          },
          channel_profile_rules: [
            { match_prefix: "owner_", profile: "tiny" },
          ],
          tier_limits: {
            tiny: { hot: 1, warm: 1, cold: 1 },
            standard: { hot: 14, warm: 18, cold: 24 },
            deep: { hot: 24, warm: 40, cold: 60 },
          },
        },
      ],
    });

    const result = await compile(store, { audience: "owner_private" });

    expect(result.metadata.projection_profile).toBe("tiny");
    expect(result.metadata.hot_count).toBe(1);
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
    expect(result.bootstrap.memory).toContain("Public fact.");
    expect(result.bootstrap.memory).not.toContain("Private secret.");
  });

  it("does not project private contradictions into public-safe outputs", async () => {
    store.appendYamlItem("core/ratified/facts.yaml", {
      id: "fact-public-1", kind: "fact", statement: "Public fact A.",
      status: "ratified", confidence: 0.9, privacy_scope: "public_safe",
    });
    store.appendYamlItem("core/ratified/facts.yaml", {
      id: "fact-public-2", kind: "fact", statement: "Public fact B.",
      status: "ratified", confidence: 0.9, privacy_scope: "public_safe",
    });
    store.appendYamlItem("core/ratified/contradictions.yaml", {
      id: "ctr-private-001",
      left: "fact-public-1",
      right: "fact-public-2",
      reason: "Private contradiction note.",
      status: "open",
      privacy_scope: "owner_private",
    });

    const result = await compile(store, { audience: "public_safe" });
    expect(result.bootstrap.memory).not.toContain("Private contradiction note.");
  });

  it("writes YAML projection metadata into cold artifacts", async () => {
    seedObjects();

    await compile(store, { audience: "owner_private" });

    const cold = yamlParse(readFileSync(resolve(root, "compiled/cold/deep-recall-index.yaml"), "utf-8")) as Record<string, unknown>;
    expect(cold.projection_metadata).toBeTruthy();
    expect((cold.projection_metadata as Record<string, unknown>).artifact_type).toBe("compiled_cold");
  });
});

describe("buildRuntimeDriftLogInput", () => {
  it("creates canonical runtime drift events for adapters", () => {
    const input = buildRuntimeDriftLogInput({
      path: "compiled/bootstrap/SOUL.md",
      artifact_type: "bootstrap_soul",
      projection_id: "drv-2026-03-29-001",
      audience: "owner_private",
      channel: "owner_private_dm",
      projection_profile: "deep",
      diff_summary: "Style block changed by runtime",
    });

    expect(input.kind).toBe("runtime_drift");
    expect(input.source_type).toBe("runtime_observation");
    expect(input.details).toMatchObject({
      path: "compiled/bootstrap/SOUL.md",
      artifact_type: "bootstrap_soul",
      projection_profile: "deep",
      writeback_mode: "proposal_extraction",
    });
  });
});
