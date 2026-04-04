import type { DerivedArtifact, PrivacyScope, ProjectionProfile } from "@cristalina/types";
import type { CristalinaStore } from "../store/store.js";
import { COMPILED_PATHS, namespacedCompiledPaths } from "../store/paths.js";
import { scoreObject, assignTier, filterByAudience, type ScoredObject } from "./scoring.js";
import { renderHot } from "./hot.js";
import { renderWarm } from "./warm.js";
import { renderCold } from "./cold.js";
import { generateBootstrap, type BootstrapFiles } from "./bootstrap.js";
import { writeYamlFile, ensureDir } from "../store/writer.js";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import {
  buildDerivedArtifact,
  buildProjectionManifest,
  wrapProjectionContent,
} from "../adapter/writeback.js";
import { resolveChannelProjectionContext } from "./channel.js";
import { resolvePolicyBundle } from "../policy/resolver.js";
import { type ProjectionPolicy } from "../policy/runtime.js";

export interface CompilationOptions {
  audience: PrivacyScope;
  activeProject?: string;
  channel?: string;
  profile?: ProjectionProfile;
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
    projection_profile: ProjectionProfile;
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
  const policies = resolvePolicyBundle(snapshot);
  const now = store.clock.isoNow();
  const projectionId = store.idGen.next("derivedArtifact");
  const channelContext = resolveChannelProjectionContext(
    options.audience,
    options.channel,
    options.profile,
    policies.projection,
  );
  const channel = channelContext.normalizedChannel;
  const compiledPaths = namespacedCompiledPaths(channel);

  const filtered = filterByAudience(snapshot.coreObjects, options.audience, policies.audience);
  const visibleContradictions = filterByAudience(snapshot.contradictions, options.audience, policies.audience);

  const scored: ScoredObject[] = filtered.map((obj) => {
    const score = scoreObject(obj, now, policies.projection, options.activeProject);
    const tier = assignTier(obj, score, policies.projection, options.activeProject);
    return { object: obj, score, tier };
  });

  scored.sort((a, b) => b.score - a.score);

  const hotObjects = limitTier(scored.filter((o) => o.tier === "hot"), channelContext.profile, "hot", policies.projection);
  const warmObjects = limitTier(scored.filter((o) => o.tier === "warm"), channelContext.profile, "warm", policies.projection);
  const coldObjects = limitTier(scored.filter((o) => o.tier === "cold"), channelContext.profile, "cold", policies.projection);

  const hot = renderHot(hotObjects, visibleContradictions);
  const warm = renderWarm(warmObjects);
  const cold = renderCold(coldObjects);
  const bootstrap = generateBootstrap(
    snapshot.coreObjects,
    visibleContradictions,
    options.audience,
    channelContext.profile,
    {
      activeProject: options.activeProject,
      recentEvents: snapshot.events,
    },
  );

  const derivedFrom = [
    ...filtered.map((obj) => String(obj.data.id)).filter((id) => id !== "undefined"),
    ...visibleContradictions
      .map((obj) => obj.data.status === "open" ? String(obj.data.id) : null)
      .filter((id): id is string => id !== null),
  ];

  const contents = {
    [compiledPaths.hot]: hot,
    [compiledPaths.warm]: warm,
    [compiledPaths.cold]: cold,
    [compiledPaths.bootstrapSoul]: bootstrap.soul,
    [compiledPaths.bootstrapValue]: bootstrap.value,
    [compiledPaths.bootstrapUser]: bootstrap.user,
    [compiledPaths.bootstrapMemory]: bootstrap.memory,
  } satisfies Record<string, string>;

  const artifacts = buildArtifacts({
    store,
    now,
    projectionId,
    audience: options.audience,
    channel,
    profile: channelContext.profile,
    paths: compiledPaths,
    derivedFrom,
    contents,
  });

  for (const artifact of artifacts) {
    writeTextFile(store.root, artifact.path, wrapProjectionContent({ artifact, body: contents[artifact.path] }));
  }

  const manifest = buildProjectionManifest(
    projectionId,
    now,
    options.audience,
    artifacts,
    channelContext.profile,
    channel,
  ) as unknown as Record<string, unknown>;

  writeYamlFile(store.root, compiledPaths.projectionManifest, manifest);

  if (channelContext.useCompatibilityAlias) {
    writeCompatibilityAlias(store.root, artifacts, contents);
    writeYamlFile(store.root, COMPILED_PATHS.projectionManifest, manifest);
  }

  store.invalidate();

  const metadata = {
    compiled_at: now,
    projection_id: projectionId,
    adapter: "cristalina-openclaw",
    audience: options.audience,
    channel,
    projection_profile: channelContext.profile,
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
  profile: ProjectionProfile;
  paths: ReturnType<typeof namespacedCompiledPaths>;
  derivedFrom: string[];
  contents: Record<string, string>;
}): DerivedArtifact[] {
  const artifactOrder = [
    [args.paths.hot, "compiled_hot"],
    [args.paths.warm, "compiled_warm"],
    [args.paths.cold, "compiled_cold"],
    [args.paths.bootstrapSoul, "bootstrap_soul"],
    [args.paths.bootstrapValue, "bootstrap_value"],
    [args.paths.bootstrapUser, "bootstrap_user"],
    [args.paths.bootstrapMemory, "bootstrap_memory"],
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
      projection_profile: args.profile,
      path,
    }, args.contents[path]),
  );
}

function tierLimit(
  profile: ProjectionProfile,
  tier: "hot" | "warm" | "cold",
  policy: ProjectionPolicy,
): number {
  return policy.tierLimits[profile][tier];
}

function limitTier(
  objects: ScoredObject[],
  profile: ProjectionProfile,
  tier: "hot" | "warm" | "cold",
  policy: ProjectionPolicy,
): ScoredObject[] {
  return objects.slice(0, tierLimit(profile, tier, policy));
}

function writeCompatibilityAlias(
  root: string,
  artifacts: DerivedArtifact[],
  contents: Record<string, string>,
): void {
  const aliasMap = new Map<string, string>([
    ["compiled_hot", COMPILED_PATHS.hot],
    ["compiled_warm", COMPILED_PATHS.warm],
    ["compiled_cold", COMPILED_PATHS.cold],
    ["bootstrap_soul", COMPILED_PATHS.bootstrapSoul],
    ["bootstrap_value", COMPILED_PATHS.bootstrapValue],
    ["bootstrap_user", COMPILED_PATHS.bootstrapUser],
    ["bootstrap_memory", COMPILED_PATHS.bootstrapMemory],
  ]);

  for (const artifact of artifacts) {
    const aliasPath = aliasMap.get(artifact.artifact_type);
    if (!aliasPath) continue;
    writeTextFile(root, aliasPath, wrapProjectionContent({
      artifact: {
        ...artifact,
        path: aliasPath,
      },
      body: contents[artifact.path],
    }));
  }
}

export { generateBootstrap, type BootstrapFiles } from "./bootstrap.js";
