import type { PrivacyScope } from "@cristalina/types";
import type { CristalinaStore } from "../store/store.js";
import { COMPILED_PATHS } from "../store/paths.js";
import { scoreObject, assignTier, filterByAudience, type ScoredObject } from "./scoring.js";
import { renderHot } from "./hot.js";
import { renderWarm } from "./warm.js";
import { renderCold } from "./cold.js";
import { generateBootstrap, type BootstrapFiles } from "./bootstrap.js";
import { writeYamlFile } from "../store/writer.js";
import { appendLogLine, ensureDir } from "../store/writer.js";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";

export interface CompilationOptions {
  audience: PrivacyScope;
  activeProject?: string;
}

export interface CompiledContext {
  hot: string;
  warm: string;
  cold: string;
  bootstrap: BootstrapFiles;
  metadata: {
    compiled_at: string;
    audience: PrivacyScope;
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

  // Filter by audience
  const filtered = filterByAudience(snapshot.coreObjects, options.audience);

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
  const hot = renderHot(hotObjects, snapshot.contradictions);
  const warm = renderWarm(warmObjects);
  const cold = renderCold(coldObjects);

  // Generate bootstrap
  const bootstrap = generateBootstrap(snapshot.coreObjects, snapshot.contradictions, options.audience);

  // Write files
  writeTextFile(store.root, COMPILED_PATHS.hot, hot);
  writeTextFile(store.root, COMPILED_PATHS.cold, cold);
  writeTextFile(store.root, COMPILED_PATHS.bootstrapSoul, bootstrap.soul);
  writeTextFile(store.root, COMPILED_PATHS.bootstrapValue, bootstrap.value);
  writeTextFile(store.root, COMPILED_PATHS.bootstrapUser, bootstrap.user);
  writeTextFile(store.root, COMPILED_PATHS.bootstrapMemory, bootstrap.memory);

  store.invalidate();

  const metadata = {
    compiled_at: now,
    audience: options.audience,
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

export { generateBootstrap, type BootstrapFiles } from "./bootstrap.js";
