import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { syncOpenClawWorkspace } from "@cristalina/openclaw";
import { startPortalServer } from "@cristalina/portal";
import { lintStore } from "@cristalina/validate";
import {
  runOnboardWizard,
  WizardCancelledError,
  type AudienceOption,
  type ProfileOption,
  type SetupSurface,
  type WizardSeed,
} from "./onboard-wizard.js";
import { directoryHasEntries, getPathState } from "./path-state.js";

export interface CliIo {
  log: (message: string) => void;
  error: (message: string) => void;
}

interface SetupOptions {
  setupSurface: SetupSurface;
  storePath: string;
  workspacePath?: string;
  storeName: string;
  displayName: string;
  ownerName: string;
  agentName: string;
  audience: AudienceOption;
  channel: string;
  profile: ProfileOption;
  yes: boolean;
  launchPortal: boolean;
  portalHost: string;
  portalPort: number;
}

interface NormalizedSetupInput extends WizardSeed {
  wizard: boolean;
}

const VALID_AUDIENCES = [
  "owner_private",
  "agent_operational",
  "project_private",
  "shareable",
  "public_safe",
] as const;

const VALID_PROFILES = ["tiny", "standard", "deep"] as const;
const MANAGED_WORKSPACE_ENTRIES = new Set([
  "SOUL.md",
  "VALUE.md",
  "USER.md",
  "MEMORY.md",
  "CRISTALINA-ONBOARDING.md",
  ".openclaw",
]);

export function onboardHelpText(): string {
  return `Usage: cristalina onboard <command> [options]

Commands:
  setup            Create a starter Cristalina store, optionally bootstrap OpenClaw, and prepare the portal

Options:
  --store <path>         Target .cristalina path (default: .cristalina)
  --workspace <path>     Optional OpenClaw workspace path to bootstrap
  --store-name <slug>    Store slug used in manifest metadata
  --display-name <name>  Human-facing store name
  --owner-name <name>    Owner entity name (default: Owner)
  --agent-name <name>    Agent entity name (default: Cristalina)
  --audience <scope>     Projection audience (default: owner_private)
  --channel <name>       Projection channel (default: owner_private_runtime)
  --profile <name>       Projection profile (default: deep)
  --wizard               Force the interactive setup wizard even when flags are provided
  --launch-portal        Start the live portal after setup
  --portal-host <host>   Portal bind host (default: 127.0.0.1)
  --portal-port <port>   Portal bind port (default: 8787)
  --yes                  Skip confirmations when managed workspace artifacts need to be reset
  -h, --help             Show this help

Examples:
  cristalina onboard setup
  cristalina onboard setup --wizard --store ./.cristalina
  cristalina onboard setup --store ./.cristalina
  cristalina onboard setup --store ./.cristalina --workspace /abs/path/to/openclaw --yes
  cristalina onboard setup --store ./.cristalina --launch-portal`;
}

