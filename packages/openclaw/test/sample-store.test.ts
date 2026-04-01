import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { CristalinaStore } from "@cristalina/core";
import { syncOpenClawWorkspace, ingestOpenClawWorkspace } from "../src/workspace.js";

let root: string;
let copiedStorePath: string;
let workspacePath: string;

beforeEach(() => {
  root = mkdtempSync(resolve(tmpdir(), "cristalina-openclaw-sample-"));
  copiedStorePath = resolve(root, ".cristalina");
  workspacePath = resolve(root, "workspace");
  cpSync(resolve("..", "..", "examples", "sample-store", ".cristalina"), copiedStorePath, { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("sample store OpenClaw flow", () => {
  it("bootstraps the real sample store and re-ingests a workspace edit", async () => {
    const syncResult = await syncOpenClawWorkspace({
      storePath: copiedStorePath,
      workspacePath,
      audience: "owner_private",
    });

    expect(syncResult.files).toHaveLength(4);
    expect(existsSync(resolve(workspacePath, "SOUL.md"))).toBe(true);
    expect(existsSync(resolve(workspacePath, ".openclaw", "cristalina-projection-manifest.yaml"))).toBe(true);

    const userPath = resolve(workspacePath, "USER.md");
    const previousUser = readFileSync(userPath, "utf-8");
    writeFileSync(
      userPath,
      previousUser.replace(
        "- Default to concise operational mode; expand when the owner signals architectural depth.",
        "- Default to concise operational mode; expand when the owner signals architectural depth.\n- Prefer explicit architecture tradeoffs.",
      ),
      "utf-8",
    );

    const ingestResult = await ingestOpenClawWorkspace({
      storePath: copiedStorePath,
      workspacePath,
      audience: "owner_private",
      refreshAfterIngest: true,
    });

    expect(ingestResult.driftEvents).toBe(1);
    expect(ingestResult.proposals).toBe(1);

    const snapshot = await new CristalinaStore({ root: copiedStorePath }).read();
    expect(
      snapshot.proposals.some((proposal) =>
        typeof proposal.data.candidate_payload === "object"
        && proposal.data.candidate_payload !== null
        && String((proposal.data.candidate_payload as Record<string, unknown>).statement) === "Prefer explicit architecture tradeoffs.",
      ),
    ).toBe(true);
  });
});
