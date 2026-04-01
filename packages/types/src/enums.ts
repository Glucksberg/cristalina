import { z } from "zod";

// --- Privacy Scope (SPEC.md §14.1) ---

export const PrivacyScope = z.enum([
  "owner_private",
  "agent_operational",
  "project_private",
  "shareable",
  "public_safe",
]);
export type PrivacyScope = z.infer<typeof PrivacyScope>;

// --- Memory Status (SPEC.md §9) ---

export const MemoryStatus = z.enum([
  "draft",
  "candidate",
  "ratified",
  "crystallized",
  "deprecated",
  "archived",
  "disputed",
]);
export type MemoryStatus = z.infer<typeof MemoryStatus>;

// --- Proposal Status (DATA-MODEL.md §2.2) ---

export const ProposalStatus = z.enum([
  "pending",
  "queued_for_curation",
  "approved",
  "rejected",
  "deferred",
  "applied",
  "expired",
]);
export type ProposalStatus = z.infer<typeof ProposalStatus>;

// --- Event Kind (DATA-MODEL.md §2.1) ---

export const EventKind = z.enum([
  "heartbeat",
  "interaction",
  "observation",
  "inference",
  "runtime_drift",
  "contradiction_detected",
  "proposal_generated",
  "compilation",
  "validation_failure",
  "ratification_applied",
  "other",
]);
export type EventKind = z.infer<typeof EventKind>;

// --- Source Type (SPEC.md §15) ---

export const SourceType = z.enum([
  "human_reply",
  "human_message",
  "agent_inference",
  "agent_synthesis",
  "runtime_observation",
  "external_source",
  "imported",
]);
export type SourceType = z.infer<typeof SourceType>;

// --- Answer Type (CURATION-PROTOCOL.md §7) ---

export const AnswerType = z.enum([
  "accept",
  "reject",
  "edit",
  "defer",
  "uncertain",
]);
export type AnswerType = z.infer<typeof AnswerType>;

// --- Contradiction Status (DATA-MODEL.md §7) ---

export const ContradictionStatus = z.enum([
  "open",
  "queued",
  "resolved",
  "dismissed",
]);
export type ContradictionStatus = z.infer<typeof ContradictionStatus>;

// --- Memory Operation (SPEC.md §11) ---

export const MemoryOperation = z.enum([
  "LOG",
  "PROPOSE",
  "CREATE",
  "CONFIRM",
  "REVISE",
  "EXTEND",
  "CONTRADICT",
  "SUPERSEDE",
  "DEPRECATE",
  "CRYSTALLIZE",
  "ARCHIVE",
]);
export type MemoryOperation = z.infer<typeof MemoryOperation>;

// --- Memory Object Kind (DATA-MODEL.md §2.3) ---

export const MemoryObjectKind = z.enum([
  "fact",
  "preference",
  "constraint",
  "project",
  "relationship",
  "belief",
  "identity_trait",
  "style_rule",
  "value",
  "priority",
]);
export type MemoryObjectKind = z.infer<typeof MemoryObjectKind>;

// --- Proposal Type (DATA-MODEL.md §2.2) ---

export const ProposalType = z.enum([
  "new_fact",
  "revise_fact",
  "revise_preference",
  "new_value",
  "revise_value",
  "identity_adjustment",
  "privacy_change",
  "supersede_memory",
  "deprecate_memory",
  "open_contradiction",
]);
export type ProposalType = z.infer<typeof ProposalType>;

// --- Proposal Operation (ARCHITECTURE-V2.md §5-6) ---

export const ProposalOperation = z.enum([
  "create",
  "confirm",
  "revise",
  "supersede",
  "deprecate",
  "contradict",
]);
export type ProposalOperation = z.infer<typeof ProposalOperation>;

// --- Question Class (CURATION-PROTOCOL.md §5) ---

export const QuestionClass = z.enum([
  "factual_correction",
  "value_arbitration",
  "identity_style_calibration",
  "contradiction_resolution",
  "privacy_clarification",
]);
export type QuestionClass = z.infer<typeof QuestionClass>;

// --- Relation Type (DATA-MODEL.md §2.4) ---

export const RelationType = z.enum([
  "prefers",
  "works_on",
  "trusts",
  "avoids",
  "owns",
  "depends_on",
  "contradicts",
  "supersedes",
  "belongs_to",
  "cares_about",
]);
export type RelationType = z.infer<typeof RelationType>;

// --- Entity Kind (ARCHITECTURE-V2.md §4.2) ---

export const EntityKind = z.enum([
  "owner",
  "agent",
  "project",
  "runtime",
  "channel",
  "person",
  "organization",
]);
export type EntityKind = z.infer<typeof EntityKind>;

// --- Entity Status ---

export const EntityStatus = z.enum([
  "active",
  "deprecated",
  "archived",
]);
export type EntityStatus = z.infer<typeof EntityStatus>;

// --- Policy Kind ---

export const PolicyKind = z.enum([
  "audience_policy",
  "promotion_policy",
  "authority_policy",
  "projection_policy",
]);
export type PolicyKind = z.infer<typeof PolicyKind>;

// --- Derived Artifact Type (OPENCLAW-ADAPTER.md §9-11) ---

export const DerivedArtifactType = z.enum([
  "compiled_hot",
  "compiled_warm",
  "compiled_cold",
  "bootstrap_soul",
  "bootstrap_value",
  "bootstrap_user",
  "bootstrap_memory",
]);
export type DerivedArtifactType = z.infer<typeof DerivedArtifactType>;

// --- Writeback Mode (OPENCLAW-ADAPTER.md §8) ---

export const WritebackMode = z.enum([
  "none",
  "proposal_extraction",
  "deterministic_sync",
]);
export type WritebackMode = z.infer<typeof WritebackMode>;

// --- Projection Profile (OPENCLAW-ADAPTER.md §13) ---

export const ProjectionProfile = z.enum([
  "tiny",
  "standard",
  "deep",
]);
export type ProjectionProfile = z.infer<typeof ProjectionProfile>;