export async function runOnboardCli(
  argv: string[],
  io: CliIo = { log: console.log, error: console.error },
): Promise<number> {
  try {
    const { positionals, values } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        store: { type: "string", default: ".cristalina" },
        workspace: { type: "string" },
        "store-name": { type: "string" },
        "display-name": { type: "string" },
        "owner-name": { type: "string" },
        "agent-name": { type: "string" },
        audience: { type: "string", default: "owner_private" },
        channel: { type: "string", default: "owner_private_runtime" },
        profile: { type: "string", default: "deep" },
        wizard: { type: "boolean", default: false },
        "launch-portal": { type: "boolean", default: false },
        "portal-host": { type: "string", default: "127.0.0.1" },
        "portal-port": { type: "string", default: "8787" },
        yes: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
    });

    const command = positionals[0];
    if (values.help) {
      io.log(onboardHelpText());
      return 0;
    }

    if (!command) {
      io.log(onboardHelpText());
      return 1;
    }

    if (command !== "setup") {
      io.error(`Unknown command: ${command}`);
      io.log(onboardHelpText());
      return 1;
    }

    const setupInput = normalizeSetupInput(values);
    const options = await resolveSetupOptions(setupInput);
    const createdStore = ensureStore(options);
    const steps: string[] = [];

    if (createdStore) {
      steps.push(`Initialized starter store at ${options.storePath}`);
    } else {
      steps.push(`Using existing store at ${options.storePath}`);
    }

    if (options.workspacePath) {
      const workspacePrepared = await prepareWorkspace(options.workspacePath, options.yes);
      const result = await syncOpenClawWorkspace({
        storePath: options.storePath,
        workspacePath: workspacePrepared,
        audience: options.audience,
        channel: options.channel,
        profile: options.profile,
      });
      writeWorkspaceOnboarding(workspacePrepared, options);
      steps.push(`Bootstrapped OpenClaw workspace at ${result.workspacePath}`);
    } else {
      writeStoreOnboarding(options.storePath, options);
      steps.push("Wrote local onboarding guide into the store root");
    }

    const lint = await lintStore(options.storePath);
    if (lint.errorCount > 0) {
      throw new Error(
        `Starter store failed validation with ${lint.errorCount} error(s). Run cristalina validate lint "${options.storePath}" for details.`,
      );
    }
    if (lint.warningCount > 0) {
      steps.push(`Validation completed with ${lint.warningCount} warning(s)`);
    } else {
      steps.push("Validation passed with no issues");
    }

    io.log("Cristalina onboarding completed.");
    for (const step of steps) {
      io.log(`- ${step}`);
    }

    if (options.launchPortal) {
      const portal = await startPortalServer({
        storePath: options.storePath,
        host: options.portalHost,
        port: options.portalPort,
        audience: options.audience,
        profile: options.profile,
      });
      io.log(`Portal live at ${portal.url}`);
      await waitForSignal(() => portal.close());
      return 0;
    }

    io.log(nextSteps(options));
    return 0;
  } catch (error) {
    if (error instanceof WizardCancelledError) {
      return 0;
    }
    io.error(`Error: ${(error as Error).message}`);
    return 2;
  }
}

async function resolveSetupOptions(setupInput: NormalizedSetupInput): Promise<SetupOptions> {
  if (shouldRunWizard(setupInput)) {
    return runOnboardWizard(setupInput);
  }

  const displayNameDefault = setupInput.displayName ?? "Cristalina Store";
  const ownerNameDefault = setupInput.ownerName ?? "Owner";
  const agentNameDefault = setupInput.agentName ?? "Cristalina";

  const interactive = process.stdin.isTTY && process.stdout.isTTY;
  const rl = interactive ? createInterface({ input, output }) : null;

  try {
    const displayName = setupInput.displayName
      ?? await prompt(rl, "Display name", displayNameDefault);
    const ownerName = setupInput.ownerName
      ?? await prompt(rl, "Owner name", ownerNameDefault);
    const agentName = setupInput.agentName
      ?? await prompt(rl, "Agent name", agentNameDefault);
    const workspacePath = setupInput.workspacePath ?? await optionalPrompt(rl, "OpenClaw workspace path (blank to skip)");
    const storeName = setupInput.storeName ?? slugify(displayName);
    const portalPort = setupInput.portalPort;

    if (!Number.isFinite(portalPort)) {
      throw new Error(`Invalid portal port: ${setupInput.portalPort}`);
    }

    return {
      setupSurface: inferSetupSurface(setupInput),
      storePath: resolve(setupInput.storePath),
      workspacePath: workspacePath ? resolve(workspacePath) : undefined,
      storeName,
      displayName,
      ownerName,
      agentName,
      audience: setupInput.audience,
      channel: setupInput.channel,
      profile: setupInput.profile,
      yes: setupInput.yes,
      launchPortal: setupInput.launchPortal,
      portalHost: setupInput.portalHost,
      portalPort,
    };
  } finally {
    rl?.close();
  }
}

