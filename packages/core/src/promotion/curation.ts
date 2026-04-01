import type { ParsedStore, ParsedObject } from "@cristalina/validate";
import type { MemoryObjectKind as MemoryObjectKindType } from "@cristalina/types";
import type { Clock } from "../clock/clock.js";
import type { IdGenerator } from "../id/generator.js";
import { curationPacketPath } from "../store/paths.js";
import { approvalReasonsForProposal, requiresHumanApproval, type PromotionPolicy, DEFAULT_POLICY } from "./policy.js";
import { questionClassForProposalType, requireProposalType } from "./proposal-type-policy.js";
import { DEFAULT_AUDIENCE_POLICY, type AudiencePolicyConfig } from "../policy/runtime.js";
import { resolvePolicyBundle } from "../policy/resolver.js";

export interface CurationQuestion {
  id: string;
  type: string;
  question: string;
  proposal_refs: string[];
  priority: "low" | "medium" | "high" | "critical";
}

export interface GeneratedPacket {
  data: Record<string, unknown>;
  path: string;
  questions: CurationQuestion[];
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function getProposalPayload(proposal: ParsedObject): Record<string, unknown> {
  return getRecord(proposal.data.candidate_payload) ?? {};
}

function getProposalTargetRef(proposal: ParsedObject): Record<string, unknown> {
  return getRecord(proposal.data.target_ref) ?? {};
}

function getRisk(proposal: ParsedObject): Record<string, unknown> {
  return getRecord(proposal.data.risk) ?? {};
}

function proposalKind(proposal: ParsedObject): string {
  const payload = getProposalPayload(proposal);
  return typeof payload.kind === "string" ? payload.kind : "fact";
}

function proposalOperation(proposal: ParsedObject): string {
  return typeof proposal.data.operation === "string" ? proposal.data.operation : "create";
}

function proposalPriority(
  proposal: ParsedObject,
  policy: PromotionPolicy,
  targetObject: ParsedObject | null = null,
  audiencePolicy: AudiencePolicyConfig = DEFAULT_AUDIENCE_POLICY,
): "low" | "medium" | "high" | "critical" {
  const risk = getRisk(proposal);
  if (risk.level === "critical" || risk.level === "high" || risk.level === "medium" || risk.level === "low") {
    return risk.level;
  }
  if (requiresHumanApproval(proposal, policy, targetObject, audiencePolicy)) return "high";
  return "medium";
}

function proposalTargetLabel(proposal: ParsedObject): string {
  const targetRef = getProposalTargetRef(proposal);
  if (typeof targetRef.object_id === "string") return targetRef.object_id;
  if (typeof targetRef.facet === "string") return targetRef.facet;
  if (typeof targetRef.kind === "string") return targetRef.kind;
  return "memory";
}

function findTargetObject(store: ParsedStore, proposal: ParsedObject): ParsedObject | null {
  const targetRef = getProposalTargetRef(proposal);
  if (typeof targetRef.object_id !== "string") return null;
  return store.coreObjects.find((obj) => obj.data.id === targetRef.object_id) ?? null;
}

/** Score a proposal for curation priority. */
function scoreProposal(
  store: ParsedStore,
  proposal: ParsedObject,
  policy: PromotionPolicy,
  audiencePolicy: AudiencePolicyConfig = DEFAULT_AUDIENCE_POLICY,
): number {
  let score = 0;
  const risk = getRisk(proposal);
  const targetObject = findTargetObject(store, proposal);
  const approvalReasons = approvalReasonsForProposal(proposal, policy, targetObject, audiencePolicy);

  if (requiresHumanApproval(proposal, policy, targetObject, audiencePolicy)) score += 30;
  if (approvalReasons.includes("thin_provenance")) score += 10;
  score += approvalReasons.filter((reason) => reason.startsWith("sensitive_policy_tag:")).length * 5;
  score += approvalReasons.filter((reason) => reason.startsWith("privacy_audience_expansion:")).length * 8;
  score += approvalReasons.filter((reason) => reason.startsWith("outward_visibility:")).length * 6;

  if (risk.level === "critical") score += 25;
  else if (risk.level === "high") score += 20;
  else if (risk.level === "medium") score += 10;

  const confidence = typeof proposal.data.confidence === "number" ? proposal.data.confidence : 0.5;
  score += Math.round((1 - confidence) * 20);

  const payload = getProposalPayload(proposal);
  if (typeof payload.statement === "string") score += 5;

  return score;
}

function questionClassForProposal(proposal: ParsedObject): string {
  const proposalId = typeof proposal.data.id === "string" ? proposal.data.id : "unknown";
  const type = requireProposalType(proposal.data.type, `Proposal ${proposalId}`);
  const kind = proposalKind(proposal) as MemoryObjectKindType;
  return questionClassForProposalType(type, kind);
}

/** Generate a human-facing question from a structured proposal. */
function proposalToQuestion(
  proposal: ParsedObject,
  questionId: string,
  policy: PromotionPolicy,
  targetObject: ParsedObject | null = null,
  audiencePolicy: AudiencePolicyConfig = DEFAULT_AUDIENCE_POLICY,
): CurationQuestion {
  const payload = getProposalPayload(proposal);
  const propId = typeof proposal.data.id === "string" ? proposal.data.id : "unknown";
  const operation = proposalOperation(proposal);
  const kind = proposalKind(proposal).replaceAll("_", " ");
  const statement = typeof payload.statement === "string" ? payload.statement : null;
  const reason = typeof proposal.data.reason === "string" ? proposal.data.reason : "";
  const targetLabel = proposalTargetLabel(proposal);

  let question = `Review ${targetLabel}: ${reason}`;
  switch (operation) {
    case "create":
      question = statement
        ? `Should I add this ${kind}: "${statement}"?`
        : `Should I add a new ${kind} based on this proposal?`;
      break;
    case "confirm":
      question = statement
        ? `Please confirm ${targetLabel}: "${statement}".`
        : `Please confirm ${targetLabel}.`;
      break;
    case "revise":
      question = statement
        ? `Should I revise ${targetLabel} to: "${statement}"?`
        : `Should I revise ${targetLabel}?`;
      break;
    case "supersede":
      question = statement
        ? `Should I replace ${targetLabel} with: "${statement}"?`
        : `Should I replace ${targetLabel} with the proposed update?`;
      break;
    case "deprecate":
      question = `Should I deprecate ${targetLabel}? ${reason}`.trim();
      break;
    case "contradict": {
      const relatedObjectId = typeof payload.related_object_id === "string"
        ? payload.related_object_id
        : "the linked memory";
      question = `Do ${targetLabel} and ${relatedObjectId} contradict each other?`;
      break;
    }
  }

  return {
    id: questionId,
    type: questionClassForProposal(proposal),
    question,
    proposal_refs: [propId],
    priority: proposalPriority(proposal, policy, targetObject, audiencePolicy),
  };
}

/** Generate a daily curation packet from pending proposals. */
export function generateCurationPacket(
  store: ParsedStore,
  clock: Clock,
  idGen: IdGenerator,
  owner: string = "owner",
  policy: PromotionPolicy = DEFAULT_POLICY,
): GeneratedPacket | null {
  const resolvedPolicies = resolvePolicyBundle(store);
  const activePolicy = policy === DEFAULT_POLICY ? resolvedPolicies.promotion : policy;
  const audiencePolicy = resolvedPolicies.audience;
  const pending = store.proposals.filter((p) => p.data.status === "pending");
  if (pending.length === 0) return null;

  const scored = pending
    .map((proposal) => ({ proposal, score: scoreProposal(store, proposal, activePolicy, audiencePolicy) }))
    .sort((a, b) => b.score - a.score);

  const count = Math.min(scored.length, activePolicy.defaultQuestionCount);
  const selected = scored.slice(0, count);

  const questions: CurationQuestion[] = selected.map(({ proposal }) => {
    const qId = idGen.next("question");
    return proposalToQuestion(proposal, qId, activePolicy, findTargetObject(store, proposal), audiencePolicy);
  });

  const packetId = idGen.next("curationPacket");
  const ts = clock.isoNow();
  const dateStr = clock.dateStr();

  const data: Record<string, unknown> = {
    packet_id: packetId,
    created_at: ts,
    owner,
    question_count: questions.length,
    questions: questions.map((question) => ({
      id: question.id,
      type: question.type,
      question: question.question,
      proposal_refs: question.proposal_refs,
      priority: question.priority,
    })),
  };

  return {
    data,
    path: curationPacketPath(dateStr),
    questions,
  };
}
