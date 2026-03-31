import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { lintStore } from "../../src/store/linter.js";

const FIXTURES = resolve(import.meta.dirname, "../fixtures");

describe("lintStore", () => {
  it("valid store should have zero errors (excluding manifest)", async () => {
    const result = await lintStore(resolve(FIXTURES, "valid-store"));
    // Exclude manifest/missing since test fixtures are not full repos
    const errors = result.diagnostics.filter(
      (d) => d.severity === "error" && d.rule !== "manifest/missing",
    );
    if (errors.length > 0) {
      console.log("Unexpected errors:", errors);
    }
    expect(errors).toHaveLength(0);
    expect(result.fileCount).toBeGreaterThan(0);
    expect(result.objectCount).toBeGreaterThan(0);
  });

  it("invalid store should report errors", async () => {
    const result = await lintStore(resolve(FIXTURES, "invalid-store"));
    expect(result.errorCount).toBeGreaterThan(0);

    const rules = new Set(result.diagnostics.map((d) => d.rule));
    // Should detect schema issues
    expect(rules).toContain("schema-conformance/event");
    expect(rules).toContain("schema-conformance/proposal");
    // Should detect missing provenance
    expect(rules).toContain("required-provenance/missing");
    // Should detect supersession orphans
    expect(rules).toContain("supersession-integrity/missing-target");
    // Should detect crystallized low confidence
    expect(rules).toContain("status-consistency/crystallized-low-confidence");
    // Should detect deprecated without successor
    expect(
      result.diagnostics.some((d) => d.rule === "status-consistency/deprecated-no-successor"),
    ).toBe(true);
  });

  it("non-existent store should report not-found error", async () => {
    const result = await lintStore(resolve(FIXTURES, "does-not-exist"));
    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.diagnostics[0].rule).toBe("store/not-found");
  });
});
