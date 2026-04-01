import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { fileURLToPath } from "node:url";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { runCristalinaCli, cristalinaHelpText } from "../src/runner.js";

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
  root = mkdtempSync(resolve(tmpdir(), "cristalina-cli-"));
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

describe("cristalina CLI", () => {
  it("prints root help", async () => {
    const { io, logs, errors } = createIo();
    const code = await runCristalinaCli([], io);

    expect(code).toBe(1);
    expect(logs[0]).toBe(cristalinaHelpText());
    expect(errors).toHaveLength(0);
  });

  it("routes validate commands", async () => {
    const { io, logs, errors } = createIo();
    const sampleStore = fileURLToPath(new URL("../../../examples/sample-store/.cristalina", import.meta.url));
    const code = await runCristalinaCli(["validate", "lint", sampleStore, "--json"], io);

    expect(code).toBe(0);
    expect(errors).toHaveLength(0);
    const result = JSON.parse(logs[0]) as { errorCount: number };
    expect(result.errorCount).toBe(0);
  });

  it("routes openclaw bootstrap commands", async () => {
    const { io, logs, errors } = createIo();
    const code = await runCristalinaCli([
      "openclaw",
      "bootstrap",
      "--store", storePath,
      "--workspace", workspacePath,
    ], io);

    expect(code).toBe(0);
    expect(errors).toHaveLength(0);
    expect(logs.some((line) => line.includes("OpenClaw bootstrap written"))).toBe(true);
    expect(existsSync(resolve(workspacePath, "SOUL.md"))).toBe(true);
  });
});
