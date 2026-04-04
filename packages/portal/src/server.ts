import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { relative, resolve, sep } from "node:path";
import chokidar, { type FSWatcher } from "chokidar";
import { WebSocket, WebSocketServer } from "ws";
import type { PrivacyScope, ProjectionProfile } from "@cristalina/types";
import { buildPortalSnapshot, type PortalSnapshot } from "./snapshot.js";
import { renderPortalHtml } from "./template.js";

const VALID_AUDIENCES = [
  "owner_private",
  "agent_operational",
  "project_private",
  "shareable",
  "public_safe",
] as const;

const VALID_PROFILES = ["tiny", "standard", "deep"] as const;

export interface PortalServerOptions {
  storePath: string;
  host?: string;
  port?: number;
  audience?: PrivacyScope;
  profile?: ProjectionProfile;
}

export interface PortalServerHandle {
  host: string;
  port: number;
  url: string;
  close: () => Promise<void>;
}

interface SnapshotMessage {
  type: "snapshot";
  snapshot: PortalSnapshot;
  changedPaths: string[];
}

export async function startPortalServer(options: PortalServerOptions): Promise<PortalServerHandle> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 8787;
  const storePath = resolve(options.storePath);
  const audience = options.audience ?? "owner_private";
  const profile = options.profile ?? "deep";
  assertValidPortalOptions({ audience, profile });
  let currentSnapshot = await buildPortalSnapshot({ storePath, audience, profile });
  const html = renderPortalHtml();
  const clients = new Set<WebSocket>();

  const server = createServer((request, response) => {
    handleHttpRequest(request, response, html, currentSnapshot);
  });

  const websocketServer = new WebSocketServer({ server, path: "/ws" });
  websocketServer.on("connection", (socket) => {
    clients.add(socket);
    socket.send(JSON.stringify({
      type: "snapshot",
      snapshot: currentSnapshot,
      changedPaths: [],
    } satisfies SnapshotMessage));
    socket.on("close", () => {
      clients.delete(socket);
    });
    socket.on("error", () => {
      clients.delete(socket);
    });
  });

  const watcher = await createWatcher(storePath, async (changedPaths) => {
    try {
      currentSnapshot = await buildPortalSnapshot({ storePath, audience, profile });
      const payload = JSON.stringify({
        type: "snapshot",
        snapshot: currentSnapshot,
        changedPaths,
      } satisfies SnapshotMessage);
      for (const client of clients) {
        if (client.readyState === client.OPEN) client.send(payload);
      }
    } catch (error) {
      console.error(`[cristalina-portal] failed to rebuild snapshot: ${(error as Error).message}`);
    }
  });

  try {
    await new Promise<void>((resolveStart, rejectStart) => {
      const rejectOnce = (error: Error) => {
        server.off("error", rejectOnce);
        websocketServer.off("error", rejectOnce);
        rejectStart(error);
      };
      server.once("error", rejectOnce);
      websocketServer.once("error", rejectOnce);
      server.listen(port, host, () => {
        server.off("error", rejectOnce);
        websocketServer.off("error", rejectOnce);
        resolveStart();
      });
    });
  } catch (error) {
    await watcher.close();
    for (const client of clients) client.terminate();
    await new Promise<void>((resolveClose) => websocketServer.close(() => resolveClose()));
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    throw error;
  }

  websocketServer.on("error", (error) => {
    console.error(`[cristalina-portal] websocket error: ${error.message}`);
  });

  const address = server.address();
  const resolvedPort = typeof address === "object" && address ? address.port : port;

  return {
    host,
    port: resolvedPort,
    url: `http://${host}:${resolvedPort}`,
    close: async () => {
      await watcher.close();
      for (const client of clients) {
        if (client.readyState === client.OPEN || client.readyState === client.CONNECTING) {
          client.terminate();
        }
      }
      await new Promise<void>((resolveClose, rejectClose) => {
        websocketServer.close((error) => {
          if (error) rejectClose(error);
          else resolveClose();
        });
      });
      await new Promise<void>((resolveClose, rejectClose) => {
        server.close((error) => {
          if (error) rejectClose(error);
          else resolveClose();
        });
      });
    },
  };
}

function handleHttpRequest(
  request: IncomingMessage,
  response: ServerResponse,
  html: string,
  snapshot: PortalSnapshot,
): void {
  if (!request.url) {
    response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
    response.end("Bad request");
    return;
  }

  if (request.url === "/api/snapshot") {
    response.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(JSON.stringify(snapshot));
    return;
  }

  if (request.url === "/healthz") {
    const ok = snapshot.health.status !== "error";
    response.writeHead(ok ? 200 : 503, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(JSON.stringify({
      ok,
      status: snapshot.health.status,
      errorCount: snapshot.health.errorCount,
      warningCount: snapshot.health.warningCount,
      infoCount: snapshot.health.infoCount,
    }));
    return;
  }

  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(html);
}

async function createWatcher(
  storePath: string,
  onChange: (changedPaths: string[]) => Promise<void>,
): Promise<FSWatcher> {
  const pending = new Set<string>();
  let timer: NodeJS.Timeout | null = null;
  let closing = false;

  const flush = async () => {
    if (closing) return;
    timer = null;
    const changedPaths = [...pending];
    pending.clear();
    await onChange(changedPaths);
  };

  const watcher = chokidar.watch(storePath, {
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 150,
      pollInterval: 50,
    },
    ignored: (path) => path.includes(`${sep}node_modules${sep}`) || path.includes(`${sep}dist${sep}`),
  });

  const schedule = (path: string) => {
    if (closing) return;
    pending.add(relativePath(storePath, path));
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void flush();
    }, 180);
  };

  watcher.on("add", schedule);
  watcher.on("change", schedule);
  watcher.on("unlink", schedule);
  watcher.on("addDir", schedule);
  watcher.on("unlinkDir", schedule);

  await new Promise<void>((resolveReady) => {
    watcher.once("ready", () => {
      resolveReady();
    });
  });

  const originalClose = watcher.close.bind(watcher);
  watcher.close = async () => {
    closing = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pending.clear();
    await originalClose();
  };

  return watcher;
}

function relativePath(root: string, target: string): string {
  return relative(root, target).replaceAll(sep, "/");
}

function assertValidPortalOptions(options: Pick<PortalServerOptions, "audience" | "profile">): void {
  if (!VALID_AUDIENCES.includes(options.audience as typeof VALID_AUDIENCES[number])) {
    throw new Error(`Invalid audience: ${options.audience}. Valid audiences: ${VALID_AUDIENCES.join(", ")}`);
  }

  if (!VALID_PROFILES.includes(options.profile as typeof VALID_PROFILES[number])) {
    throw new Error(`Invalid profile: ${options.profile}. Valid profiles: ${VALID_PROFILES.join(", ")}`);
  }
}