function ensureStore(options: SetupOptions): boolean {
  const pathState = getPathState(options.storePath);
  if (pathState === "file") {
    throw new Error(`Store path points to a file, not a directory: ${options.storePath}`);
  }
  if (pathState === "directory-nonempty") {
    return false;
  }

  mkdirSync(resolve(options.storePath, "events"), { recursive: true });
  mkdirSync(resolve(options.storePath, "proposals"), { recursive: true });
  mkdirSync(resolve(options.storePath, "core", "identity"), { recursive: true });
  mkdirSync(resolve(options.storePath, "core", "ratified"), { recursive: true });
  mkdirSync(resolve(options.storePath, "core", "values"), { recursive: true });
  mkdirSync(resolve(options.storePath, "core", "narrative"), { recursive: true });
  mkdirSync(resolve(options.storePath, "entities"), { recursive: true });
  mkdirSync(resolve(options.storePath, "policy"), { recursive: true });
  mkdirSync(resolve(options.storePath, "compiled", "bootstrap"), { recursive: true });
  mkdirSync(resolve(options.storePath, "compiled", "hot"), { recursive: true });
  mkdirSync(resolve(options.storePath, "compiled", "warm"), { recursive: true });
  mkdirSync(resolve(options.storePath, "compiled", "cold"), { recursive: true });
  mkdirSync(resolve(options.storePath, "compiled", "metadata"), { recursive: true });
  mkdirSync(resolve(options.storePath, "backups", "snapshots"), { recursive: true });

  const now = new Date().toISOString();
  const onboardingSourceRef = `onboarding/${now}`;
  const ownerId = "ent-owner";
  const agentId = "ent-agent-cristalina";

  writeFileSync(resolve(options.storePath, "manifest.yaml"), `name: ${options.storeName}
display_name: ${quote(options.displayName)}
type: memory_protocol
status: v3-starter
protocol_version: 1.0-draft
repository_version: 0.3.0-dev
canonical_language: en
license: Apache-2.0
maintainers:
  - name: ${quote(options.ownerName)}
    role: owner
documents:
  spec: docs/SPEC.md
  data_model: docs/DATA-MODEL.md
  architecture_v2: docs/ARCHITECTURE-V2.md
  curation_protocol: docs/CURATION-PROTOCOL.md
  openclaw_adapter: docs/adapters/OPENCLAW-ADAPTER.md
schemas:
  manifest: schemas/manifest.schema.json
  event: schemas/event.schema.json
  proposal: schemas/proposal.schema.json
  memory_object: schemas/memory-object.schema.json
  entity: schemas/entity.schema.json
  policy_object: schemas/policy-object.schema.json
  derived_artifact: schemas/derived-artifact.schema.json
  projection_manifest: schemas/projection-manifest.schema.json
  adapter_writeback_contract: schemas/adapter-writeback-contract.schema.json
`, "utf-8");

  writeFileSync(resolve(options.storePath, "entities", "registry.yaml"), `items:
  - id: ${ownerId}
    kind: owner
    name: ${quote(options.ownerName)}
    status: active
    privacy_scope: owner_private
    aliases: [owner]
    description: ${quote(`Primary human authority over ${options.displayName}.`)}
    created_at: ${quote(now)}
  - id: ${agentId}
    kind: agent
    name: ${quote(options.agentName)}
    status: active
    privacy_scope: owner_private
    aliases: [assistant, cristalina]
    description: ${quote("Persistent governed agent identity backed by this store.")}
    channels: [${options.channel}]
    created_at: ${quote(now)}
`, "utf-8");

  writeFileSync(resolve(options.storePath, "policy", "audience.yaml"), `id: pol-audience-default
kind: audience_policy
status: active
default_scope: owner_private
policy_mode: audience_aware
escalation_rule: no_automatic_privacy_escalation
audiences:
  owner_private:
    can_view: [owner_private, agent_operational, project_private, shareable, public_safe]
  agent_operational:
    can_view: [agent_operational, shareable, public_safe]
  project_private:
    can_view: [project_private, shareable, public_safe]
  shareable:
    can_view: [shareable, public_safe]
  public_safe:
    can_view: [public_safe]
metadata:
  version: 1
  updated_at: ${quote(now)}
`, "utf-8");

  writeFileSync(resolve(options.storePath, "policy", "authority.yaml"), `id: pol-authority-default
kind: authority_policy
status: active
high_risk_kinds: [value, priority, identity_trait, style_rule]
restricted_kinds: [value, priority, identity_trait, style_rule]
trusted_owner_channel_prefixes: [owner_private, project_private]
metadata:
  version: 1
  updated_at: ${quote(now)}
`, "utf-8");

  writeFileSync(resolve(options.storePath, "policy", "projection.yaml"), `id: pol-projection-default
kind: projection_policy
status: active
default_profiles:
  owner_private: deep
  agent_operational: standard
  project_private: standard
  shareable: standard
  public_safe: tiny
channel_profile_rules:
  - match_prefix: owner_
    profile: deep
  - match_prefix: project_
    profile: standard
  - match_prefix: public_
    profile: tiny
tier_limits:
  tiny:
    hot: 8
    warm: 6
    cold: 8
  standard:
    hot: 14
    warm: 18
    cold: 24
  deep:
    hot: 24
    warm: 40
    cold: 60
kind_weights:
  - kind: identity_trait
    weight: 15
  - kind: value
    weight: 15
  - kind: priority
    weight: 15
  - kind: style_rule
    weight: 10
  - kind: preference
    weight: 10
  - kind: constraint
    weight: 8
always_hot_kinds: [identity_trait, value, priority, style_rule]
metadata:
  version: 1
  updated_at: ${quote(now)}
`, "utf-8");

  writeFileSync(resolve(options.storePath, "policy", "promotion.yaml"), `id: pol-promotion-default
kind: promotion_policy
status: active
default_question_count: 3
max_question_count: 5
high_risk_kinds: [value, priority, identity_trait, style_rule]
sensitive_policy_tags: [privacy, identity, public_behavior]
minimum_supporting_events: 1
metadata:
  version: 1
  updated_at: ${quote(now)}
`, "utf-8");

  writeFileSync(resolve(options.storePath, "core", "identity", "soul.yaml"), `items:
  - id: idt-001
    kind: identity_trait
    statement: ${quote(`${options.agentName} acts as ${options.ownerName}'s governed long-term companion.`)}
    status: ratified
    confidence: 0.9
    source_type: human_reply
    source_ref: ${quote(onboardingSourceRef)}
    created_at: ${quote(now)}
    last_confirmed_at: ${quote(now)}
    confirmed_by: owner
    evidence_count: 1
    privacy_scope: owner_private
`, "utf-8");

  writeFileSync(resolve(options.storePath, "core", "identity", "style.yaml"), `items:
  - id: sty-001
    kind: style_rule
    statement: ${quote("Keep operational replies concise by default; expand when deeper analysis is requested.")}
    status: ratified
    confidence: 0.88
    source_type: human_reply
    source_ref: ${quote(onboardingSourceRef)}
    created_at: ${quote(now)}
    last_confirmed_at: ${quote(now)}
    confirmed_by: owner
    evidence_count: 1
    privacy_scope: owner_private
`, "utf-8");

  writeFileSync(resolve(options.storePath, "core", "ratified", "facts.yaml"), `items:
  - id: fact-001
    kind: constraint
    statement: ${quote("Default privacy scope is owner_private. No automatic audience expansion is allowed.")}
    status: ratified
    confidence: 0.95
    source_type: human_reply
    source_ref: ${quote(onboardingSourceRef)}
    created_at: ${quote(now)}
    last_confirmed_at: ${quote(now)}
    confirmed_by: owner
    evidence_count: 1
    privacy_scope: owner_private
  - id: fact-002
    kind: preference
    statement: ${quote("Start concise, then deepen only when reflection or architecture depth is requested.")}
    status: ratified
    confidence: 0.86
    source_type: human_reply
    source_ref: ${quote(onboardingSourceRef)}
    created_at: ${quote(now)}
    last_confirmed_at: ${quote(now)}
    confirmed_by: owner
    evidence_count: 1
    privacy_scope: owner_private
    related_entities: [${ownerId}]
`, "utf-8");

  writeFileSync(resolve(options.storePath, "core", "values", "values.yaml"), `items:
  - id: val-001
    kind: value
    statement: ${quote("Honesty above pleasing.")}
    status: ratified
    confidence: 0.95
    source_type: human_reply
    source_ref: ${quote(onboardingSourceRef)}
    created_at: ${quote(now)}
    last_confirmed_at: ${quote(now)}
    confirmed_by: owner
    evidence_count: 1
    privacy_scope: owner_private
  - id: val-002
    kind: value
    statement: ${quote("Privacy above convenience.")}
    status: ratified
    confidence: 0.95
    source_type: human_reply
    source_ref: ${quote(onboardingSourceRef)}
    created_at: ${quote(now)}
    last_confirmed_at: ${quote(now)}
    confirmed_by: owner
    evidence_count: 1
    privacy_scope: owner_private
`, "utf-8");

  writeFileSync(resolve(options.storePath, "core", "narrative", "story.md"), `# Story

${options.displayName} starts as a governed memory store for ${options.ownerName} and projects runtime context without surrendering canonical authority.
`, "utf-8");

  writeFileSync(resolve(options.storePath, "backups", "snapshots", "README.md"), `# Snapshots

This directory is reserved for timestamped store snapshots created by rollback tooling.
`, "utf-8");

  return true;
}

async function prepareWorkspace(workspacePath: string, autoYes: boolean): Promise<string> {
  const resolvedWorkspace = resolve(workspacePath);
  const pathState = getPathState(resolvedWorkspace);
  if (pathState === "file") {
    throw new Error(`Workspace path points to a file, not a directory: ${resolvedWorkspace}`);
  }
  mkdirSync(resolvedWorkspace, { recursive: true });

  if (directoryHasEntries(resolvedWorkspace)) {
    const entries = readdirSync(resolvedWorkspace, { withFileTypes: true });
    const managedEntries = entries.filter((entry) => MANAGED_WORKSPACE_ENTRIES.has(entry.name));
    const unmanagedEntries = entries.filter((entry) => !MANAGED_WORKSPACE_ENTRIES.has(entry.name));

    if (unmanagedEntries.length > 0) {
      throw new Error(
        `Workspace contains unmanaged files or directories (${unmanagedEntries.map((entry) => entry.name).join(", ")}). Use an empty or dedicated workspace path.`,
      );
    }

    const confirmed = managedEntries.length === 0
      ? true
      : autoYes ? true : await confirmWipe(resolvedWorkspace, managedEntries.map((entry) => entry.name));
    if (!confirmed) {
      throw new Error(`Workspace reset cancelled: ${resolvedWorkspace}`);
    }
    for (const entry of managedEntries) {
      rmSync(resolve(resolvedWorkspace, entry.name), { recursive: true, force: true });
    }
  }

  return resolvedWorkspace;
}

function writeStoreOnboarding(storePath: string, options: SetupOptions): void {
  writeFileSync(resolve(storePath, "CRISTALINA-SETUP.md"), `# Cristalina Setup

Store path:
- \`${storePath}\`

What exists now:
- canonical core under \`core/\`
- entity registry under \`entities/\`
- active policies under \`policy/\`
- compiled runtime output will appear under \`compiled/\`

Suggested next steps:
1. Validate the store:

\`\`\`bash
cristalina validate lint "${storePath}"
\`\`\`

2. Start the live portal:

\`\`\`bash
cristalina portal serve --store "${storePath}" --port ${options.portalPort}
\`\`\`

3. If you want an OpenClaw workspace later:

\`\`\`bash
cristalina onboard setup --store "${storePath}" --workspace /absolute/path/to/openclaw --yes
\`\`\`
`, "utf-8");
}

