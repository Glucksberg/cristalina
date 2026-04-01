import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultConfigCandidates = [
  resolve(repoRoot, "config", "openclaw-workspaces.local.json"),
  resolve(repoRoot, "config", "openclaw-workspaces.example.json"),
];

function parseArgs(argv) {
  const values = {
    config: undefined,
    workspace: undefined,
    yes: false,
    skipBuild: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--config") values.config = argv[++i];
    else if (arg === "--workspace") values.workspace = argv[++i];
    else if (arg === "--yes") values.yes = true;
    else if (arg === "--skip-build") values.skipBuild = true;
    else if (arg === "--help" || arg === "-h") values.help = true;
  }

  return values;
}

function helpText() {
  return `OpenClaw Onboarding

Usage:
  pnpm onboard:openclaw [--config <file>] [--workspace <name>] [--yes] [--skip-build]

What this script does:
  1. loads a mapped list of OpenClaw workspaces
  2. lets you choose one target workspace
  3. safely wipes that workspace
  4. bootstraps Cristalina runtime projections into it
  5. writes a short onboarding guide inside the workspace

Expected config:
  config/openclaw-workspaces.local.json

If that file does not exist, the script falls back to:
  config/openclaw-workspaces.example.json`;
}

function loadConfig(configPath) {
  const resolvedPath = resolve(repoRoot, configPath);
  const rawContent = readFileSync(resolvedPath, "utf-8").replace(/^\uFEFF/, "");
  const raw = JSON.parse(rawContent);
  const workspaces = Array.isArray(raw.workspaces) ? raw.workspaces : [];
  if (workspaces.length === 0) {
    throw new Error(`No workspaces found in ${resolvedPath}`);
  }
  return {
    path: resolvedPath,
    defaultStorePath: typeof raw.defaultStorePath === "string" ? raw.defaultStorePath : "examples/sample-store/.cristalina",
    workspaces,
  };
}

function resolveConfigPath(explicit) {
  if (explicit) return resolve(repoRoot, explicit);
  const match = defaultConfigCandidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error("No OpenClaw workspace config found. Create config/openclaw-workspaces.local.json from the example file first.");
  }
  return match;
}

function guardWorkspacePath(targetPath) {
  const resolvedTarget = resolve(targetPath);
  const rootOfTarget = resolve(resolvedTarget, "..");
  if (!isAbsolute(resolvedTarget)) {
    throw new Error(`Workspace path must be absolute: ${targetPath}`);
  }
  if (resolvedTarget === repoRoot) {
    throw new Error("Refusing to wipe the Cristalina repository root.");
  }
  if (resolvedTarget === resolve(resolvedTarget, "\\")) {
    throw new Error(`Refusing to wipe a drive root: ${resolvedTarget}`);
  }
  if (resolvedTarget.length < rootOfTarget.length + 2) {
    throw new Error(`Workspace path is too broad to wipe safely: ${resolvedTarget}`);
  }
  return resolvedTarget;
}

function ensureBuilt(skipBuild) {
  const cliPath = resolve(repoRoot, "packages", "cli", "dist", "cli.js");
  if (skipBuild && existsSync(cliPath)) return cliPath;
  if (existsSync(cliPath) && skipBuild) return cliPath;
  if (!existsSync(cliPath)) {
    console.log("Cristalina build output not found. Running `pnpm build` first.");
  } else if (!skipBuild) {
    console.log("Refreshing build before onboarding.");
  }

  const result = spawnSync("pnpm", ["build"], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error("Build failed. Onboarding aborted.");
  }
  return cliPath;
}

function wipeWorkspace(targetPath) {
  mkdirSync(targetPath, { recursive: true });
  for (const entry of readdirSync(targetPath, { withFileTypes: true })) {
    const entryPath = resolve(targetPath, entry.name);
    rmSync(entryPath, { recursive: true, force: true });
  }
}

