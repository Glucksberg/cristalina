import {
  cancel,
  confirm,
  intro,
  isCancel,
  note,
  outro,
  select,
  text,
} from "@clack/prompts";
import { resolve } from "node:path";
import { directoryHasEntries, getPathState } from "./path-state.js";

export type SetupSurface = "store_only" | "openclaw" | "portal" | "full";
export type AudienceOption = "owner_private" | "agent_operational" | "project_private" | "shareable" | "public_safe";
export type ProfileOption = "tiny" | "standard" | "deep";

export interface WizardSeed {
  storePath: string;
  workspacePath?: string;
  storeName?: string;
  displayName?: string;
  ownerName?: string;
  agentName?: string;
  audience: AudienceOption;
  channel: string;
  profile: ProfileOption;
  yes: boolean;
  launchPortal: boolean;
  portalHost: string;
  portalPort: number;
}

export interface WizardResult {
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

export class WizardCancelledError extends Error {
  constructor() {
    super("wizard cancelled");
    this.name = "WizardCancelledError";
  }
}

function guardCancel<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel("Cristalina onboarding cancelled.");
    throw new WizardCancelledError();
  }
  return value;
}

async function promptSelect<T>(params: Parameters<typeof select<T>>[0]): Promise<T> {
  return guardCancel(await select(params));
}

async function promptText(params: {
  message: string;
  initialValue?: string;
  placeholder?: string;
  validate?: (value: string | undefined) => string | Error | undefined;
}): Promise<string> {
  return guardCancel(await text(params));
}

async function promptConfirm(params: Parameters<typeof confirm>[0]): Promise<boolean> {
  return guardCancel(await confirm(params));
}

export async function runOnboardWizard(seed: WizardSeed): Promise<WizardResult> {
  const draft: WizardResult = {
    setupSurface: inferSurface(seed),
    storePath: resolve(seed.storePath),
    workspacePath: seed.workspacePath ? resolve(seed.workspacePath) : undefined,
    storeName: seed.storeName ?? slugify(seed.displayName ?? "Cristalina Store"),
    displayName: seed.displayName ?? "Cristalina Store",
    ownerName: seed.ownerName ?? "Owner",
    agentName: seed.agentName ?? "Cristalina",
    audience: seed.audience,
    channel: seed.channel,
    profile: seed.profile,
    yes: seed.yes,
    launchPortal: seed.launchPortal || inferSurface(seed) === "portal" || inferSurface(seed) === "full",
    portalHost: seed.portalHost,
    portalPort: seed.portalPort,
  };

  let currentStep: "surface" | "store" | "runtime" | "portal" | "review" = "surface";
  intro("Cristalina Setup Wizard");

  try {
    while (true) {
      if (currentStep === "surface") {
        draft.setupSurface = await promptSelect<SetupSurface>({
          message: "What do you want to set up right now?",
          options: [
            {
              value: "store_only",
              label: "Starter store only",
              hint: "Initialize canonical memory without OpenClaw or portal runtime work.",
            },
            {
              value: "openclaw",
              label: "Store + OpenClaw",
              hint: "Initialize the store and project it into an OpenClaw workspace.",
            },
            {
              value: "portal",
              label: "Store + Portal",
              hint: "Initialize the store and prepare the live memory portal.",
            },
            {
              value: "full",
              label: "Full setup",
              hint: "Store, OpenClaw workspace, and live portal together.",
            },
          ],
          initialValue: draft.setupSurface,
        });
        currentStep = "store";
      }

      if (currentStep === "store") {
        await configureStoreSection(draft);
        currentStep = needsRuntime(draft) ? "runtime" : needsPortal(draft) ? "portal" : "review";
      }

      if (currentStep === "runtime") {
        await configureRuntimeSection(draft);
        currentStep = needsPortal(draft) ? "portal" : "review";
      }

      if (currentStep === "portal") {
        await configurePortalSection(draft);
        currentStep = "review";
      }

      if (currentStep === "review") {
        await note(renderSummary(draft), "Review");
        const choice = await promptSelect<"apply" | "store" | "runtime" | "portal" | "surface">({
          message: "Apply this setup or revise a section?",
          options: [
            { value: "apply", label: "Apply setup", hint: "Write the store, prepare runtime surfaces, and finish." },
            { value: "store", label: "Edit store details", hint: "Path, store identity, owner, and agent." },
            { value: "runtime", label: "Edit OpenClaw details", hint: "Workspace, audience, channel, and projection profile." },
            { value: "portal", label: "Edit portal details", hint: "Host, port, and whether to start it right away." },
            { value: "surface", label: "Change setup scope", hint: "Switch between store-only, OpenClaw, portal, or full setup." },
          ],
          initialValue: "apply",
        });

        if (choice === "apply") {
          outro("Cristalina setup ready.");
          return draft;
        }
        if (choice === "store") {
          currentStep = "store";
        } else if (choice === "runtime") {
          currentStep = needsRuntime(draft) ? "runtime" : "surface";
        } else if (choice === "portal") {
          currentStep = needsPortal(draft) ? "portal" : "surface";
        } else {
          currentStep = "surface";
        }
      }
    }
  } catch (error) {
    if (error instanceof WizardCancelledError) {
      throw error;
    }
    throw error;
  }
}