function writeWorkspaceOnboarding(workspacePath: string, options: SetupOptions): void {
  writeFileSync(resolve(workspacePath, "CRISTALINA-ONBOARDING.md"), `# Cristalina In This OpenClaw Workspace

This workspace is a runtime projection, not the canonical store.

Canonical store:
- \`${options.storePath}\`

Projection profile:
- audience: \`${options.audience}\`
- channel: \`${options.channel}\`
- profile: \`${options.profile}\`

Point OpenClaw at:
- \`SOUL.md\`
- \`VALUE.md\`
- \`USER.md\`
- \`MEMORY.md\`

Useful commands:

\`\`\`bash
cristalina openclaw ingest --store "${options.storePath}" --workspace "${workspacePath}"
cristalina openclaw bootstrap --store "${options.storePath}" --workspace "${workspacePath}" --audience "${options.audience}" --channel "${options.channel}" --profile "${options.profile}"
cristalina portal serve --store "${options.storePath}" --port ${options.portalPort}
\`\`\`
`, "utf-8");
}

function nextSteps(options: SetupOptions): string {
  const steps = [
    "Next steps:",
    `1. Run \`cristalina validate lint "${options.storePath}"\`.`,
    `2. Run \`cristalina portal serve --store "${options.storePath}" --port ${options.portalPort}\`.`,
  ];
  if (options.workspacePath) {
    steps.push(`3. Point OpenClaw at \`${resolve(options.workspacePath, "SOUL.md")}\`, \`${resolve(options.workspacePath, "VALUE.md")}\`, \`${resolve(options.workspacePath, "USER.md")}\`, and \`${resolve(options.workspacePath, "MEMORY.md")}\`.`);
  }
  return steps.join("\n");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "cristalina-store";
}

