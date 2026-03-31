// Enums
export {
  PrivacyScope,
  MemoryStatus,
  ProposalStatus,
  EventKind,
  SourceType,
  AnswerType,
  ContradictionStatus,
  MemoryOperation,
  MemoryObjectKind,
  ProposalType,
  ProposalOperation,
  QuestionClass,
  RelationType,
  EntityKind,
  DerivedArtifactType,
  WritebackMode,
} from "./enums.js";

// ID patterns
export {
  ID_PREFIXES,
  EventId,
  ProposalId,
  FactId,
  RelationshipId,
  ValueId,
  IdentityTraitId,
  StyleRuleId,
  ContradictionId,
  DerivedArtifactId,
  EntityId,
  QuestionId,
  QuestionResponseId,
  CurationPacketId,
  CanonicalObjectId,
  AnyObjectId,
} from "./ids.js";

// Shared primitives
export {
  PrivacyScopeField,
  AudienceExceptions,
  SCOPE_ORDER,
  AUDIENCE_TO_VISIBLE_SCOPES,
  visibleScopesForAudience,
  visibleAudiencesForScope,
  canAudienceAccessScope,
  newlyVisibleAudiences,
  scopeLevel,
  isScopeEscalation,
} from "./shared/privacy-scope.js";
export {
  ReferenceKind,
  StableReferenceSchema,
  type StableReference,
} from "./shared/stable-reference.js";

export {
  Confidence,
  CONFIDENCE_RANGES,
  INITIAL_CONFIDENCE_RANGES,
} from "./shared/confidence.js";

export { ProvenanceFields } from "./shared/provenance.js";

export { TemporalFields } from "./shared/temporal.js";

// Object schemas
export { EventSchema, type Event } from "./objects/event.js";
export {
  ProposalSchema,
  ProposalTargetRefSchema,
  ProposalCandidatePayloadSchema,
  ProposalRiskSchema,
  ProposalProvenanceSchema,
  type Proposal,
  type ProposalTargetRef,
  type ProposalCandidatePayload,
  type ProposalRisk,
  type ProposalProvenance,
} from "./objects/proposal.js";
export { MemoryObjectSchema, type MemoryObject } from "./objects/memory-object.js";
export { RelationshipSchema, type Relationship } from "./objects/relationship.js";
export { ValueSchema, type Value } from "./objects/value.js";
export { IdentityTraitSchema, type IdentityTrait } from "./objects/identity-trait.js";
export { StyleRuleSchema, type StyleRule } from "./objects/style-rule.js";
export { ContradictionSchema, type Contradiction } from "./objects/contradiction.js";
export { QuestionSchema, type Question } from "./objects/question.js";
export { ResponseSchema, type Response } from "./objects/response.js";
export { DerivedArtifactSchema, type DerivedArtifact } from "./objects/derived-artifact.js";
export {
  AdapterWritebackFileRuleSchema,
  AdapterWritebackContractSchema,
  type AdapterWritebackFileRule,
  type AdapterWritebackContract,
} from "./objects/adapter-writeback-contract.js";
export {
  ProjectionManifestSchema,
  type ProjectionManifest,
} from "./objects/projection-manifest.js";
export {
  CurationPacketSchema,
  type CurationPacket,
  CurationResponsePacketSchema,
  type CurationResponsePacket,
} from "./objects/curation-packet.js";
export { ManifestSchema, type Manifest } from "./objects/manifest.js";