async function configureStoreSection(draft: WizardResult): Promise<void> {
  await note(
    "The store is the canonical Cristalina memory. It is governed, durable, and separate from runtime projections.",
    "Store",
  );

  while (true) {
    const candidatePath = resolve(await promptText({
      message: "Where should the .cristalina store live?",
      initialValue: draft.storePath,
      placeholder: "./.cristalina",
      validate: (value) => !value || value.trim().length === 0 ? "Store path cannot be empty." : undefined,
    }));

    const pathState = getPathState(candidatePath);
    if (pathState === "file") {
      await note("That path is a file. Choose a directory path for the canonical store.", "Invalid path");
      continue;
    }

    if (pathState !== "directory-nonempty") {
      draft.storePath = candidatePath;
      break;
    }

    const choice = await promptSelect<"use-existing" | "choose-other">({
      message: "That store path already contains files.",
      options: [
        {
          value: "use-existing",
          label: "Use existing store",
          hint: "Keep canonical memory as-is and only prepare the runtime surfaces around it.",
        },
        {
          value: "choose-other",
          label: "Choose another path",
          hint: "Point the wizard at an empty path for a fresh store.",
        },
      ],
      initialValue: "use-existing",
    });

    if (choice === "use-existing") {
      draft.storePath = candidatePath;
      return;
    }
  }

  draft.displayName = await promptText({
    message: "Store display name",
    initialValue: draft.displayName,
    placeholder: "Cristalina Store",
    validate: requireNonEmpty("Display name"),
  });

  const slugMode = await promptSelect<"auto" | "custom">({
    message: "How should the store slug be set?",
    options: [
      {
        value: "auto",
        label: "Generate it from the display name",
        hint: `Current slug: ${slugify(draft.displayName)}`,
      },
      {
        value: "custom",
        label: "Choose a custom slug",
        hint: "Useful when the repo/store name must be stable.",
      },
    ],
    initialValue: draft.storeName === slugify(draft.displayName) ? "auto" : "custom",
  });

  draft.storeName = slugMode === "custom"
    ? await promptText({
      message: "Store slug",
      initialValue: draft.storeName,
      placeholder: slugify(draft.displayName),
      validate: (value) => value && /^[a-z0-9-]+$/.test(value) ? undefined : "Use lowercase letters, numbers, and hyphens only.",
    })
    : slugify(draft.displayName);

  draft.ownerName = await promptText({
    message: "Owner name",
    initialValue: draft.ownerName,
    placeholder: "Owner",
    validate: requireNonEmpty("Owner name"),
  });

  draft.agentName = await promptText({
    message: "Agent name",
    initialValue: draft.agentName,
    placeholder: "Cristalina",
    validate: requireNonEmpty("Agent name"),
  });
}

