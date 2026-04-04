import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { buildPortalSnapshot } from "../src/snapshot.js";

let root: string;
let storePath: string;

beforeEach(() => {
  root = mkdtempSync(resolve(tmpdir(), "cristalina-portal-snapshot-"));
  storePath = resolve(root, ".cristalina");
  cpSync(resolve("..", "..", "examples", "sample-store", ".cristalina"), storePath, { recursive: true });
  rmSync(resolve(storePath, "compiled"), { recursive: true, force: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("buildPortalSnapshot", () => {
  it("builds a live snapshot even when compiled artifacts are absent", async () => {
    const snapshot = await buildPortalSnapshot({ storePath });

    expect(snapshot.manifest.displayName).toBe("Cristalina Sample Store");
    expect(snapshot.health.errorCount).toBe(0);
    expect(snapshot.runtimeMap.stages).toHaveLength(5);
    expect(snapshot.runtimeMap.reasoningHotspots.length).toBeGreaterThan(0);
    expect(snapshot.fileAtlas.some((card) => card.path === "core/identity/soul.yaml" && card.present)).toBe(true);
    expect(snapshot.projections.find((card) => card.id === "memory")?.excerpt.length).toBeGreaterThan(0);
    expect(snapshot.recent.events.length).toBeGreaterThan(0);
  });
});
