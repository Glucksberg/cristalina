import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolve } from "node:path";
import { mkdirSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { parse as yamlParse } from "yaml";
import {
  appendJsonlLine, writeYamlFile, appendToYamlItems, updateYamlItem, appendLogLine,
} from "../../src/store/writer.js";

let root: string;

beforeEach(() => {
  root = resolve(tmpdir(), `cristalina-test-${randomUUID()}`);
  mkdirSync(root, { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true });
});

describe("appendJsonlLine", () => {
  it("creates file and appends JSON line", () => {
    appendJsonlLine(root, "events/2026-03/2026-03-29.jsonl", { id: "evt-001", kind: "heartbeat" });
    const content = readFileSync(resolve(root, "events/2026-03/2026-03-29.jsonl"), "utf-8");
    const parsed = JSON.parse(content.trim());
    expect(parsed.id).toBe("evt-001");
  });

  it("appends multiple lines", () => {
    appendJsonlLine(root, "events/2026-03/test.jsonl", { id: "a" });
    appendJsonlLine(root, "events/2026-03/test.jsonl", { id: "b" });
    const lines = readFileSync(resolve(root, "events/2026-03/test.jsonl"), "utf-8").trim().split("\n");
    expect(lines).toHaveLength(2);
  });
});

describe("writeYamlFile", () => {
  it("writes a YAML file", () => {
    writeYamlFile(root, "core/ratified/facts.yaml", { items: [{ id: "fact-001" }] });
    const content = readFileSync(resolve(root, "core/ratified/facts.yaml"), "utf-8");
    const parsed = yamlParse(content);
    expect(parsed.items[0].id).toBe("fact-001");
  });

  it("creates parent directories", () => {
    writeYamlFile(root, "deep/nested/dir/file.yaml", { test: true });
    expect(existsSync(resolve(root, "deep/nested/dir/file.yaml"))).toBe(true);
  });
});

describe("appendToYamlItems", () => {
  it("creates file with items array if not exists", () => {
    appendToYamlItems(root, "core/ratified/facts.yaml", { id: "fact-001", statement: "test" });
    const content = readFileSync(resolve(root, "core/ratified/facts.yaml"), "utf-8");
    const parsed = yamlParse(content);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].id).toBe("fact-001");
  });

  it("appends to existing items array", () => {
    appendToYamlItems(root, "core/ratified/facts.yaml", { id: "fact-001" });
    appendToYamlItems(root, "core/ratified/facts.yaml", { id: "fact-002" });
    const content = readFileSync(resolve(root, "core/ratified/facts.yaml"), "utf-8");
    const parsed = yamlParse(content);
    expect(parsed.items).toHaveLength(2);
  });
});

describe("updateYamlItem", () => {
  it("updates an existing item by ID", () => {
    appendToYamlItems(root, "core/ratified/facts.yaml", { id: "fact-001", confidence: 0.5 });
    const updated = updateYamlItem(root, "core/ratified/facts.yaml", "fact-001", { confidence: 0.9 });
    expect(updated).toBe(true);
    const content = readFileSync(resolve(root, "core/ratified/facts.yaml"), "utf-8");
    const parsed = yamlParse(content);
    expect(parsed.items[0].confidence).toBe(0.9);
  });

  it("returns false for non-existent ID", () => {
    appendToYamlItems(root, "core/ratified/facts.yaml", { id: "fact-001" });
    expect(updateYamlItem(root, "core/ratified/facts.yaml", "fact-999", { confidence: 0.9 })).toBe(false);
  });

  it("returns false for non-existent file", () => {
    expect(updateYamlItem(root, "does-not-exist.yaml", "fact-001", {})).toBe(false);
  });
});

describe("appendLogLine", () => {
  it("appends to log file", () => {
    appendLogLine(root, "audits/changes.log", '{"op":"LOG"}');
    appendLogLine(root, "audits/changes.log", '{"op":"PROPOSE"}');
    const content = readFileSync(resolve(root, "audits/changes.log"), "utf-8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(2);
  });
});
