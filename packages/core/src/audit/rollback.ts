import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from "node:fs";
import { resolve, dirname, relative, sep } from "node:path";
import { createHash } from "node:crypto";
import { stringify as yamlStringify, parse as yamlParse } from "yaml";
import type { Clock } from "../clock/clock.js";
import { snapshotDirPath } from "../store/paths.js";
import { ensureDir } from "../store/writer.js";

export interface SnapshotManifest {
  id: string;
  created_at: string;
  reason: string;
  protocol_version: string;
  files: Array<{ path: string; sha256: string; size: number }>;
}

/** Recursively list all files under a directory, returning paths relative to root */
function walkDir(dir: string, root: string): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full, root));
    } else {
      results.push(relative(root, full).replaceAll(sep, "/"));
    }
  }
  return results;
}

/** Create a point-in-time snapshot of core/ and proposals/ */
export async function createSnapshot(
  root: string,
  reason: string,
  clock: Clock,
): Promise<SnapshotManifest> {
  const ts = clock.isoNow();
  const snapDir = resolve(root, snapshotDirPath(ts));
  mkdirSync(snapDir, { recursive: true });

  // Discover files to snapshot
  const dirs = ["core", "proposals"];
  const allFiles: string[] = [];
  for (const d of dirs) {
    allFiles.push(...walkDir(resolve(root, d), root));
  }

  const manifestFiles: SnapshotManifest["files"] = [];

  for (const relPath of allFiles) {
    const srcPath = resolve(root, relPath);
    const destPath = resolve(snapDir, relPath);
    ensureDir(dirname(destPath));

    const content = readFileSync(srcPath);
    writeFileSync(destPath, content);

    const sha256 = createHash("sha256").update(content).digest("hex");
    manifestFiles.push({ path: relPath, sha256, size: content.length });
  }

  const manifest: SnapshotManifest = {
    id: snapshotDirPath(ts),
    created_at: ts,
    reason,
    protocol_version: "1.0-draft",
    files: manifestFiles,
  };

  writeFileSync(
    resolve(snapDir, "manifest.yaml"),
    yamlStringify(manifest, { lineWidth: 120 }),
    "utf-8",
  );

  return manifest;
}

/** Restore from a snapshot directory */
export async function restoreSnapshot(
  root: string,
  snapshotDir: string,
): Promise<SnapshotManifest> {
  const manifestPath = resolve(root, snapshotDir, "manifest.yaml");
  if (!existsSync(manifestPath)) {
    throw new Error(`Snapshot manifest not found: ${manifestPath}`);
  }

  const manifestContent = readFileSync(manifestPath, "utf-8");
  const manifest = yamlParse(manifestContent) as SnapshotManifest;
  const expectedPaths = new Set(manifest.files.map((file) => file.path));

  for (const dir of ["core", "proposals"]) {
    for (const relPath of walkDir(resolve(root, dir), root)) {
      if (!expectedPaths.has(relPath)) {
        rmSync(resolve(root, relPath), { force: true });
      }
    }
  }

  for (const file of manifest.files) {
    const srcPath = resolve(root, snapshotDir, file.path);
    const destPath = resolve(root, file.path);
    ensureDir(dirname(destPath));

    const content = readFileSync(srcPath);

    const sha256 = createHash("sha256").update(content).digest("hex");
    if (sha256 !== file.sha256) {
      throw new Error(`Checksum mismatch for ${file.path}: expected ${file.sha256}, got ${sha256}`);
    }

    writeFileSync(destPath, content);
  }

  return manifest;
}
