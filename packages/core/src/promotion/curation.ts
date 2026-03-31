import type { ParsedStore, ParsedObject } from "@cristalina/validate";
import type { Clock } from "../clock/clock.js";
import type { IdGenerator } from "../id/generator.js";
import { curationPacketPath } from "../store/paths.js";
import { requiresHumanApproval, type PromotionPolicy, DEFAULT_POLICY } from "./policy.js";

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

/** Score a proposal for curation priority */
function scoreProposal(proposal: ParsedObject, policy: PromotionPolicy): number {
  let score = 0;
  const data = proposal.data;

  // High-risk domains get higher priority
  const target = typeof data.target === "string" ? data.target : "";
  const type = typeof data.type === "string" ? data.type : "";
  if (requiresHumanApproval(target, type, policy)) score += 30;

  // Higher impact = higher priority
  const impact = data.impact_level;
  if (impact === "critical") score += 25;
  else if (impact === "high") score += 20;
  else if (impact === "medium") score += 10;

  // Lower confidence = more uncertain = more valuable to ask
  const confidence = typeof data.confidence === "number" ? data.confidence : 0.5;
  score += Math.round((1 - confidence) * 20);

  // Has a question candidate ready
  if (typeof data.question_candidate === "string") score += 5;

  return score;
}

/** Generate a question from a proposal */
function proposalToQuestion(
  proposal: ParsedObject,
  questionId: string,
  policy: PromotionPolicy,
): CurationQuestion {
  const data = proposal.data;
  const propId = typeof data.id === "string" ? data.id : "unknown";
  const type = typeof data.type === "string" ? data.type : "new_fact";
  const target = typeof data.target === "string" ? data.target : "";
  const reason = typeof data.reason === "string" ? data.reason : "";

  // Use question_candidate if available, otherwise generate from reason
  const question = typeof data.question_candidate === "string"
    ? data.question_candidate
    : `Regarding: ${reason}`;

  // Map proposal type to question class
  let questionType = "factual_correction";
  if (type.includes("value")) questionType = "value_arbitration";
  else if (type.includes("identity") || type.includes("style")) questionType = "identity_style_calibration";
  else if (type.includes("privacy")) questionType = "privacy_clarification";
  else if (type.includes("contradiction")) questionType = "contradiction_resolution";

  const isHighRisk = requiresHumanApproval(target, type, policy);
  const priority = isHighRisk ? "high" : "medium";

  return {
    id: questionId,
    type: questionType,
    question,
    proposal_refs: [propId],
    priority,
  };
}

/** Generate a daily curation packet from pending proposals */
export function generateCurationPacket(
  store: ParsedStore,
  clock: Clock,
  idGen: IdGenerator,
  owner: string = "owner",
  policy: PromotionPolicy = DEFAULT_POLICY,
): GeneratedPacket | null {
  // Find pending proposals
  const pending = store.proposals.filter((p) => p.data.status === "pending");
  if (pending.length === 0) return null;

  // Score and sort
  const scored = pending
    .map((p) => ({ proposal: p, score: scoreProposal(p, policy) }))
    .sort((a, b) => b.score - a.score);

  // Select top N
  const count = Math.min(scored.length, policy.defaultQuestionCount);
  const selected = scored.slice(0, count);

  // Generate questions
  const questions: CurationQuestion[] = selected.map(({ proposal }) => {
    const qId = idGen.next("question");
    return proposalToQuestion(proposal, qId, policy);
  });

  const packetId = idGen.next("curationPacket");
  const ts = clock.isoNow();
  const dateStr = clock.dateStr();

  const data: Record<string, unknown> = {
    packet_id: packetId,
    created_at: ts,
    owner,
    question_count: questions.length,
    questions: questions.map((q) => ({
      id: q.id,
      type: q.type,
      question: q.question,
      proposal_refs: q.proposal_refs,
      priority: q.priority,
    })),
  };

  return {
    data,
    path: curationPacketPath(dateStr),
    questions,
  };
}
