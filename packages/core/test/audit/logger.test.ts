import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolve } from "node:path";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { AuditLogger } from "../../src/audit/logger.js";
import type { AuditEntry } from "../../src/operations/types.js";

let root: string;
let logger: AuditLogger;

beforeEach(() => {
  root = resolve(tmpdir(), `cristalina-test-${randomUUID()}`);
  mkdirSync(root, { recursive: true });
  logger = new AuditLogger(root);
});

afterEach(() => {
  rmSync(root, { recursive: true });
});

function makeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    timestamp: "2026-03-29T12:00:00Z",
    operation: "LOG",
    actor: "agent",
    targets: [],
    produced: ["evt-test-001"],
    provenance: "test",
    effects_summary: "test entry",
    ...overrides,
  };
}

describe("AuditLogger", () => {
  it("logs and reads entries", () => {
    logger.log(makeEntry());
    logger.log(makeEntry({ operation: "PROPOSE", produced: ["prop-test-001"] }));
    const entries = logger.readLog();
    expect(entries).toHaveLength(2);
    expect(entries[0].operation).toBe("LOG");
    expect(entries[1].operation).toBe("PROPOSE");
  });

  it("returns empty array for non-existent log", () => {
    expect(logger.readLog()).toHaveLength(0);
  });

  it("filters history by target ID", () => {
    logger.log(makeEntry({ targets: ["fact-001"], produced: ["evt-001"] }));
    logger.log(makeEntry({ targets: ["fact-002"], produced: ["evt-002"] }));
    logger.log(makeEntry({ targets: [], produced: ["fact-001"] }));

    const history = logger.historyFor("fact-001");
    expect(history).toHaveLength(2);
  });
});
