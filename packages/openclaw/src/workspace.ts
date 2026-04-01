import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { parse as yamlParse } from "yaml";
import {
  CristalinaStore,
  compile,
  ingestProjectionDrift,
  type CompilationOptions,
} from "@cristalina/core";

export interface OpenClawSyncOptions extends CompilationOptions {
  storePath: string;
  workspacePath: string;
}

export interface OpenClawIngestOptions extends CompilationOptions {
  storePath: string;
  workspacePath: string;
  actor?: string;
  refreshAfterIngest?: boolean;
}

export interface SyncedWorkspaceFile {
  workspaceFile: string;
  compiledPath: string;
}

export interface OpenClawSyncResult {
  storePath: string;
  workspacePath: string;
  projectionId: string;
  files: SyncedWorkspaceFile[];
}

export interface OpenClawIngestResult {
  storePath: string;
  workspacePath: string;
  driftEvents: number;
  proposals: number;
  changedFiles: string[];
}

const OPENCLAW_BOOTSTRAP_FILES = [
  ["SOUL.md", "compiled/bootstrap/SOUL.md", "bootstrap_soul"],
  ["VALUE.md", "compiled/bootstrap/VALUE.md", "bootstrap_value"],
  ["USER.md", "compiled/bootstrap/USER.md", "bootstrap_user"],
  ["MEMORY.md", "compiled/bootstrap/MEMORY.md", "bootstrap_memory"],
] as const;

const WORKSPACE_METADATA_DIR = ".openclaw";
const WORKSPACE_MANIFEST_FILE = "cristalina-projection-manifest.yaml";

function channelCompiledPath(channel: string, compiledPath: string): string {
  const relative = compiledPath.startsWith("compiled/") ? compiledPath.slice("compiled/".length) : compiledPath;
  return `compiled/channels/${channel}/${relative}`;
}

function compiledProjectionPath(channel: string | undefined, compiledPath: string): string {
  return channel ? channelCompiledPath(channel, compiledPath) : compiledPath;
}

function metadataManifestPath(workspacePath: string): string {
  return resolve(workspacePath, WORKSPACE_METADATA_DIR, WORKSPACE_MANIFEST_FILE);
}

function ensureParentDir(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
}

function readYamlRecord(path: string): Record<string, unknown> {
  return yamlParse(readFileSync(path, "utf-8")) as Record<string, unknown>;
}

function parseProjectionMetadata(storePath: string, audience: string, channel?: string): {
  projectionId: string;
  projectionProfile: string;
} {
  const manifestPath = resolve(
    storePath,
    compiledProjectionPath(channel, "compiled/metadata/projection-manifest.yaml"),
  );

  if (!existsSync(manifestPath)) {
    throw new Error(`Projection manifest not found at ${manifestPath}. Run bootstrap first.`);
  }

  const manifest = readYamlRecord(manifestPath);
  const manifestAudience = String(manifest.audience ?? "");
  if (manifestAudience && manifestAudience !== audience) {
    throw new Error(
      `Projection manifest audience mismatch: expected ${audience}, found ${manifestAudience}. Re-run bootstrap with the same audience.`,
    );
  }

  return {
    projectionId: String(manifest.projection_id),
    projectionProfile: String(manifest.projection_profile),
  };
}

export async function syncOpenClawWorkspace(options: OpenClawSyncOptions): Promise<OpenClawSyncResult> {
  const storePath = resolve(options.storePath);
  const workspacePath = resolve(options.workspacePath);
  const store = new CristalinaStore({ root: storePath });
  const compiled = await compile(store, {
    audience: options.audience,
    channel: options.channel,
    profile: options.profile,
    activeProject: options.activeProject,
  });

  const synced: SyncedWorkspaceFile[] = [];

  for (const [workspaceFile, compiledFile] of OPENCLAW_BOOTSTRAP_FILES) {
    const source = resolve(storePath, compiledProjectionPath(compiled.metadata.channel, compiledFile));
    const target = resolve(workspacePath, workspaceFile);
    ensureParentDir(target);
    writeFileSync(target, readFileSync(source, "utf-8"), "utf-8");
    synced.push({ workspaceFile, compiledPath: source });
  }

  const manifestSource = resolve(
    storePath,
    compiledProjectionPath(compiled.metadata.channel, "compiled/metadata/projection-manifest.yaml"),
  );
  const manifestTarget = metadataManifestPath(workspacePath);
  ensureParentDir(manifestTarget);
  writeFileSync(manifestTarget, readFileSync(manifestSource, "utf-8"), "utf-8");

  return {
    storePath,
    workspacePath,
    projectionId: compiled.metadata.projection_id,
    files: synced,
  };
}

export async function ingestOpenClawWorkspace(options: OpenClawIngestOptions): Promise<OpenClawIngestResult> {
  const storePath = resolve(options.storePath);
  const workspacePath = resolve(options.workspacePath);
  const store = new CristalinaStore({ root: storePath });
  const metadata = parseProjectionMetadata(storePath, options.audience, options.channel);

  let driftEvents = 0;
  let proposals = 0;
  const changedFiles: string[] = [];

  for (const [workspaceFile, compiledFile, artifactType] of OPENCLAW_BOOTSTRAP_FILES) {
    const workspaceFullPath = resolve(workspacePath, workspaceFile);
    if (!existsSync(workspaceFullPath)) continue;

    const compiledFullPath = resolve(storePath, compiledProjectionPath(options.channel, compiledFile));
    if (!existsSync(compiledFullPath)) continue;

    const previous = readFileSync(compiledFullPath, "utf-8");
    const current = readFileSync(workspaceFullPath, "utf-8");
    if (previous === current) continue;

    const result = await ingestProjectionDrift(store, {
      path: compiledProjectionPath(options.channel, compiledFile),
      artifact_type: artifactType,
      projection_id: metadata.projectionId,
      audience: options.audience,
      channel: options.channel,
      projection_profile: metadata.projectionProfile as "tiny" | "standard" | "deep",
      diff_summary: `Workspace edit detected in ${workspaceFile}`,
      previous_content: previous,
      current_content: current,
      actor: options.actor ?? "openclaw-runtime",
    });

    driftEvents += 1;
    proposals += result.proposals.length;
    changedFiles.push(workspaceFile);
  }

  if (options.refreshAfterIngest && changedFiles.length > 0) {
    await syncOpenClawWorkspace({
      storePath,
      workspacePath,
      audience: options.audience,
      channel: options.channel,
      profile: options.profile,
      activeProject: options.activeProject,
    });
  }

  return {
    storePath,
    workspacePath,
    driftEvents,
    proposals,
    changedFiles,
  };
}

export function parseOpenClawCliArgs(argv: string[]) {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      store: { type: "string", default: ".cristalina" },
      workspace: { type: "string", default: "." },
      audience: { type: "string", default: "owner_private" },
      channel: { type: "string" },
      profile: { type: "string" },
      actor: { type: "string" },
      refresh: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  return { command: positionals[0], values };
}
