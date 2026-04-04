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
      allowed_operations: ["create", "confirm", "revise", "deprecate"],
      provenance_source: "openclaw_projection_drift",
    },
    {
      path: COMPILED_PATHS.bootstrapValue,
      artifact_type: "bootstrap_value",
      parsable: true,
      machine_extractable_sections: ["values"],
      default_confidence: 0.64,
      requires_human_review: true,
      allowed_operations: ["create", "confirm", "revise", "deprecate"],
      provenance_source: "openclaw_projection_drift",
    },
    {
      path: COMPILED_PATHS.bootstrapUser,
      artifact_type: "bootstrap_user",
      parsable: true,
      machine_extractable_sections: ["interaction_preferences", "user_model"],
      default_confidence: 0.76,
      requires_human_review: true,
      allowed_operations: ["create", "confirm", "revise", "deprecate"],
      provenance_source: "openclaw_projection_drift",
    },
    {
      path: COMPILED_PATHS.bootstrapMemory,
      artifact_type: "bootstrap_memory",
      parsable: true,
      machine_extractable_sections: ["active_projects", "working_set", "open_loops"],
      default_confidence: 0.58,
      requires_human_review: true,
      allowed_operations: ["create", "confirm", "revise", "deprecate"],
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

function sectionAliases(artifactType: DerivedArtifactType, sectionName: string): string[] {
  const normalized = normalizeSectionName(sectionName);
  if (artifactType === "bootstrap_user") {
    if (normalized === "interaction_preferences") return ["interaction_preferences", "preferences"];
    if (normalized === "user_model") return ["user_model", "known_facts"];
  }
  if (artifactType === "bootstrap_memory") {
    if (normalized === "working_set") return ["working_set", "active_memory"];
    if (normalized === "active_projects") return ["active_projects"];
  }
  return [normalized];
}

type ExtractedKind =
  | "identity_trait"
  | "style_rule"
  | "value"
  | "preference"
  | "fact"
  | "constraint"
  | "project"
  | "belief";

interface ExtractedEntry {
  kind: ExtractedKind;
  statement: string;
  tags?: string[];
}

const TAGGED_KINDS = new Set<ExtractedKind>([
  "fact",
  "constraint",
  "belief",
  "project",
  "preference",
  "identity_trait",
  "style_rule",
  "value",
]);

function uniqueTags(tags: string[] | undefined): string[] | undefined {
  if (!tags || tags.length === 0) return undefined;
  return [...new Set(tags)].sort();
}

function sectionDefaultKind(sectionName: string): ExtractedKind {
  switch (sectionName) {
    case "identity":
      return "identity_trait";
    case "style":
      return "style_rule";
    case "values":
      return "value";
    case "preferences":
    case "interaction_preferences":
      return "preference";
    case "active_projects":
      return "project";
    case "open_loops":
      return "constraint";
    default:
      return "fact";
  }
}

function sectionAllowedKinds(sectionName: string): readonly ExtractedKind[] {
  switch (sectionName) {
    case "user_model":
    case "known_facts":
      return ["fact", "constraint", "belief"];
    case "working_set":
    case "active_memory":
      return ["fact", "constraint", "belief"];
    case "active_projects":
      return ["project"];
    case "open_loops":
      return ["constraint"];
    case "interaction_preferences":
    case "preferences":
      return ["preference"];
    default:
      return [sectionDefaultKind(sectionName)];
  }
}

function sectionDefaultTags(sectionName: string): string[] | undefined {
  if (sectionName === "open_loops") return ["open_loop"];
  return undefined;
}

function entryKey(entry: ExtractedEntry): string {
  const tags = uniqueTags(entry.tags)?.join(",") ?? "";
  return `${entry.kind}|${tags}|${entry.statement}`;
}

function isAllowedTaggedKind(value: string, sectionName: string): value is ExtractedKind {
  return TAGGED_KINDS.has(value as ExtractedKind)
    && sectionAllowedKinds(sectionName).includes(value as ExtractedKind);
}

function parseSectionEntry(sectionName: string, bulletContent: string): ExtractedEntry | null {
  const trimmed = bulletContent.trim();
  if (!trimmed.length) return null;

  const defaultKind = sectionDefaultKind(sectionName);
  const defaultTags = sectionDefaultTags(sectionName);
  const match = trimmed.match(/^\[(?<kind>[a-z_]+)\]\s+(?<statement>.+)$/i);

  if (!match?.groups) {
    return {
      kind: defaultKind,
      statement: trimmed,
      tags: defaultTags,
    };
  }

  const taggedKind = match.groups.kind.toLowerCase();
  const statement = match.groups.statement.trim();
  if (!statement.length) return null;

  return {
    kind: isAllowedTaggedKind(taggedKind, sectionName) ? taggedKind : defaultKind,
    statement,
    tags: defaultTags,
  };
}

function extractSectionEntries(
  artifactType: DerivedArtifactType,
  sectionName: string,
  content: string,
): ExtractedEntry[] {
  const body = stripFrontmatter(content);
  const lines = body.split(/\r?\n/);
  const targets = new Set(sectionAliases(artifactType, sectionName));
  const entries: ExtractedEntry[] = [];
  let inSection = false;
  let beforeFirstSection = false;

  if (artifactType === "bootstrap_soul" && targets.has("identity")) {
    beforeFirstSection = true;
  }
  if (artifactType === "bootstrap_value" && targets.has("values")) {
    beforeFirstSection = true;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith("# ")) {
      inSection = beforeFirstSection;
      continue;
    }
    if (line.startsWith("## ")) {
      inSection = targets.has(normalizeSectionName(line.slice(3)));
      beforeFirstSection = false;
      continue;
    }
    if (!inSection || !line.startsWith("- ")) continue;
    const entry = parseSectionEntry(sectionName, line.slice(2));
    if (entry) entries.push(entry);
  }

  const deduped = new Map<string, ExtractedEntry>();
  for (const entry of entries) {
    deduped.set(entryKey(entry), entry);
  }
  return [...deduped.values()];
}

