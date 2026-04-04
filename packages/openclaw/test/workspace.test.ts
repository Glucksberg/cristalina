import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { CristalinaStore, compile } from "@cristalina/core";
import { syncOpenClawWorkspace, ingestOpenClawWorkspace } from "../src/workspace.js";

let root: string;
let workspacePath: string;
let storePath: string;

beforeEach(() => {
  root = mkdtempSync(resolve(tmpdir(), "cristalina-openclaw-"));
  workspacePath = resolve(root, "workspace");
  storePath = resolve(root, ".cristalina");
  mkdirSync(workspacePath, { recursive: true });
  mkdirSync(resolve(storePath, "entities"), { recursive: true });
  mkdirSync(resolve(storePath, "core", "ratified"), { recursive: true });

  writeFileSync(resolve(storePath, "entities", "registry.yaml"), `items:
  - id: ent-owner
    kind: owner
    name: Owner
    status: active
    privacy_scope: owner_private
`, "utf-8");

  writeFileSync(resolve(storePath, "core", "ratified", "facts.yaml"), `items:
  - id: pref-001
    kind: preference
    statement: Use concise replies.
    status: ratified
    confidence: 0.9
    source_type: human_reply
    source_ref: q-1
    created_at: 2026-03-29T02:00:00Z
    last_confirmed_at: 2026-03-29T02:00:00Z
    confirmed_by: owner
    evidence_count: 1
    privacy_scope: owner_private
  - id: fact-001
    kind: fact
    statement: The user is building Cristalina.
    status: ratified
    confidence: 0.95
    source_type: human_reply
    source_ref: q-2
    created_at: 2026-03-29T02:05:00Z
    last_confirmed_at: 2026-03-29T02:05:00Z
    confirmed_by: owner
    evidence_count: 1
    privacy_scope: owner_private
`, "utf-8");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("syncOpenClawWorkspace", () => {
  it("writes bootstrap files and workspace metadata", async () => {
    const result = await syncOpenClawWorkspace({
      storePath,
      workspacePath,
      audience: "owner_private",
    });

    expect(result.files).toHaveLength(4);
    expect(existsSync(resolve(workspacePath, "SOUL.md"))).toBe(true);
    expect(existsSync(resolve(workspacePath, "VALUE.md"))).toBe(true);
    expect(existsSync(resolve(workspacePath, "USER.md"))).toBe(true);
    expect(existsSync(resolve(workspacePath, "MEMORY.md"))).toBe(true);
    expect(existsSync(resolve(workspacePath, ".openclaw", "cristalina-projection-manifest.yaml"))).toBe(true);
    expect(existsSync(resolve(workspacePath, ".openclaw", "baseline", "USER.md"))).toBe(true);
  });

  it("refuses to overwrite workspace files when un-ingested drift is present", async () => {
    await syncOpenClawWorkspace({
      storePath,
      workspacePath,
      audience: "owner_private",
    });

    const userPath = resolve(workspacePath, "USER.md");
    writeFileSync(
      userPath,
      `${readFileSync(userPath, "utf-8")}\n- Runtime-local change not yet ingested.\n`,
      "utf-8",
    );

    await expect(syncOpenClawWorkspace({
      storePath,
      workspacePath,
      audience: "owner_private",
    })).rejects.toThrow("Workspace has un-ingested runtime drift");
  });
});

describe("ingestOpenClawWorkspace", () => {
  it("turns edited workspace files into governed proposals", async () => {
    await syncOpenClawWorkspace({
      storePath,
      workspacePath,
      audience: "owner_private",
    });

    const userPath = resolve(workspacePath, "USER.md");
    const previousUser = readFileSync(userPath, "utf-8");
    writeFileSync(
      userPath,
      previousUser.replace("- Use concise replies.", "- Use concise replies.\n- Prefer explicit architecture tradeoffs."),
      "utf-8",
    );

    const result = await ingestOpenClawWorkspace({
      storePath,
      workspacePath,
      audience: "owner_private",
    });

    expect(result.driftEvents).toBe(1);
    expect(result.proposals).toBe(1);
    expect(result.diagnostics).toEqual([]);

    const snapshot = await new CristalinaStore({ root: storePath }).read();
    expect(
      snapshot.proposals.some((proposal) =>
        typeof proposal.data.candidate_payload === "object"
        && proposal.data.candidate_payload !== null
        && String((proposal.data.candidate_payload as Record<string, unknown>).statement) === "Prefer explicit architecture tradeoffs.",
      ),
    ).toBe(true);
  });

  it("uses the workspace baseline so repeated ingest stays idempotent", async () => {
    await syncOpenClawWorkspace({
      storePath,
      workspacePath,
      audience: "owner_private",
    });

    const userPath = resolve(workspacePath, "USER.md");
    const previousUser = readFileSync(userPath, "utf-8");
    writeFileSync(
      userPath,
      previousUser.replace("- Use concise replies.", "- Use concise replies.\n- Prefer explicit architecture tradeoffs."),
      "utf-8",
    );

    const first = await ingestOpenClawWorkspace({
      storePath,
      workspacePath,
      audience: "owner_private",
    });
    const second = await ingestOpenClawWorkspace({
      storePath,
      workspacePath,
      audience: "owner_private",
    });

    expect(first.driftEvents).toBe(1);
    expect(first.proposals).toBe(1);
    expect(second.driftEvents).toBe(0);
    expect(second.proposals).toBe(0);
  });

  it("does not treat a newer store compile as workspace drift when the workspace itself is untouched", async () => {
    await syncOpenClawWorkspace({
      storePath,
      workspacePath,
      audience: "owner_private",
    });

    writeFileSync(resolve(storePath, "core", "ratified", "facts.yaml"), `items:
  - id: pref-001
    kind: preference
    statement: Use concise replies.
    status: ratified
    confidence: 0.9
    source_type: human_reply
    source_ref: q-1
    created_at: 2026-03-29T02:00:00Z
    last_confirmed_at: 2026-03-29T02:00:00Z
    confirmed_by: owner
    evidence_count: 1
    privacy_scope: owner_private
  - id: fact-001
    kind: fact
    statement: The user is building Cristalina.
    status: ratified
    confidence: 0.95
    source_type: human_reply
    source_ref: q-2
    created_at: 2026-03-29T02:05:00Z
    last_confirmed_at: 2026-03-29T02:05:00Z
    confirmed_by: owner
    evidence_count: 1
    privacy_scope: owner_private
  - id: fact-002
    kind: fact
    statement: The store changed after bootstrap.
    status: ratified
    confidence: 0.8
    source_type: human_reply
    source_ref: q-3
    created_at: 2026-03-29T02:10:00Z
    last_confirmed_at: 2026-03-29T02:10:00Z
    confirmed_by: owner
    evidence_count: 1
    privacy_scope: owner_private
`, "utf-8");

    await compile(new CristalinaStore({ root: storePath }), { audience: "owner_private" });

    const result = await ingestOpenClawWorkspace({
      storePath,
      workspacePath,
      audience: "owner_private",
    });

    expect(result.driftEvents).toBe(0);
    expect(result.proposals).toBe(0);
  });

  it("reports drift-only edits explicitly when no machine-safe proposals can be extracted", async () => {
    await syncOpenClawWorkspace({
      storePath,
      workspacePath,
      audience: "owner_private",
    });

    const soulPath = resolve(workspacePath, "SOUL.md");
    writeFileSync(
      soulPath,
      `${readFileSync(soulPath, "utf-8")}\n## Private reflection\n- This note should stay observational only.\n`,
      "utf-8",
    );

    const result = await ingestOpenClawWorkspace({
      storePath,
      workspacePath,
      audience: "owner_private",
    });

    expect(result.driftEvents).toBe(1);
    expect(result.proposals).toBe(0);
    expect(result.diagnostics).toEqual([
      {
        file: "SOUL.md",
        code: "drift_only",
        message: "Workspace edit was recorded as runtime drift evidence only; no machine-safe proposals were extracted.",
      },
    ]);
  });
});
