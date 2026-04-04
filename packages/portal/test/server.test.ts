import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { appendFileSync, cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import WebSocket from "ws";
import { startPortalServer, type PortalSnapshot } from "../src/index.js";

let root: string;
let storePath: string;

beforeEach(() => {
  root = mkdtempSync(resolve(tmpdir(), "cristalina-portal-server-"));
  storePath = resolve(root, ".cristalina");
  cpSync(resolve("..", "..", "examples", "sample-store", ".cristalina"), storePath, { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("startPortalServer", () => {
  it("serves snapshots over HTTP and pushes updates over WebSocket", async () => {
    const portal = await startPortalServer({
      storePath,
      host: "127.0.0.1",
      port: 0,
    });

    try {
      const page = await fetch(`${portal.url}/`);
      expect(page.ok).toBe(true);
      expect(await page.text()).toContain("Runtime Process Map");

      const response = await fetch(`${portal.url}/api/snapshot`);
      expect(response.ok).toBe(true);
      const snapshot = await response.json() as PortalSnapshot;
      expect(snapshot.manifest.displayName).toBe("Cristalina Sample Store");

      const socket = new WebSocket(`${portal.url.replace("http", "ws")}/ws`);
      const initial = await nextSnapshot(socket);
      expect(initial.changedPaths).toHaveLength(0);

      appendFileSync(resolve(storePath, "core", "narrative", "story.md"), "\nPortal live update test.\n", "utf-8");
      const updated = await nextSnapshot(socket);
      expect(updated.changedPaths).toContain("core/narrative/story.md");
      socket.close();
    } finally {
      await portal.close();
    }
  });

  it("shuts down cleanly even when a WebSocket client is still connected", async () => {
    const portal = await startPortalServer({
      storePath,
      host: "127.0.0.1",
      port: 0,
    });

    const socket = new WebSocket(`${portal.url.replace("http", "ws")}/ws`);
    await nextSnapshot(socket);

    await expect(portal.close()).resolves.toBeUndefined();
  });

  it("keeps serving after a transient snapshot rebuild failure", async () => {
    const portal = await startPortalServer({
      storePath,
      host: "127.0.0.1",
      port: 0,
    });

    const originalFacts = readFileSync(resolve(storePath, "core", "ratified", "facts.yaml"), "utf-8");
    const socket = new WebSocket(`${portal.url.replace("http", "ws")}/ws`);

    try {
      await nextSnapshot(socket);

      writeFileSync(resolve(storePath, "core", "ratified", "facts.yaml"), "items: [\n", "utf-8");
      await sleep(500);

      const response = await fetch(`${portal.url}/api/snapshot`);
      expect(response.ok).toBe(true);

      writeFileSync(resolve(storePath, "core", "ratified", "facts.yaml"), originalFacts, "utf-8");
      appendFileSync(resolve(storePath, "core", "narrative", "story.md"), "\nRecovered after invalid YAML.\n", "utf-8");

      const updated = await nextSnapshot(socket);
      expect(updated.changedPaths).toContain("core/narrative/story.md");
    } finally {
      socket.close();
      await portal.close();
    }
  });

  it("reports unhealthy status from /healthz when snapshot validation has errors", async () => {
    writeFileSync(resolve(storePath, "manifest.yaml"), "name: only\n", "utf-8");

    const portal = await startPortalServer({
      storePath,
      host: "127.0.0.1",
      port: 0,
    });

    try {
      const response = await fetch(`${portal.url}/healthz`);
      expect(response.status).toBe(503);
      const payload = await response.json() as {
        ok: boolean;
        status: string;
        errorCount: number;
      };
      expect(payload.ok).toBe(false);
      expect(payload.status).toBe("error");
      expect(payload.errorCount).toBeGreaterThan(0);
    } finally {
      await portal.close();
    }
  });

  it("fails fast on invalid portal options", async () => {
    await expect(startPortalServer({
      storePath,
      host: "127.0.0.1",
      port: 0,
      profile: "invalid_profile" as never,
    })).rejects.toThrow("Invalid profile");
  });
});

function nextSnapshot(socket: WebSocket): Promise<{ snapshot: PortalSnapshot; changedPaths: string[] }> {
  return new Promise((resolvePromise, rejectPromise) => {
    const timeout = setTimeout(() => {
      rejectPromise(new Error("Timed out waiting for WebSocket snapshot"));
    }, 5000);

    socket.once("message", (payload) => {
      clearTimeout(timeout);
      const message = JSON.parse(String(payload)) as { snapshot: PortalSnapshot; changedPaths: string[] };
      resolvePromise(message);
    });

    socket.once("error", (error) => {
      clearTimeout(timeout);
      rejectPromise(error);
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}
