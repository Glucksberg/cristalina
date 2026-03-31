import { createHash } from "node:crypto";
import { parse as yamlParse, stringify as yamlStringify } from "yaml";
import type {
  AdapterWritebackContract,
  DerivedArtifact,
  DerivedArtifactType,
  PrivacyScope,
  ProjectionManifest,
} from "@cristalina/types";
import type { LogInput } from "../operations/types.js";
import { COMPILED_PATHS } from "../store/paths.js";

export const OPENCLAW_WRITEBACK_CONTRACT: AdapterWritebackContract = {
  adapter: "cristalina-openclaw",
  writeback_mode: "proposal_extraction",
  default_source_type: "runtime_observation",
  files: [
    {
      path: COMPILED_PATHS.hot,
      artifact_type: "compiled_hot",
      parsable: false,
      machine_extractable_sections: [],
      default_confidence: 0.35,
      requires_human_review: true,
      allowed_operations: [],
      provenance_source: "openclaw_projection_drift",
    },
    {
      path: COMPILED_PATHS.warm,
      artifact_type: "compiled_warm",
      parsable: false,
      machine_extractable_sections: [],
      default_confidence: 0.35,
      requires_human_review: true,
      allowed_operations: [],
      provenance_source: "openclaw_projection_drift",
    },
    {
      path: COMPILED_PATHS.cold,
      artifact_type: "compiled_cold",
      parsable: false,
      machine_extractable_sections: [],
      default_confidence: 0.2,
      requires_human_review: true,
      allowed_operations: [],
      provenance_source: "openclaw_projection_drift",
    },
    {
      path: COMPILED_PATHS.bootstrapSoul,
      artifact_type: "bootstrap_soul",
      parsable: true,
      machine_extractable_sections: ["identity", "style"],
      default_confidence: 0.72,
      requires_human_review: true,
      allowed_operations: ["create", "revise", "supersede"],
      provenance_source: "openclaw_projection_drift",
    },
    {
      path: COMPILED_PATHS.bootstrapValue,
      artifact_type: "bootstrap_value",
      parsable: true,
      machine_extractable_sections: ["values"],
      default_confidence: 0.64,
      requires_human_review: true,
      allowed_operations: ["create", "revise", "supersede", "deprecate"],
      provenance_source: "openclaw_projection_drift",
    },
    {
      path: COMPILED_PATHS.bootstrapUser,
      artifact_type: "bootstrap_user",
      parsable: true,
      machine_extractable_sections: ["preferences", "known_facts"],
      default_confidence: 0.76,
      requires_human_review: true,
      allowed_operations: ["create", "confirm", "revise", "supersede"],
      provenance_source: "openclaw_projection_drift",
    },
    {
      path: COMPILED_PATHS.bootstrapMemory,
      artifact_type: "bootstrap_memory",
      parsable: true,
      machine_extractable_sections: ["active_memory", "open_loops"],
      default_confidence: 0.58,
      requires_human_review: true,
      allowed_operations: ["create", "confirm", "contradict"],
      provenance_source: "openclaw_projection_drift",
    },
  ],
};

export interface ProjectionEnvelopeOptions {
  artifact: DerivedArtifact;
  body: string;
}

export interface BuildDerivedArtifactInput {
  id: string;
  artifact_type: DerivedArtifactType;
  created_at: string;
  derived_from: string[];
  intended_audience: PrivacyScope;
  generated_by?: string;
  channel?: string;
  projection_id: string;
  path: string;
}

export interface RuntimeDriftLogArgs {
  path: string;
  artifact_type: DerivedArtifactType;
  projection_id: string;
  audience: PrivacyScope;
  channel?: string;
  diff_summary: string;
  actor?: string;
}

export function writebackRuleForPath(path: string) {
  return OPENCLAW_WRITEBACK_CONTRACT.files.find((rule) => rule.path === path) ?? null;
}