async function configureRuntimeSection(draft: WizardResult): Promise<void> {
  await note(
    "OpenClaw receives runtime projections only. This section defines where those files will be written and how scoped they should be.",
    "OpenClaw",
  );

  while (true) {
    const candidatePath = resolve(await promptText({
      message: "OpenClaw workspace path",
      initialValue: draft.workspacePath ?? "",
      placeholder: "/absolute/path/to/openclaw",
      validate: (value) => {
        if (!value || value.trim().length === 0) return "Workspace path is required for OpenClaw setup.";
        return undefined;
      },
    }));

    const pathState = getPathState(candidatePath);
    if (pathState === "file") {
      await note("That path is a file. Choose a directory path for the OpenClaw workspace.", "Invalid path");
      continue;
    }

    if (pathState !== "directory-nonempty") {
      draft.workspacePath = candidatePath;
      break;
    }

    const choice = await promptSelect<"wipe" | "choose-other">({
      message: "That workspace already contains files.",
      options: [
        {
          value: "wipe",
          label: "Use it and wipe existing files",
          hint: "Recommended only if this is a dedicated OpenClaw runtime workspace.",
        },
        {
          value: "choose-other",
          label: "Choose another path",
          hint: "Keep the existing directory untouched.",
        },
      ],
      initialValue: draft.yes ? "wipe" : "choose-other",
    });

    if (choice === "wipe") {
      draft.workspacePath = candidatePath;
      draft.yes = true;
      break;
    }
  }

  draft.audience = await promptSelect<AudienceOption>({
    message: "Which audience should this runtime projection target?",
    options: [
      { value: "owner_private", label: "Owner private", hint: "Safest default for direct owner sessions." },
      { value: "agent_operational", label: "Agent operational", hint: "Internal runtime memory with tighter visibility." },
      { value: "project_private", label: "Project private", hint: "Shared team or workspace-safe context." },
      { value: "shareable", label: "Shareable", hint: "Broader but still intentionally scoped." },
      { value: "public_safe", label: "Public safe", hint: "Strictly export-safe projection." },
    ],
    initialValue: draft.audience,
  });

  const channelPreset = await promptSelect<"owner_private_runtime" | "project_private_runtime" | "public_preview" | "custom">({
    message: "How should the runtime channel be named?",
    options: [
      { value: "owner_private_runtime", label: "owner_private_runtime", hint: "Personal runtime for the owner." },
      { value: "project_private_runtime", label: "project_private_runtime", hint: "Scoped project runtime." },
      { value: "public_preview", label: "public_preview", hint: "Useful for demos or public-safe projections." },
      { value: "custom", label: "Custom channel name", hint: "Use your own channel namespace." },
    ],
    initialValue: presetForChannel(draft.channel),
  });

  draft.channel = channelPreset === "custom"
    ? await promptText({
      message: "Custom channel name",
      initialValue: draft.channel,
      placeholder: "owner_private_runtime",
      validate: (value) => !value || value.trim().length === 0 ? "Channel cannot be empty." : undefined,
    })
    : channelPreset;

  draft.profile = await promptSelect<ProfileOption>({
    message: "Choose a projection profile",
    options: [
      { value: "tiny", label: "Tiny", hint: "Lowest context footprint, good for public or narrow channels." },
      { value: "standard", label: "Standard", hint: "Balanced runtime projection for day-to-day use." },
      { value: "deep", label: "Deep", hint: "Most expressive projection, best for private owner sessions." },
    ],
    initialValue: draft.profile,
  });
}

