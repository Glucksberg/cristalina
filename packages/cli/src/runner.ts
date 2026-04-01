import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runOpenClawCli } from "@cristalina/openclaw";
import { runValidateCli } from "@cristalina/validate";

export interface CliIo {
  log: (message: string) => void;
  error: (message: string) => void;
}

export function cristalinaHelpText(): string {
  return `Usage: cristalina <command> [subcommand] [options]

Commands:
  validate lint <path>           Lint a .cristalina store
  openclaw bootstrap [options]   Compile and sync an OpenClaw workspace
  openclaw ingest [options]      Re-ingest OpenClaw drift into governed proposals

Examples:
  cristalina validate lint examples/sample-store/.cristalina
  cristalina openclaw bootstrap --store examples/sample-store/.cristalina --workspace ./runtime
  cristalina openclaw ingest --store examples/sample-store/.cristalina --workspace ./runtime --refresh`;
}

export async function runCristalinaCli(
  argv: string[],
  io: CliIo = { log: console.log, error: console.error },
): Promise<number> {
  const command = argv[0];

  if (!command || command === "--help" || command === "-h") {
    io.log(cristalinaHelpText());
    return command ? 0 : 1;
  }

  if (command === "validate") {
    return runValidateCli(argv.slice(1), io);
  }

  if (command === "openclaw") {
    return runOpenClawCli(argv.slice(1), io);
  }

  io.error(`Unknown command: ${command}`);
  io.log(cristalinaHelpText());
  return 1;
}

const isDirectExecution = process.argv[1] !== undefined
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  const exitCode = await runCristalinaCli(process.argv.slice(2));
  process.exit(exitCode);
}
