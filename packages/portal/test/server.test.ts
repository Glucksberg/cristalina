import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { appendFileSync, cpSync, mkdtempSync, rmSync } from "node:fs";
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
