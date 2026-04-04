import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stdinTTY = process.stdin.isTTY;
const stdoutTTY = process.stdout.isTTY;

function setInteractiveTty(value: boolean): void {
  Object.defineProperty(process.stdin, "isTTY", { configurable: true, value });
  Object.defineProperty(process.stdout, "isTTY", { configurable: true, value });
}

beforeEach(() => {
  setInteractiveTty(true);
});

afterEach(() => {
  Object.defineProperty(process.stdin, "isTTY", { configurable: true, value: stdinTTY });
  Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: stdoutTTY });
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("onboard wizard", () => {
  it("exits cleanly when the wizard is cancelled", async () => {
    vi.doMock("../src/onboard-wizard.js", async () => {
      const actual = await vi.importActual<typeof import("../src/onboard-wizard.js")>("../src/onboard-wizard.js");
      return {
        ...actual,
        runOnboardWizard: vi.fn(async () => {
          throw new actual.WizardCancelledError();
        }),
      };
    });

    const { runOnboardCli } = await import("../src/onboard.js");
    const logs: string[] = [];
    const errors: string[] = [];
    const code = await runOnboardCli(["setup"], {
      log: (message) => { logs.push(message); },
      error: (message) => { errors.push(message); },
    });

    expect(code).toBe(0);
    expect(errors).toHaveLength(0);
  });
});