export function checksumForContent(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

export function buildDerivedArtifact(input: BuildDerivedArtifactInput, body: string): DerivedArtifact {
  const rule = writebackRuleForPath(input.path);
  if (!rule) {
    throw new Error(`No writeback contract rule defined for ${input.path}`);
  }

  return {
    id: input.id as DerivedArtifact["id"],
    artifact_type: input.artifact_type,
    created_at: input.created_at,
    derived_from: input.derived_from as DerivedArtifact["derived_from"],
    intended_audience: input.intended_audience,
    generated_by: input.generated_by ?? OPENCLAW_WRITEBACK_CONTRACT.adapter,
    source: "canonical_projection",
    path: input.path,
    projection_id: input.projection_id,
    writeback_mode: OPENCLAW_WRITEBACK_CONTRACT.writeback_mode,
    parsable: rule.parsable,
    channel: input.channel,
    checksum: checksumForContent(body),
    machine_extractable_sections: rule.machine_extractable_sections.length > 0
      ? rule.machine_extractable_sections
      : undefined,
  };
}

export function wrapProjectionContent(options: ProjectionEnvelopeOptions): string {
  const { artifact, body } = options;

  if (artifact.path.endsWith(".md")) {
    const frontmatter = yamlStringify({
      generated_by: artifact.generated_by,
      source: artifact.source,
      audience: artifact.intended_audience,
      channel: artifact.channel,
      generated_at: artifact.created_at,
      projection_id: artifact.projection_id,
      artifact_id: artifact.id,
      artifact_type: artifact.artifact_type,
      writeback_mode: artifact.writeback_mode,
      parsable: artifact.parsable,
      machine_extractable_sections: artifact.machine_extractable_sections,
      checksum: artifact.checksum,
    }, { lineWidth: 120 }).trimEnd();

    return `---\n${frontmatter}\n---\n\n${body}`;
  }

  const parsed = yamlParse(body) as Record<string, unknown> | null;
  const payload = typeof parsed === "object" && parsed !== null ? parsed : { content: body };

  return yamlStringify({
    projection_metadata: {
      generated_by: artifact.generated_by,
      source: artifact.source,
      audience: artifact.intended_audience,
      channel: artifact.channel,
      generated_at: artifact.created_at,
      projection_id: artifact.projection_id,
      artifact_id: artifact.id,
      artifact_type: artifact.artifact_type,
      writeback_mode: artifact.writeback_mode,
      parsable: artifact.parsable,
      machine_extractable_sections: artifact.machine_extractable_sections,
      checksum: artifact.checksum,
    },
    ...payload,
  }, { lineWidth: 120 });
}

export function buildProjectionManifest(
  projection_id: string,
  generated_at: string,
  audience: ProjectionManifest["audience"],
  artifacts: DerivedArtifact[],
  channel?: string,
): ProjectionManifest {
  return {
    projection_id,
    adapter: OPENCLAW_WRITEBACK_CONTRACT.adapter,
    generated_at,
    audience,
    channel,
    writeback_mode: OPENCLAW_WRITEBACK_CONTRACT.writeback_mode,
    artifacts,
    contract: OPENCLAW_WRITEBACK_CONTRACT,
  };
}

export function buildRuntimeDriftLogInput(args: RuntimeDriftLogArgs): LogInput {
  return {
    op: "LOG",
    kind: "runtime_drift",
    summary: `Runtime drift detected in ${args.path}`,
    source_type: "runtime_observation",
    privacy_scope: args.audience,
    actor: args.actor ?? OPENCLAW_WRITEBACK_CONTRACT.adapter,
    tags: ["runtime_drift", `artifact:${args.artifact_type}`],
    details: {
      path: args.path,
      artifact_type: args.artifact_type,
      projection_id: args.projection_id,
      audience: args.audience,
      channel: args.channel,
      diff_summary: args.diff_summary,
      writeback_mode: OPENCLAW_WRITEBACK_CONTRACT.writeback_mode,
    },
  };
}
