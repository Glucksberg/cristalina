import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { runValidateCli, validateHelpText } from "../src/cli.js";

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

describe("validate CLI", () => {
  it("prints help when called without a command", async () => {
    const { io, logs, errors } = createIo();
    const code = await runValidateCli([], io);

    expect(code).toBe(1);
    expect(logs[0]).toBe(validateHelpText());
    expect(errors).toHaveLength(0);
  });

  it("returns structured JSON for the valid fixture store", async () => {
    const { io, logs, errors } = createIo();
    const sampleStore = fileURLToPath(new URL("../../../examples/sample-store/.cristalina", import.meta.url));
    const code = await runValidateCli(["lint", sampleStore, "--json"], io);

    expect(code).toBe(0);
    expect(errors).toHaveLength(0);
    const result = JSON.parse(logs[0]) as { errorCount: number; warningCount: number; fileCount: number };
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
    expect(result.fileCount).toBeGreaterThan(0);
  });

  it("fails when lint is called without a path", async () => {
    const { io, errors } = createIo();
    const code = await runValidateCli(["lint"], io);

    expect(code).toBe(1);
    expect(errors[0]).toContain("lint requires a path");
  });
});
