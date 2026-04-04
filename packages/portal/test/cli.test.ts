import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { fileURLToPath } from "node:url";
import { runPortalCli } from "../src/cli.js";

const sampleStore = fileURLToPath(new URL("../../../examples/sample-store/.cristalina", import.meta.url));
const activeServers: Server[] = [];

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

afterEach(async () => {
  await Promise.all(activeServers.splice(0).map((server) => new Promise<void>((resolveClose) => {
    server.close(() => resolveClose());
  })));
});

describe("runPortalCli", () => {
  it("rejects invalid profile values with a clear message", async () => {
    const { io, errors } = createIo();

    const code = await runPortalCli([
      "serve",
      "--store", sampleStore,
      "--profile", "invalid_profile",
    ], io);

    expect(code).toBe(1);
    expect(errors[0]).toContain("Invalid profile");
  });

  it("surfaces port binding failures as a clean CLI error", async () => {
    const occupied = createServer();
    activeServers.push(occupied);
    await new Promise<void>((resolveListen) => {
      occupied.listen(0, "127.0.0.1", () => resolveListen());
    });
    const address = occupied.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const { io, errors, logs } = createIo();

    const code = await runPortalCli([
      "serve",
      "--store", sampleStore,
      "--port", String(port),
    ], io);

    expect(code).toBe(2);
    expect(errors[0]).toContain("EADDRINUSE");
    expect(logs).toHaveLength(0);
  });
});
