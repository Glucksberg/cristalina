import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { startPortalServer } from "./server.js";

export interface CliIo {
  log: (message: string) => void;
  error: (message: string) => void;
}

export function portalHelpText(): string {
  return `Usage: cristalina-portal <command> [options]

Commands:
  serve            Start the live Cristalina portal with HTTP + WebSocket updates

Options:
  --store <path>       Path to the .cristalina store (default: .cristalina)
  --host <host>        Host to bind (default: 127.0.0.1)
  --port <port>        Port to bind (default: 8787)
  --audience <scope>   Projection audience used for live bootstrap previews (default: owner_private)
  --profile <name>     Projection profile used for live bootstrap previews (default: deep)
  -h, --help           Show this help message

Example:
  cristalina-portal serve --store examples/sample-store/.cristalina --port 8787`;
}

export async function runPortalCli(
  argv: string[],
  io: CliIo = { log: console.log, error: console.error },
): Promise<number> {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      store: { type: "string", default: ".cristalina" },
      host: { type: "string", default: "127.0.0.1" },
      port: { type: "string", default: "8787" },
      audience: { type: "string", default: "owner_private" },
      profile: { type: "string", default: "deep" },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  const command = positionals[0];
  if (values.help) {
    io.log(portalHelpText());
    return 0;
  }

  if (!command) {
    io.log(portalHelpText());
    return 1;
  }

  if (command !== "serve") {
    io.error(`Unknown command: ${command}`);
    io.log(portalHelpText());
    return 1;
  }

  const port = Number.parseInt(values.port, 10);
  if (!Number.isFinite(port)) {
    io.error(`Invalid port: ${values.port}`);
    return 1;
  }

  try {
    const portal = await startPortalServer({
      storePath: values.store,
      host: values.host,
      port,
      audience: values.audience as "owner_private",
      profile: values.profile as "deep",
    });

    io.log(`Cristalina portal live at ${portal.url}`);
    io.log(`Watching store: ${resolve(values.store)}`);

    await new Promise<void>((resolveWait) => {
      const shutdown = () => {
        void portal.close().finally(resolveWait);
      };
      process.once("SIGINT", shutdown);
      process.once("SIGTERM", shutdown);
    });

    return 0;
  } catch (error) {
    io.error(`Error: ${(error as Error).message}`);
    return 2;
  }
}

const isDirectExecution = process.argv[1] !== undefined
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  const exitCode = await runPortalCli(process.argv.slice(2));
  process.exit(exitCode);
}
