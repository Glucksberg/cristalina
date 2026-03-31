import { describe, it, expect } from "vitest";
import { computeDiff, formatDiffSummary } from "../../src/audit/diff.js";

describe("computeDiff", () => {
  it("detects changed fields", () => {
    const diff = computeDiff(
      { confidence: 0.5, status: "ratified" },
      { confidence: 0.9, status: "ratified" },
    );
    expect(diff).toHaveProperty("confidence");
    expect(diff.confidence.old).toBe(0.5);
    expect(diff.confidence.new).toBe(0.9);
    expect(diff).not.toHaveProperty("status");
  });

  it("detects added fields", () => {
    const diff = computeDiff({}, { newField: "value" });
    expect(diff).toHaveProperty("newField");
    expect(diff.newField.old).toBeUndefined();
  });

  it("detects removed fields", () => {
    const diff = computeDiff({ old: "value" }, {});
    expect(diff).toHaveProperty("old");
    expect(diff.old.new).toBeUndefined();
  });

  it("returns empty for identical objects", () => {
    const diff = computeDiff({ a: 1, b: "x" }, { a: 1, b: "x" });
    expect(Object.keys(diff)).toHaveLength(0);
  });
});

describe("formatDiffSummary", () => {
  it("formats changes with prefixes", () => {
    const summary = formatDiffSummary({
      confidence: { old: 0.5, new: 0.9 },
      newField: { old: undefined, new: "val" },
      removed: { old: "val", new: undefined },
    });
    expect(summary).toContain("~confidence");
    expect(summary).toContain("+newField");
    expect(summary).toContain("-removed");
  });
});