async function configurePortalSection(draft: WizardResult): Promise<void> {
  await note(
    "The portal is a read-only live view into the store. It shows projections, diagnostics, and recent changes over WebSocket.",
    "Portal",
  );

  const hostMode = await promptSelect<"local" | "lan" | "custom">({
    message: "How should the portal bind to the network?",
    options: [
      { value: "local", label: "Local only (127.0.0.1)", hint: "Recommended default. Only this machine can reach it." },
      { value: "lan", label: "LAN visible (0.0.0.0)", hint: "Reachable from your local network." },
      { value: "custom", label: "Custom host", hint: "Use a specific interface or hostname." },
    ],
    initialValue: draft.portalHost === "0.0.0.0" ? "lan" : draft.portalHost === "127.0.0.1" ? "local" : "custom",
  });

  if (hostMode === "local") {
    draft.portalHost = "127.0.0.1";
  } else if (hostMode === "lan") {
    draft.portalHost = "0.0.0.0";
  } else {
    draft.portalHost = await promptText({
      message: "Portal host",
      initialValue: draft.portalHost,
      placeholder: "127.0.0.1",
      validate: requireNonEmpty("Portal host"),
    });
  }

  draft.portalPort = Number.parseInt(await promptText({
    message: "Portal port",
    initialValue: String(draft.portalPort),
    placeholder: "8787",
    validate: (value) => {
      const port = Number.parseInt(value ?? "", 10);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        return "Enter a valid TCP port between 1 and 65535.";
      }
      return undefined;
    },
  }), 10);

  draft.launchPortal = await promptConfirm({
    message: "Start the portal automatically when setup finishes?",
    initialValue: draft.launchPortal,
  });
}

function renderSummary(draft: WizardResult): string {
  const lines = [
    `Scope: ${labelForSurface(draft.setupSurface)}`,
    `Store path: ${draft.storePath}`,
  ];

  if (!directoryHasEntries(draft.storePath)) {
    lines.push(`Store display name: ${draft.displayName}`);
    lines.push(`Store slug: ${draft.storeName}`);
    lines.push(`Owner: ${draft.ownerName}`);
    lines.push(`Agent: ${draft.agentName}`);
  } else {
    lines.push("Store mode: existing canonical store will be preserved");
  }

  if (needsRuntime(draft)) {
    lines.push(`OpenClaw workspace: ${draft.workspacePath ?? "(not set)"}`);
    lines.push(`Projection audience: ${draft.audience}`);
    lines.push(`Channel: ${draft.channel}`);
    lines.push(`Profile: ${draft.profile}`);
    lines.push(`Workspace wipe allowed: ${draft.yes ? "yes" : "ask before wiping"}`);
  }

  if (needsPortal(draft)) {
    lines.push(`Portal host: ${draft.portalHost}`);
    lines.push(`Portal port: ${draft.portalPort}`);
    lines.push(`Launch portal now: ${draft.launchPortal ? "yes" : "no"}`);
  }

  return lines.join("\n");
}

function inferSurface(seed: WizardSeed): SetupSurface {
  if (seed.workspacePath && seed.launchPortal) return "full";
  if (seed.workspacePath) return "openclaw";
  if (seed.launchPortal) return "portal";
  return "store_only";
}

function needsRuntime(draft: Pick<WizardResult, "setupSurface">): boolean {
  return draft.setupSurface === "openclaw" || draft.setupSurface === "full";
}

function needsPortal(draft: Pick<WizardResult, "setupSurface">): boolean {
  return draft.setupSurface === "portal" || draft.setupSurface === "full";
}

function presetForChannel(channel: string): "owner_private_runtime" | "project_private_runtime" | "public_preview" | "custom" {
  if (channel === "owner_private_runtime") return channel;
  if (channel === "project_private_runtime") return channel;
  if (channel === "public_preview") return channel;
  return "custom";
}

function labelForSurface(surface: SetupSurface): string {
  switch (surface) {
    case "store_only":
      return "Starter store only";
    case "openclaw":
      return "Store + OpenClaw";
    case "portal":
      return "Store + Portal";
    case "full":
      return "Full setup";
  }
}

function requireNonEmpty(label: string) {
  return (value: string | undefined) => !value || value.trim().length === 0 ? `${label} cannot be empty.` : undefined;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "cristalina-store";
}
