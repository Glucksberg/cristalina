import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { lintStore } from "../../src/store/linter.js";

describe("sample store parity", () => {
  it("lints the repository sample store without errors", async () => {
    const result = await lintStore(resolve("..", "..", "examples", "sample-store", ".cristalina"));

    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
    expect(result.objectCount).toBeGreaterThan(0);
  });
});
