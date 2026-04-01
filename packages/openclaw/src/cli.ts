import { parseOpenClawCliArgs, syncOpenClawWorkspace, ingestOpenClawWorkspace } from "./workspace.js";

const { command, values } = parseOpenClawCliArgs(process.argv.slice(2));

if (values.help || !command) {
  console.log(`Usage: cristalina-openclaw <command> [options]

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
  cristalina-openclaw ingest --store examples/sample-store/.cristalina --workspace examples/openclaw-run --refresh`);
  process.exit(command ? 0 : 1);
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
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`OpenClaw bootstrap written to ${result.workspacePath}`);
      console.log(`Projection: ${result.projectionId}`);
      for (const file of result.files) {
        console.log(`- ${file.workspaceFile}`);
      }
    }
    process.exit(0);
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
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`OpenClaw ingest completed for ${result.workspacePath}`);
      console.log(`Drift events: ${result.driftEvents}`);
      console.log(`Proposals: ${result.proposals}`);
      for (const file of result.changedFiles) {
        console.log(`- ${file}`);
      }
    }
    process.exit(0);
  }

  console.error(`Unknown command: ${command}`);
  process.exit(1);
} catch (error) {
  console.error(`Error: ${(error as Error).message}`);
  process.exit(2);
}