function quote(value: string): string {
  return JSON.stringify(value);
}

function normalizeSetupInput(values: ReturnType<typeof parseArgs>["values"]): NormalizedSetupInput {
  const storePath = stringOption(values.store) ?? ".cristalina";
  const workspacePath = stringOption(values.workspace);
  const displayName = stringOption(values["display-name"]);
  const ownerName = stringOption(values["owner-name"]);
  const agentName = stringOption(values["agent-name"]);
  const storeName = stringOption(values["store-name"]);
  const audienceRaw = stringOption(values.audience) ?? "owner_private";
  const channel = stringOption(values.channel) ?? "owner_private_runtime";
  const profileRaw = stringOption(values.profile) ?? "deep";
  const launchPortal = booleanOption(values["launch-portal"]);
  const portalHost = stringOption(values["portal-host"]) ?? "127.0.0.1";
  const portalPortRaw = stringOption(values["portal-port"]) ?? "8787";
  const portalPort = Number.parseInt(portalPortRaw, 10);

  if (!Number.isFinite(portalPort)) {
    throw new Error(`Invalid portal port: ${portalPortRaw}`);
  }

  if (!VALID_AUDIENCES.includes(audienceRaw as AudienceOption)) {
    throw new Error(`Invalid audience: ${audienceRaw}. Valid audiences: ${VALID_AUDIENCES.join(", ")}`);
  }

  if (!VALID_PROFILES.includes(profileRaw as ProfileOption)) {
    throw new Error(`Invalid profile: ${profileRaw}. Valid profiles: ${VALID_PROFILES.join(", ")}`);
  }

  return {
    storePath,
    workspacePath,
    storeName,
    displayName,
    ownerName,
    agentName,
    audience: audienceRaw as AudienceOption,
    channel,
    profile: profileRaw as ProfileOption,
    yes: booleanOption(values.yes),
    wizard: booleanOption(values.wizard),
    launchPortal,
    portalHost,
    portalPort,
  };
}

