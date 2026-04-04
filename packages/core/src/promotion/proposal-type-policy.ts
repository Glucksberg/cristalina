import { ProposalType } from "@cristalina/types";
import type {
  MemoryObjectKind as MemoryObjectKindType,
  ProposalOperation as ProposalOperationType,
  ProposalType as ProposalTypeType,
  QuestionClass as QuestionClassType,
} from "@cristalina/types";

interface ProposalTypePolicy {
  allowedOperations: ProposalOperationType[];
  questionClass: QuestionClassType | "kind-sensitive";
  highRisk?: boolean;
  allowedKinds?: MemoryObjectKindType[];
}

const PROPOSAL_TYPE_POLICIES: Record<ProposalTypeType, ProposalTypePolicy> = {
  new_fact: {
    allowedOperations: ["create"],
    questionClass: "kind-sensitive",
  },
  revise_fact: {
    allowedOperations: ["confirm", "revise", "supersede", "deprecate"],
    questionClass: "kind-sensitive",
  },
  revise_preference: {
    allowedOperations: ["confirm", "revise", "supersede", "deprecate"],
    questionClass: "kind-sensitive",
  },
  new_project: {
    allowedOperations: ["create"],
    questionClass: "kind-sensitive",
    allowedKinds: ["project"],
  },
  revise_project: {
    allowedOperations: ["confirm", "revise", "supersede", "deprecate"],
    questionClass: "kind-sensitive",
    allowedKinds: ["project"],
  },
  new_value: {
    allowedOperations: ["create"],
    questionClass: "value_arbitration",
    highRisk: true,
    allowedKinds: ["value", "priority"],
  },
  revise_value: {
    allowedOperations: ["confirm", "revise", "supersede", "deprecate"],
    questionClass: "value_arbitration",
    highRisk: true,
    allowedKinds: ["value", "priority"],
  },
  identity_adjustment: {
    allowedOperations: ["create", "confirm", "revise", "supersede"],
    questionClass: "identity_style_calibration",
    highRisk: true,
    allowedKinds: ["identity_trait", "style_rule"],
  },
  privacy_change: {
    allowedOperations: ["create", "confirm", "revise", "supersede", "deprecate"],
    questionClass: "privacy_clarification",
    highRisk: true,
  },
  supersede_memory: {
    allowedOperations: ["supersede"],
    questionClass: "kind-sensitive",
  },
  deprecate_memory: {
    allowedOperations: ["deprecate"],
    questionClass: "kind-sensitive",
  },
  open_contradiction: {
    allowedOperations: ["contradict"],
    questionClass: "contradiction_resolution",
  },
};

function questionClassFromKind(kind: MemoryObjectKindType | null): QuestionClassType {
  if (kind === "value" || kind === "priority") return "value_arbitration";
  if (kind === "identity_trait" || kind === "style_rule") return "identity_style_calibration";
  return "factual_correction";
}

export function getProposalTypePolicy(type: ProposalTypeType): ProposalTypePolicy {
  return PROPOSAL_TYPE_POLICIES[type];
}

export function isProposalType(value: unknown): value is ProposalTypeType {
  return typeof value === "string" && ProposalType.options.includes(value as ProposalTypeType);
}

export function requireProposalType(value: unknown, contextLabel: string): ProposalTypeType {
  if (!isProposalType(value)) {
    throw new Error(`${contextLabel} has unsupported proposal type "${String(value)}"`);
  }
  return value;
}

export function assertProposalTypeSemantics(
  type: ProposalTypeType,
  operation: ProposalOperationType,
  kind: MemoryObjectKindType | null,
  contextLabel: string,
): ProposalTypePolicy {
  const policy = getProposalTypePolicy(type);

  if (!policy.allowedOperations.includes(operation)) {
    throw new Error(`${contextLabel} uses incompatible operation "${operation}" for proposal type "${type}"`);
  }

  if (kind && policy.allowedKinds && !policy.allowedKinds.includes(kind)) {
    throw new Error(`${contextLabel} uses incompatible kind "${kind}" for proposal type "${type}"`);
  }

  return policy;
}

export function questionClassForProposalType(
  type: ProposalTypeType,
  kind: MemoryObjectKindType | null,
): QuestionClassType {
  const policy = getProposalTypePolicy(type);
  return policy.questionClass === "kind-sensitive"
    ? questionClassFromKind(kind)
    : policy.questionClass;
}

export function proposalTypeRequiresHumanApproval(type: ProposalTypeType): boolean {
  return getProposalTypePolicy(type).highRisk === true;
}