function diffSummary(previousEntries: ExtractedEntry[], currentEntries: ExtractedEntry[]): string {
  const previous = new Set(previousEntries.map((entry) => entryKey(entry)));
  const current = new Set(currentEntries.map((entry) => entryKey(entry)));
  const added = currentEntries.filter((entry) => !previous.has(entryKey(entry)));
  const removed = previousEntries.filter((entry) => !current.has(entryKey(entry)));
  return `added ${added.length}, removed ${removed.length}`;
}

function proposalTypeForKind(
  kind: ExtractedKind,
  operation: "create" | "confirm" | "revise" | "deprecate",
): ProposeInput["type"] {
  if (kind === "value") return operation === "create" ? "new_value" : "revise_value";
  if (kind === "identity_trait" || kind === "style_rule") {
    return operation === "deprecate" ? "deprecate_memory" : "identity_adjustment";
  }
  if (kind === "preference") {
    if (operation === "create") return "new_fact";
    return "revise_preference";
  }
  if (kind === "project") {
    return operation === "create" ? "new_project" : "revise_project";
  }
  if (operation === "deprecate") return "deprecate_memory";
  return operation === "create" ? "new_fact" : "revise_fact";
}

function policyTagsForKind(kind: ExtractedKind): string[] | undefined {
  if (kind === "identity_trait" || kind === "style_rule") return ["identity"];
  if (kind === "value") return ["values"];
  return undefined;
}

function riskForKind(kind: ExtractedKind): ProposeInput["risk"] | undefined {
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
  kind: ExtractedKind,
  sectionName: string,
): ProposeInput["target_ref"] {
  if (kind === "identity_trait" || kind === "style_rule") {
    const agent = storeSnapshot.entities.find((entity) => entity.data.kind === "agent" && entity.data.status === "active");
    if (agent && typeof agent.data.id === "string") {
      return {
        entity_id: agent.data.id,
        kind: "agent",
        facet: sectionName,
      };
    }
  }

  const owner = storeSnapshot.entities.find((entity) => entity.data.kind === "owner" && entity.data.status === "active");
  if (owner && typeof owner.data.id === "string") {
    return {
      entity_id: owner.data.id,
      kind: "owner",
      facet: sectionName,
    };
  }

  return { kind, facet: sectionName };
}

function objectHasRequiredTags(obj: Awaited<ReturnType<CristalinaStore["read"]>>["coreObjects"][number], tags: string[] | undefined) {
  if (!tags || tags.length === 0) return true;
  const objectTags = Array.isArray(obj.data.tags)
    ? obj.data.tags.filter((tag): tag is string => typeof tag === "string")
    : [];
  return tags.every((tag) => objectTags.includes(tag));
}

function findExistingObject(
  storeSnapshot: Awaited<ReturnType<CristalinaStore["read"]>>,
  entry: ExtractedEntry,
) {
  return storeSnapshot.coreObjects.find((obj) =>
    obj.data.kind === entry.kind
    && obj.data.statement === entry.statement
    && objectHasRequiredTags(obj, entry.tags)
    && obj.data.status !== "deprecated"
    && obj.data.status !== "archived");
}

function similarityScore(left: string, right: string): number {
  const tokenize = (value: string) =>
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter((token) => token.length > 2);

  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));
  const union = new Set([...leftTokens, ...rightTokens]);
  if (union.size === 0) return 0;

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }
  return intersection / union.size;
}

function sameRevisionGroup(left: ExtractedEntry, right: ExtractedEntry): boolean {
  return left.kind === right.kind
    && (uniqueTags(left.tags)?.join(",") ?? "") === (uniqueTags(right.tags)?.join(",") ?? "");
}

