import type { DerivedArtifact, PrivacyScope } from "@cristalina/types";
import type { CristalinaStore } from "../store/store.js";
import { COMPILED_PATHS } from "../store/paths.js";
import { scoreObject, assignTier, filterByAudience, type ScoredObject } from "./scoring.js";
import { renderHot } from "./hot.js";
import { renderWarm } from "./warm.js";
import { renderCold } from "./cold.js";
import { generateBootstrap, type BootstrapFiles } from "./bootstrap.js";
import { writeYamlFile } from "../store/writer.js";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import {
  buildDerivedArtifact,
  buildProjectionManifest,
  wrapProjectionContent,
} from "../adapter/writeback.js";
import { ensureDir } from "../store/writer.js";

export interface CompilationOptions {
  audience: PrivacyScope;
  activeProject?: string;
  channel?: string;
}

export interface CompiledContext {
  hot: string;
  warm: string;
  cold: string;
  bootstrap: BootstrapFiles;
  metadata: {
    compiled_at: string;
    projection_id: string;
    adapter: string;
    audience: PrivacyScope;
    channel?: string;
    writeback_mode: "proposal_extraction";
    hot_count: number;
    warm_count: number;
    cold_count: number;
  };
}

/** Compile context from the store and write compiled files */
export async function compile(
  store: CristalinaStore,
  options: CompilationOptions,
): Promise<CompiledContext> {
  const snapshot = await store.read();
  const now = store.clock.isoNow();
  const projectionId = store.idGen.next("derivedArtifact");
  const channel = options.channel ?? `${options.audience}_runtime`;

  // Filter by audience
  const filtered = filterByAudience(snapshot.coreObjects, options.audience);
  const visibleContradictions = filterByAudience(snapshot.contradictions, options.audience);

  // Score and assign tiers
  const scored: ScoredObject[] = filtered.map((obj) => {
    const score = scoreObject(obj, now);
    const tier = assignTier(obj, score);
    return { object: obj, score, tier };
  });

  // Sort by score descending within each tier
  scored.sort((a, b) => b.score - a.score);

  const hotObjects = scored.filter((o) => o.tier === "hot");
  const warmObjects = scored.filter((o) => o.tier === "warm");
  const coldObjects = scored.filter((o) => o.tier === "cold");

  // Render tiers
  const hot = renderHot(hotObjects, visibleContradictions);
  const warm = renderWarm(warmObjects);
  const cold = renderCold(coldObjects);

  // Generate bootstrap
  const bootstrap = generateBootstrap(snapshot.coreObjects, visibleContradictions, options.audience);

  const derivedFrom = [
    ...filtered.map((obj) => String(obj.data.id)).filter((id) => id !== "undefined"),
    ...visibleContradictions
      .map((obj) => obj.data.status === "open" ? String(obj.data.id) : null)
      .filter((id): id is string => id !== null),
  ];

  const artifacts = buildArtifacts({
    store,
    now,
    projectionId,
    audience: options.audience,
    channel,
    derivedFrom,
    contents: {
      [COMPILED_PATHS.hot]: hot,
      [COMPILED_PATHS.warm]: warm,
      [COMPILED_PATHS.cold]: cold,
      [COMPILED_PATHS.bootstrapSoul]: bootstrap.soul,
      [COMPILED_PATHS.bootstrapValue]: bootstrap.value,
      [COMPILED_PATHS.bootstrapUser]: bootstrap.user,
      [COMPILED_PATHS.bootstrapMemory]: bootstrap.memory,
    },
  });

  for (const artifact of artifacts) {
    const raw = artifact.path === COMPILED_PATHS.hot ? hot
      : artifact.path === COMPILED_PATHS.warm ? warm
      : artifact.path === COMPILED_PATHS.cold ? cold
      : artifact.path === COMPILED_PATHS.bootstrapSoul ? bootstrap.soul
      : artifact.path === COMPILED_PATHS.bootstrapValue ? bootstrap.value
      : artifact.path === COMPILED_PATHS.bootstrapUser ? bootstrap.user
      : bootstrap.memory;
    writeTextFile(store.root, artifact.path, wrapProjectionContent({ artifact, body: raw }));
  }

  writeYamlFile(
    store.root,
    COMPILED_PATHS.projectionManifest,
    buildProjectionManifest(projectionId, now, options.audience, artifacts, channel) as unknown as Record<string, unknown>,
  );

  store.invalidate();

  const metadata = {
    compiled_at: now,
    projection_id: projectionId,
    adapter: "cristalina-openclaw",
    audience: options.audience,
    channel,
    writeback_mode: "proposal_extraction" as const,
    hot_count: hotObjects.length,
    warm_count: warmObjects.length,
    cold_count: coldObjects.length,
  };

  return { hot, warm, cold, bootstrap, metadata };
}

function writeTextFile(root: string, relPath: string, content: string): void {
  const fullPath = resolve(root, relPath);
  ensureDir(dirname(fullPath));
  writeFileSync(fullPath, content, "utf-8");
}

function buildArtifacts(args: {
  store: CristalinaStore;
  now: string;
  projectionId: string;
  audience: PrivacyScope;
  channel: string;
  derivedFrom: string[];
  contents: Record<string, string>;
}): DerivedArtifact[] {
  const artifactOrder = [
    [COMPILED_PATHS.hot, "compiled_hot"],
    [COMPILED_PATHS.warm, "compiled_warm"],
    [COMPILED_PATHS.cold, "compiled_cold"],
    [COMPILED_PATHS.bootstrapSoul, "bootstrap_soul"],
    [COMPILED_PATHS.bootstrapValue, "bootstrap_value"],
    [COMPILED_PATHS.bootstrapUser, "bootstrap_user"],
    [COMPILED_PATHS.bootstrapMemory, "bootstrap_memory"],
  ] as const;

  return artifactOrder.map(([path, artifact_type]) =>
    buildDerivedArtifact({
      id: args.store.idGen.next("derivedArtifact"),
      artifact_type,
      created_at: args.now,
      derived_from: args.derivedFrom,
      intended_audience: args.audience,
      channel: args.channel,
      projection_id: args.projectionId,
      path,
    }, args.contents[path]),
  );
}

export { generateBootstrap, type BootstrapFiles } from "./bootstrap.js";
