import { describe, it, expect } from "vitest";
import { snapshotExpectations } from "../../src/snapshot/expectations.js";
import type { ParsedStore } from "../../src/store/reader.js";

function makeStore(files: string[]): ParsedStore {
  return {
    root: "/test", manifest: null, manifestFile: null,
    events: [], proposals: [], curationPackets: [], coreObjects: [], entities: [], policyObjects: [], contradictions: [],
    files, parseErrors: [],
  };
}

describe("snapshotExpectations rule", () => {
  it("reports info when no backups directory", () => {
    const diags = snapshotExpectations(makeStore([]));
    expect(diags.some((d) => d.rule === "snapshot-expectations/no-backups")).toBe(true);
    expect(diags[0].severity).toBe("info");
  });

  it("reports info when backups exists but no snapshots", () => {
    const diags = snapshotExpectations(makeStore(["backups/readme.md"]));
    expect(diags.some((d) => d.rule === "snapshot-expectations/no-snapshots")).toBe(true);
  });

  it("passes when snapshots directory exists", () => {
    const diags = snapshotExpectations(makeStore(["backups/snapshots/2026-03-29/manifest.yaml"]));
    expect(diags).toHaveLength(0);
  });
});
