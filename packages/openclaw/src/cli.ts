import { parseOpenClawCliArgs, syncOpenClawWorkspace, ingestOpenClawWorkspace } from "./workspace.js";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export interface CliIo {
  log: (message: string) => void;
  error: (message: string) => void;
}

export function openClawHelpText(): string {
  return `Usage: cristalina-openclaw <command> [options]

Commands:
  bootstrap        Compile Cristalina and sync OpenClaw bootstrap files into a workspace
  ingest           Convert edited OpenClaw workspace files back into governed drift evidence and proposals

Options:
  --store <path>       Path to the .cristalina store (default: .cristalina)
  --workspace <path>   Target workspace path for OpenClaw files (default: current directory)
  --audience <scope>   Projection audience (default: owner_private)
  --channel <name>     Optional channel namespace
  --profile <name>     Optional projection profile override
  --actor <name>       Actor name recorded during ingest
  --refresh            Re-bootstrap the workspace after ingesting drift
  --json               Output machine-readable JSON
  -h, --help           Show this help message

Examples:
  cristalina-openclaw bootstrap --store examples/sample-store/.cristalina --workspace examples/openclaw-run
  cristalina-openclaw ingest --store examples/sample-store/.cristalina --workspace examples/openclaw-run --refresh`;
}

export async function runOpenClawCli(
  argv: string[],
  io: CliIo = { log: console.log, error: console.error },
): Promise<number> {
  const { command, values } = parseOpenClawCliArgs(argv);

  if (values.help || !command) {
    io.log(openClawHelpText());
    return command ? 0 : 1;
  }

  try {
  if (command === "bootstrap") {
    const result = await syncOpenClawWorkspace({
      storePath: values.store,
      workspacePath: values.workspace,
      audience: values.audience as "owner_private",
      channel: values.channel,
      profile: values.profile as "deep" | undefined,
    });

    if (values.json) {
      io.log(JSON.stringify(result, null, 2));
    } else {
      io.log(`OpenClaw bootstrap written to ${result.workspacePath}`);
      io.log(`Projection: ${result.projectionId}`);
      for (const file of result.files) {
        io.log(`- ${file.workspaceFile}`);
      }
    }
    return 0;
  }

  if (command === "ingest") {
    const result = await ingestOpenClawWorkspace({
      storePath: values.store,
      workspacePath: values.workspace,
      audience: values.audience as "owner_private",
      channel: values.channel,
      profile: values.profile as "deep" | undefined,
      actor: values.actor,
      refreshAfterIngest: values.refresh,
    });

    if (values.json) {
      io.log(JSON.stringify(result, null, 2));
    } else {
      io.log(`OpenClaw ingest completed for ${result.workspacePath}`);
      io.log(`Drift events: ${result.driftEvents}`);
      io.log(`Proposals: ${result.proposals}`);
      for (const file of result.changedFiles) {
        io.log(`- ${file}`);
      }
      for (const diagnostic of result.diagnostics) {
        io.log(`! ${diagnostic.file}: ${diagnostic.message}`);
      }
    }
    return 0;
  }

  io.error(`Unknown command: ${command}`);
  return 1;
  } catch (error) {
    io.error(`Error: ${(error as Error).message}`);
    return 2;
  }
}

const isDirectExecution = process.argv[1] !== undefined
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  const exitCode = await runOpenClawCli(process.argv.slice(2));
  process.exit(exitCode);
}
