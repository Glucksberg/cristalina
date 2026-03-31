import type {
  MemoryOperation,
  PrivacyScope,
  SourceType,
  MemoryObjectKind,
  EntityId,
  ProposalType,
  ProposalOperation,
  ProposalTargetRef,
  ProposalCandidatePayload,
  ProposalRisk,
  ProposalProvenance,
} from "@cristalina/types";
import type { OperationAuthorityContext } from "./authority.js";

/** Describes a side effect to be applied to the store */
export type StoreEffect =
  | { type: "append-jsonl"; path: string; data: Record<string, unknown> }
  | { type: "write-yaml"; path: string; data: Record<string, unknown> }
  | { type: "append-yaml-item"; path: string; item: Record<string, unknown>; arrayKey?: string }
  | { type: "update-yaml-item"; path: string; id: string; patch: Record<string, unknown>; arrayKey?: string }
  | { type: "append-log"; path: string; line: string };

/** Audit entry written for every operation */
export interface AuditEntry {
  timestamp: string;
  operation: MemoryOperation;
  actor: string;
  targets: string[];
  produced: string[];
  provenance: string;
  effects_summary: string;
}

/** The result of executing an operation */
export interface OperationResult {
  operation: MemoryOperation;
  timestamp: string;
  actor: string;
  targets: string[];
  produced: string[];
  effects: StoreEffect[];
  auditEntry: AuditEntry;
}

/** Result of planning an operation (before applying effects) */
export interface PlanResult {
  effects: StoreEffect[];
  auditEntry: AuditEntry;
  produced: string[];
}

// --- Operation Inputs ---

export interface LogInput {
  op: "LOG";
  kind: string;
  summary: string;
  source_type: SourceType;
  privacy_scope: PrivacyScope;
  actor?: string;
  session_id?: string;
  project?: string;
  related_entities?: EntityId[];
  tags?: string[];
  details?: Record<string, unknown> | string | null;
}

export interface ProposeInput {
  op: "PROPOSE";
  type: ProposalType;
  operation: ProposalOperation;
  target_ref: ProposalTargetRef;
  candidate_payload: ProposalCandidatePayload;
  reason: string;
  provenance: ProposalProvenance;
  confidence: number;
  privacy_scope: PrivacyScope;
  actor?: string;
  policy_tags?: string[];
  risk?: ProposalRisk;
}

export interface CreateInput {
  op: "CREATE";
  kind: MemoryObjectKind;
  statement: string;
  source_type: SourceType;
  source_ref: string;
  confirmedBy: string;
  confidence: number;
  privacy_scope: PrivacyScope;
  tags?: string[];
  related_entities?: EntityId[];
  notes?: string;
  authority?: OperationAuthorityContext;
  authorized?: boolean;
}

export interface ConfirmInput {
  op: "CONFIRM";
  targetId: string;
  confirmedBy: string;
  newConfidence?: number;
  authority?: OperationAuthorityContext;
  authorized?: boolean;
}

export interface ReviseInput {
  op: "REVISE";
  targetId: string;
  newStatement: string;
  reason: string;
  source_type: SourceType;
  source_ref: string;
  confirmedBy: string;
  authority?: OperationAuthorityContext;
  authorized?: boolean;
}

export interface ExtendInput {
  op: "EXTEND";
  targetId: string;
  additionalEvidence: string[];
  newConfidence?: number;
}

export interface ContradictInput {
  op: "CONTRADICT";
  leftId: string;
  rightId: string;
  reason: string;
  priority?: "low" | "medium" | "high" | "critical";
}

export interface SupersedeInput {
  op: "SUPERSEDE";
  oldId: string;
  newStatement: string;
  newKind?: MemoryObjectKind;
  source_type: SourceType;
  source_ref: string;
  confirmedBy: string;
  confidence: number;
  privacy_scope: PrivacyScope;
  authority?: OperationAuthorityContext;
  authorized?: boolean;
}

export interface DeprecateInput {
  op: "DEPRECATE";
  targetId: string;
  reason: string;
  supersededBy?: string;
  authority?: OperationAuthorityContext;
  authorized?: boolean;
}

export interface CrystallizeInput {
  op: "CRYSTALLIZE";
  targetId: string;
  authority?: OperationAuthorityContext;
  authorized?: boolean;
}

export interface ArchiveInput {
  op: "ARCHIVE";
  targetId: string;
  reason?: string;
}

export type OperationInput =
  | LogInput
  | ProposeInput
  | CreateInput
  | ConfirmInput
  | ReviseInput
  | ExtendInput
  | ContradictInput
  | SupersedeInput
  | DeprecateInput
  | CrystallizeInput
  | ArchiveInput;
