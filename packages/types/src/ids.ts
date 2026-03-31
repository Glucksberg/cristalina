import { z } from "zod";

// ID prefix patterns (DATA-MODEL.md §11)
// Each object type uses a readable prefix for its IDs.

export const ID_PREFIXES = {
  event: "evt-",
  proposal: "prop-",
  fact: "fact-",
  relationship: "rel-",
  value: "val-",
  identityTrait: "idt-",
  styleRule: "sty-",
  contradiction: "ctr-",
  derivedArtifact: "drv-",
  entity: "ent-",
  question: "q-",
  questionResponse: "qr-",
  curationPacket: "dcp-",
} as const;

// Zod string refinements for typed IDs

export const EventId = z.string().regex(/^evt-/, "Event ID must start with 'evt-'");
export type EventId = z.infer<typeof EventId>;

export const ProposalId = z.string().regex(/^prop-/, "Proposal ID must start with 'prop-'");
export type ProposalId = z.infer<typeof ProposalId>;

export const FactId = z.string().regex(/^fact-/, "Fact ID must start with 'fact-'");
export type FactId = z.infer<typeof FactId>;

export const RelationshipId = z.string().regex(/^rel-/, "Relationship ID must start with 'rel-'");
export type RelationshipId = z.infer<typeof RelationshipId>;

export const ValueId = z.string().regex(/^val-/, "Value ID must start with 'val-'");
export type ValueId = z.infer<typeof ValueId>;

export const IdentityTraitId = z.string().regex(/^idt-/, "Identity trait ID must start with 'idt-'");
export type IdentityTraitId = z.infer<typeof IdentityTraitId>;

export const StyleRuleId = z.string().regex(/^sty-/, "Style rule ID must start with 'sty-'");
export type StyleRuleId = z.infer<typeof StyleRuleId>;

export const ContradictionId = z.string().regex(/^ctr-/, "Contradiction ID must start with 'ctr-'");
export type ContradictionId = z.infer<typeof ContradictionId>;

export const DerivedArtifactId = z.string().regex(/^drv-/, "Derived artifact ID must start with 'drv-'");
export type DerivedArtifactId = z.infer<typeof DerivedArtifactId>;

export const EntityId = z.string().regex(/^ent-/, "Entity ID must start with 'ent-'");
export type EntityId = z.infer<typeof EntityId>;

export const QuestionId = z.string().regex(/^q-(?!r)/, "Question ID must start with 'q-' (not 'qr-')");
export type QuestionId = z.infer<typeof QuestionId>;

export const QuestionResponseId = z.string().regex(/^qr-/, "Question response ID must start with 'qr-'");
export type QuestionResponseId = z.infer<typeof QuestionResponseId>;

export const CurationPacketId = z.string().regex(/^dcp-/, "Curation packet ID must start with 'dcp-'");
export type CurationPacketId = z.infer<typeof CurationPacketId>;

// Canonical memory object IDs only
export const CanonicalObjectId = z.union([
  FactId,
  RelationshipId,
  ValueId,
  IdentityTraitId,
  StyleRuleId,
]);
export type CanonicalObjectId = z.infer<typeof CanonicalObjectId>;

// Generic memory object ID (any valid prefix)
const ALL_PREFIXES = Object.values(ID_PREFIXES);
export const AnyObjectId = z.string().refine(
  (val) => ALL_PREFIXES.some((prefix) => val.startsWith(prefix)),
  { message: `ID must start with one of: ${ALL_PREFIXES.join(", ")}` },
);
export type AnyObjectId = z.infer<typeof AnyObjectId>;