function matchRevisionPairs(
  storeSnapshot: Awaited<ReturnType<CristalinaStore["read"]>>,
  removed: ExtractedEntry[],
  added: ExtractedEntry[],
): {
  pairs: Array<{ previous: ExtractedEntry; next: ExtractedEntry; objectId: string }>;
  remainingRemoved: ExtractedEntry[];
  remainingAdded: ExtractedEntry[];
} {
  const pairs: Array<{ previous: ExtractedEntry; next: ExtractedEntry; objectId: string }> = [];
  const usedAdded = new Set<string>();
  const usedRemoved = new Set<string>();

  for (const removedEntry of removed) {
    const existing = findExistingObject(storeSnapshot, removedEntry);
    if (!existing || typeof existing.data.id !== "string") continue;

    let bestIndex = -1;
    let bestScore = -1;

    for (const [index, addedEntry] of added.entries()) {
      if (usedAdded.has(entryKey(addedEntry))) continue;
      if (!sameRevisionGroup(removedEntry, addedEntry)) continue;
      if (findExistingObject(storeSnapshot, addedEntry)) continue;

      const score = similarityScore(removedEntry.statement, addedEntry.statement);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    if (bestIndex === -1) continue;

    const candidate = added[bestIndex];
    const groupRemoved = removed.filter((entry) => sameRevisionGroup(entry, removedEntry)).length;
    const groupAdded = added.filter((entry) => sameRevisionGroup(entry, removedEntry)).length;
    if (bestScore < 0.34 && !(groupRemoved === 1 && groupAdded === 1)) continue;

    usedRemoved.add(entryKey(removedEntry));
    usedAdded.add(entryKey(candidate));
    pairs.push({
      previous: removedEntry,
      next: candidate,
      objectId: existing.data.id,
    });
  }

  return {
    pairs,
    remainingRemoved: removed.filter((entry) => !usedRemoved.has(entryKey(entry))),
    remainingAdded: added.filter((entry) => !usedAdded.has(entryKey(entry))),
  };
}

async function emitProposal(
  store: CristalinaStore,
  supportingEventId: string | undefined,
  input: IngestProjectionDriftInput,
  entry: ExtractedEntry,
  section: string,
  operation: "create" | "confirm" | "revise" | "deprecate",
  target_ref: ProposeInput["target_ref"],
  reason: string,
): Promise<OperationResult> {
  const candidate_payload: ProposeInput["candidate_payload"] = {
    kind: entry.kind,
    statement: entry.statement,
    privacy_scope: input.audience,
  };
  if (entry.tags && entry.tags.length > 0) {
    candidate_payload.tags = entry.tags;
  }

  return executeOperation(store, {
    op: "PROPOSE",
    type: proposalTypeForKind(entry.kind, operation),
    operation,
    target_ref,
    candidate_payload,
    reason,
    provenance: { supporting_events: supportingEventId ? [supportingEventId] : [] },
    confidence: writebackRuleForPath(input.path)?.default_confidence ?? 0.5,
    privacy_scope: input.audience,
    actor: input.actor ?? OPENCLAW_WRITEBACK_CONTRACT.adapter,
    policy_tags: policyTagsForKind(entry.kind),
    risk: riskForKind(entry.kind),
  });
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
    rule.machine_extractable_sections.flatMap((section) => extractSectionEntries(rule.artifact_type, section, input.previous_content)),
    rule.machine_extractable_sections.flatMap((section) => extractSectionEntries(rule.artifact_type, section, input.current_content)),
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
    const before = extractSectionEntries(rule.artifact_type, section, input.previous_content);
    const after = extractSectionEntries(rule.artifact_type, section, input.current_content);

    const previousSet = new Set(before.map((entry) => entryKey(entry)));
    const currentSet = new Set(after.map((entry) => entryKey(entry)));
    const added = after.filter((entry) => !previousSet.has(entryKey(entry)));
    const removed = before.filter((entry) => !currentSet.has(entryKey(entry)));

    const revisionMatch = matchRevisionPairs(snapshot, removed, added);
    for (const pair of revisionMatch.pairs) {
      proposals.push(await emitProposal(
        store,
        supportingEventId,
        input,
        pair.next,
        section,
        "revise",
        {
          object_id: pair.objectId,
          kind: pair.next.kind,
          facet: section,
        },
        `Runtime drift revised "${pair.previous.statement}" into "${pair.next.statement}" in ${input.path} section ${section}`,
      ));
    }

    for (const entry of revisionMatch.remainingAdded) {
      const existing = findExistingObject(snapshot, entry);
      const operation: ProposeInput["operation"] = existing ? "confirm" : "create";
      const target_ref = existing && typeof existing.data.id === "string"
        ? { object_id: existing.data.id, kind: entry.kind, facet: section }
        : defaultTargetRef(snapshot, entry.kind, section);
      const proposal = await emitProposal(
        store,
        supportingEventId,
        input,
        entry,
        section,
        operation,
        target_ref,
        `Runtime drift extracted from ${input.path} section ${section}`,
      );
      proposals.push(proposal);
    }

    for (const entry of revisionMatch.remainingRemoved) {
      const existing = findExistingObject(snapshot, entry);
      if (!existing || typeof existing.data.id !== "string") continue;

      const proposal = await emitProposal(
        store,
        supportingEventId,
        input,
        entry,
        section,
        "deprecate",
        {
          object_id: existing.data.id,
          kind: entry.kind,
          facet: section,
        },
        `Runtime drift removed "${entry.statement}" from ${input.path} section ${section}`,
      );
      proposals.push(proposal);
    }
  }

  return { driftEvent, proposals };
}