function writeOnboardingFile(workspacePath, options) {
  const onboardingPath = resolve(workspacePath, "CRISTALINA-ONBOARDING.md");
  const content = `# Cristalina In This OpenClaw Workspace

This workspace is a **runtime projection**, not the canonical memory store.

Source store:
- \`${options.storePath}\`

Installed profile:
- audience: \`${options.audience}\`
- channel: \`${options.channel ?? "default"}\`
- profile: \`${options.profile ?? "auto"}\`

Files you should point OpenClaw at:
- \`SOUL.md\`
- \`VALUE.md\`
- \`USER.md\`
- \`MEMORY.md\`

Important model:
- Cristalina memory is governed outside this workspace.
- Files here are compiled artifacts for runtime use.
- Edits made by OpenClaw here are **not canonical truth**.
- To turn runtime edits into governed proposals, run:

\`\`\`bash
cristalina openclaw ingest --store "${options.storePath}" --workspace "${workspacePath}"
\`\`\`

If you want to refresh the workspace from canonical memory again:

\`\`\`bash
cristalina openclaw bootstrap --store "${options.storePath}" --workspace "${workspacePath}"
\`\`\`
`;
  writeFileSync(onboardingPath, content, "utf-8");
}

function bootstrapWorkspace(cliPath, options) {
  const args = [
    cliPath,
    "openclaw",
    "bootstrap",
    "--store",
    options.storePath,
    "--workspace",
    options.workspacePath,
    "--audience",
    options.audience,
  ];

  if (options.channel) {
    args.push("--channel", options.channel);
  }
  if (options.profile) {
    args.push("--profile", options.profile);
  }

  const result = spawnSync("node", args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    throw new Error("OpenClaw bootstrap failed.");
  }
}

async function chooseWorkspace(config, preferredName) {
  if (preferredName) {
    const match = config.workspaces.find((workspace) => workspace.name === preferredName);
    if (!match) {
      throw new Error(`Mapped workspace not found: ${preferredName}`);
    }
    return match;
  }

  const rl = createInterface({ input, output });
  try {
    console.log("");
    console.log("Mapped OpenClaw workspaces:");
    config.workspaces.forEach((workspace, index) => {
      console.log(`  ${index + 1}. ${workspace.name} -> ${workspace.path}`);
    });
    console.log("");
    const answer = await rl.question("Choose a workspace number: ");
    const index = Number.parseInt(answer, 10) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= config.workspaces.length) {
      throw new Error("Invalid workspace selection.");
    }
    return config.workspaces[index];
  } finally {
    rl.close();
  }
}

async function confirmWipe(path, autoYes) {
  if (autoYes) return true;
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(`This will erase everything in ${path}. Type WIPE to continue: `);
    return answer === "WIPE";
  } finally {
    rl.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(helpText());
    process.exit(0);
  }

  console.log("");
  console.log("Cristalina OpenClaw Onboarding");
  console.log("");
  console.log("This script installs a runtime-facing memory projection into an OpenClaw workspace.");
  console.log("It does not make that workspace canonical.");
  console.log("Canonical memory remains in the Cristalina store; the OpenClaw workspace is derived and disposable.");
  console.log("");

  const configPath = resolveConfigPath(args.config);
  const config = loadConfig(configPath);
  const selectedWorkspace = await chooseWorkspace(config, args.workspace);
  const workspacePath = guardWorkspacePath(selectedWorkspace.path);
  const storePath = resolve(
    repoRoot,
    typeof selectedWorkspace.storePath === "string" ? selectedWorkspace.storePath : config.defaultStorePath,
  );

  const confirmed = await confirmWipe(workspacePath, args.yes);
  if (!confirmed) {
    console.log("Onboarding aborted.");
    process.exit(1);
  }

  const cliPath = ensureBuilt(args.skipBuild);

  console.log("");
  console.log(`Wiping OpenClaw workspace: ${workspacePath}`);
  wipeWorkspace(workspacePath);

  console.log(`Bootstrapping from store: ${storePath}`);
  bootstrapWorkspace(cliPath, {
    storePath,
    workspacePath,
    audience: selectedWorkspace.audience ?? "owner_private",
    channel: selectedWorkspace.channel,
    profile: selectedWorkspace.profile,
  });

  writeOnboardingFile(workspacePath, {
    storePath,
    audience: selectedWorkspace.audience ?? "owner_private",
    channel: selectedWorkspace.channel,
    profile: selectedWorkspace.profile,
  });

  console.log("");
  console.log("Onboarding complete.");
  console.log(`Workspace: ${workspacePath}`);
  console.log("Files ready:");
  console.log("  - SOUL.md");
  console.log("  - VALUE.md");
  console.log("  - USER.md");
  console.log("  - MEMORY.md");
  console.log("  - CRISTALINA-ONBOARDING.md");
  console.log("");
  console.log("Next step: point OpenClaw at those four bootstrap files.");
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
