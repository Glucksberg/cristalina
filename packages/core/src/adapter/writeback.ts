import { createHash } from "node:crypto";
import { parse as yamlParse, stringify as yamlStringify } from "yaml";
import type {
  AdapterWritebackContract,
  DerivedArtifact,
  DerivedArtifactType,
  PrivacyScope,
  ProjectionProfile,
  ProjectionManifest,
} from "@cristalina/types";
import type { LogInput, ProposeInput, OperationResult } from "../operations/types.js";
import { COMPILED_PATHS, contractPathForCompiledArtifact } from "../store/paths.js";
import type { CristalinaStore } from "../store/store.js";
import { executeOperation } from "../operations/index.js";

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
  projection_profile: ProjectionProfile;
  path: string;
}

export interface RuntimeDriftLogArgs {
  path: string;
  artifact_type: DerivedArtifactType;
  projection_id: string;
  audience: PrivacyScope;
  channel?: string;
  projection_profile: ProjectionProfile;
  diff_summary: string;
  actor?: string;
}

export interface IngestProjectionDriftInput extends RuntimeDriftLogArgs {
  previous_content: string;
  current_content: string;
}

export interface DriftIngestResult {
  driftEvent: OperationResult;
  proposals: OperationResult[];
}

export function writebackRuleForPath(path: string) {
  const contractPath = contractPathForCompiledArtifact(path);
  return OPENCLAW_WRITEBACK_CONTRACT.files.find((rule) => rule.path === contractPath) ?? null;
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
    projection_profile: input.projection_profile,
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
      projection_profile: artifact.projection_profile,
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
      projection_profile: artifact.projection_profile,
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
  projection_profile: ProjectionManifest["projection_profile"],
  channel?: string,
): ProjectionManifest {
  return {
    projection_id,
    adapter: OPENCLAW_WRITEBACK_CONTRACT.adapter,
    generated_at,
    audience,
    channel,
    projection_profile,
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
      projection_profile: args.projection_profile,
      diff_summary: args.diff_summary,
      writeback_mode: OPENCLAW_WRITEBACK_CONTRACT.writeback_mode,
    },
  };
}

function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return content;
  return content.slice(end + 4).trimStart();
}

function normalizeSectionName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function extractSectionStatements(
  artifactType: DerivedArtifactType,
  sectionName: string,
  content: string,
): string[] {
  const body = stripFrontmatter(content);
  const lines = body.split(/\r?\n/);
  const target = normalizeSectionName(sectionName);
  const statements: string[] = [];
  let inSection = false;
  let beforeFirstSection = false;

  if (artifactType === "bootstrap_soul" && target === "identity") {
    beforeFirstSection = true;
  }
  if (artifactType === "bootstrap_value" && target === "values") {
    beforeFirstSection = true;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith("# ")) {
      inSection = beforeFirstSection;
      continue;
    }
    if (line.startsWith("## ")) {
      inSection = normalizeSectionName(line.slice(3)) === target;
      beforeFirstSection = false;
      continue;
    }
    if (!inSection || !line.startsWith("- ")) continue;
    statements.push(line.slice(2).trim());
  }

  return [...new Set(statements)];
}

function diffSummary(previousStatements: string[], currentStatements: string[]): string {
  const previous = new Set(previousStatements);
  const current = new Set(currentStatements);
  const added = currentStatements.filter((statement) => !previous.has(statement));
  const removed = previousStatements.filter((statement) => !current.has(statement));
  return `added ${added.length}, removed ${removed.length}`;
}

function sectionKind(sectionName: string): "identity_trait" | "style_rule" | "value" | "preference" | "fact" | "constraint" {
  switch (sectionName) {
    case "identity":
      return "identity_trait";
    case "style":
      return "style_rule";
    case "values":
      return "value";
    case "preferences":
      return "preference";
    case "open_loops":
      return "constraint";
    default:
      return "fact";
  }
}

function proposalTypeForKind(
  kind: ReturnType<typeof sectionKind>,
  operation: "create" | "confirm" | "deprecate",
): ProposeInput["type"] {
  if (kind === "value") return operation === "create" ? "new_value" : "revise_value";
  if (kind === "identity_trait" || kind === "style_rule") {
    return operation === "deprecate" ? "deprecate_memory" : "identity_adjustment";
  }
  if (kind === "preference") {
    if (operation === "create") return "new_fact";
    return "revise_preference";
  }
  if (operation === "deprecate") return "deprecate_memory";
  return operation === "confirm" ? "revise_fact" : "new_fact";
}

function policyTagsForKind(kind: ReturnType<typeof sectionKind>): string[] | undefined {
  if (kind === "identity_trait" || kind === "style_rule") return ["identity"];
  if (kind === "value") return ["values"];
  return undefined;
}

function riskForKind(kind: ReturnType<typeof sectionKind>): ProposeInput["risk"] | undefined {
  if (kind === "identity_trait" || kind === "style_rule") {
    return { level: "high", requires_human_approval: true };
  }
  if (kind === "value") {
    return { level: "high", requires_human_approval: true };
  }
  return { level: "medium", requires_human_approval: true };
}