function shouldRunWizard(input: NormalizedSetupInput): boolean {
  const interactive = process.stdin.isTTY && process.stdout.isTTY;
  return interactive && (input.wizard || !hasExplicitSetupOverrides(input));
}

function hasExplicitSetupOverrides(input: NormalizedSetupInput): boolean {
  return Boolean(
    input.workspacePath
    || input.storeName
    || input.displayName
    || input.ownerName
    || input.agentName
    || input.launchPortal
    || input.portalHost !== "127.0.0.1"
    || input.portalPort !== 8787
    || input.audience !== "owner_private"
    || input.channel !== "owner_private_runtime"
    || input.profile !== "deep"
    || input.storePath !== ".cristalina",
  );
}

function inferSetupSurface(input: NormalizedSetupInput): SetupSurface {
  if (input.workspacePath && input.launchPortal) return "full";
  if (input.workspacePath) return "openclaw";
  if (input.launchPortal) return "portal";
  return "store_only";
}

function stringOption(value: string | boolean | (string | boolean)[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function booleanOption(value: string | boolean | (string | boolean)[] | undefined): boolean {
  return value === true;
}

async function prompt(rl: ReturnType<typeof createInterface> | null, label: string, fallback: string): Promise<string> {
  if (!rl) return fallback;
  const answer = await rl.question(`${label} [${fallback}]: `);
  return answer.trim() || fallback;
}

async function optionalPrompt(rl: ReturnType<typeof createInterface> | null, label: string): Promise<string | undefined> {
  if (!rl) return undefined;
  const answer = await rl.question(`${label}: `);
  return answer.trim() || undefined;
}

async function confirmWipe(workspacePath: string, managedEntries: string[]): Promise<boolean> {
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(
      `Workspace ${workspacePath} will reset managed Cristalina/OpenClaw artifacts (${managedEntries.join(", ")}). Type RESET to continue: `,
    );
    return answer === "RESET";
  } finally {
    rl.close();
  }
}

async function waitForSignal(cleanup: () => Promise<void>): Promise<void> {
  await new Promise<void>((resolveWait) => {
    const shutdown = () => {
      void cleanup().finally(resolveWait);
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  });
}
