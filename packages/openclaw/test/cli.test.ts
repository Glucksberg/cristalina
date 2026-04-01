import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { runOpenClawCli, openClawHelpText } from "../src/cli.js";

let root: string;
let workspacePath: string;
let storePath: string;

function createIo() {
  const logs: string[] = [];
  const errors: string[] = [];
  return {
    logs,
    errors,
    io: {
      log: (message: string) => { logs.push(message); },
      error: (message: string) => { errors.push(message); },
    },
  };
}

beforeEach(() => {
  root = mkdtempSync(resolve(tmpdir(), "cristalina-openclaw-cli-"));
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
`, "utf-8");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("openclaw CLI", () => {
  it("prints help when no command is given", async () => {
    const { io, logs, errors } = createIo();
    const code = await runOpenClawCli([], io);

    expect(code).toBe(1);
    expect(logs[0]).toBe(openClawHelpText());
    expect(errors).toHaveLength(0);
  });

  it("bootstraps a workspace through the CLI contract", async () => {
    const { io, logs, errors } = createIo();
    const code = await runOpenClawCli([
      "bootstrap",
      "--store", storePath,
      "--workspace", workspacePath,
    ], io);

    expect(code).toBe(0);
    expect(errors).toHaveLength(0);
    expect(logs[0]).toContain("OpenClaw bootstrap written");
    expect(existsSync(resolve(workspacePath, "SOUL.md"))).toBe(true);
    expect(existsSync(resolve(workspacePath, "USER.md"))).toBe(true);
  });

  it("ingests drift through the CLI contract", async () => {
    await runOpenClawCli([
      "bootstrap",
      "--store", storePath,
      "--workspace", workspacePath,
    ], createIo().io);

    const userPath = resolve(workspacePath, "USER.md");
    const previousUser = readFileSync(userPath, "utf-8");
    writeFileSync(
      userPath,
      previousUser.replace("- Use concise replies.", "- Use concise replies.\n- Prefer explicit architecture tradeoffs."),
      "utf-8",
    );

    const { io, logs, errors } = createIo();
    const code = await runOpenClawCli([
      "ingest",
      "--store", storePath,
      "--workspace", workspacePath,
    ], io);

    expect(code).toBe(0);
    expect(errors).toHaveLength(0);
    expect(logs.some((line) => line.includes("Drift events: 1"))).toBe(true);
    expect(logs.some((line) => line.includes("Proposals: 1"))).toBe(true);
  });
});