function defaultTargetRef(
  storeSnapshot: Awaited<ReturnType<CristalinaStore["read"]>>,
  kind: ReturnType<typeof sectionKind>,
  sectionName: string,
): ProposeInput["target_ref"] {
  if (kind === "identity_trait" || kind === "style_rule") {
    const agent = storeSnapshot.entities.find((entity) => entity.data.kind === "agent");
    if (agent && typeof agent.data.id === "string") {
      return {
        entity_id: agent.data.id,
        kind: "agent",
        facet: sectionName,
      };
    }
  }

  const owner = storeSnapshot.entities.find((entity) => entity.data.kind === "owner");
  if (owner && typeof owner.data.id === "string") {
    return {
      entity_id: owner.data.id,
      kind: "owner",
      facet: sectionName,
    };
  }

  return { kind, facet: sectionName };
}

function findExistingObject(
  storeSnapshot: Awaited<ReturnType<CristalinaStore["read"]>>,
  kind: ReturnType<typeof sectionKind>,
  statement: string,
) {
  return storeSnapshot.coreObjects.find((obj) =>
    obj.data.kind === kind
    && obj.data.statement === statement
    && obj.data.status !== "deprecated"
    && obj.data.status !== "archived");
}

export async function ingestProjectionDrift(
  store: CristalinaStore,
  input: IngestProjectionDriftInput,
): Promise<DriftIngestResult> {
  const rule = writebackRuleForPath(input.path);
  if (!rule) {
    throw new Error(`No writeback contract rule defined for ${input.path}`);
  }

  const summary = diffSummary(
    rule.machine_extractable_sections.flatMap((section) => extractSectionStatements(rule.artifact_type, section, input.previous_content)),
    rule.machine_extractable_sections.flatMap((section) => extractSectionStatements(rule.artifact_type, section, input.current_content)),
  );

  const driftEvent = await executeOperation(store, buildRuntimeDriftLogInput({
    path: input.path,
    artifact_type: input.artifact_type,
    projection_id: input.projection_id,
    audience: input.audience,
    channel: input.channel,
    projection_profile: input.projection_profile,
    diff_summary: `${input.diff_summary}; ${summary}`,
    actor: input.actor,
  }));

  const proposals: OperationResult[] = [];
  if (!rule.parsable || rule.machine_extractable_sections.length === 0) {
    return { driftEvent, proposals };
  }

  const snapshot = await store.read();
  const supportingEventId = driftEvent.produced[0];

  for (const section of rule.machine_extractable_sections) {
    const before = extractSectionStatements(rule.artifact_type, section, input.previous_content);
    const after = extractSectionStatements(rule.artifact_type, section, input.current_content);
    const kind = sectionKind(section);

    const previousSet = new Set(before);
    const currentSet = new Set(after);
    const added = after.filter((statement) => !previousSet.has(statement));
    const removed = before.filter((statement) => !currentSet.has(statement));

    for (const statement of added) {
      const existing = findExistingObject(snapshot, kind, statement);
      const operation: ProposeInput["operation"] = existing ? "confirm" : "create";
      const target_ref = existing && typeof existing.data.id === "string"
        ? { object_id: existing.data.id, kind, facet: section }
        : defaultTargetRef(snapshot, kind, section);
      const proposal = await executeOperation(store, {
        op: "PROPOSE",
        type: proposalTypeForKind(kind, operation),
        operation,
        target_ref,
        candidate_payload: {
          kind,
          statement,
          privacy_scope: input.audience,
        },
        reason: `Runtime drift extracted from ${input.path} section ${section}`,
        provenance: { supporting_events: supportingEventId ? [supportingEventId] : [] },
        confidence: rule.default_confidence,
        privacy_scope: input.audience,
        actor: input.actor ?? OPENCLAW_WRITEBACK_CONTRACT.adapter,
        policy_tags: policyTagsForKind(kind),
        risk: riskForKind(kind),
      });
      proposals.push(proposal);
    }

    for (const statement of removed) {
      const existing = findExistingObject(snapshot, kind, statement);
      if (!existing || typeof existing.data.id !== "string") continue;

      const proposal = await executeOperation(store, {
        op: "PROPOSE",
        type: proposalTypeForKind(kind, "deprecate"),
        operation: "deprecate",
        target_ref: {
          object_id: existing.data.id,
          kind,
          facet: section,
        },
        candidate_payload: {
          kind,
          statement,
          privacy_scope: input.audience,
        },
        reason: `Runtime drift removed "${statement}" from ${input.path} section ${section}`,
        provenance: { supporting_events: supportingEventId ? [supportingEventId] : [] },
        confidence: rule.default_confidence,
        privacy_scope: input.audience,
        actor: input.actor ?? OPENCLAW_WRITEBACK_CONTRACT.adapter,
        policy_tags: policyTagsForKind(kind),
        risk: riskForKind(kind),
      });
      proposals.push(proposal);
    }
  }

  return { driftEvent, proposals };
}
