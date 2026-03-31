import {
  EventSchema,
  ProposalSchema,
  CurationPacketSchema,
  MemoryObjectSchema,
  RelationshipSchema,
  ValueSchema,
  IdentityTraitSchema,
  StyleRuleSchema,
  ContradictionSchema,
} from "@cristalina/types";
import type { Diagnostic } from "../diagnostics.js";
import { error } from "../diagnostics.js";
import type { ParsedStore, ParsedObject } from "../store/reader.js";

const RULE = "schema-conformance";

type ZodSchema = { safeParse: (data: unknown) => { success: boolean; error?: { issues: Array<{ message: string; path: (string | number)[] }> } } };

/** Map object kind to its specialized schema. Falls back to MemoryObjectSchema. */
function schemaForKind(kind: unknown): { schema: ZodSchema; name: string } {
  switch (kind) {
    case "relationship":
      return { schema: RelationshipSchema, name: "relationship" };
    case "value":
    case "priority":
      return { schema: ValueSchema, name: "value" };
    case "identity_trait":
      return { schema: IdentityTraitSchema, name: "identity-trait" };
    case "style_rule":
      return { schema: StyleRuleSchema, name: "style-rule" };
    default:
      return { schema: MemoryObjectSchema, name: "memory-object" };
  }
}

/** Validate every parsed object against its corresponding Zod schema. */
export function schemaConformance(store: ParsedStore): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Validate events
  for (const obj of store.events) {
    validateObject(obj, EventSchema, "event", diagnostics);
  }

  // Validate proposals
  for (const obj of store.proposals) {
    validateObject(obj, ProposalSchema, "proposal", diagnostics);
  }

  // Validate curation packets
  for (const obj of store.curationPackets) {
    validateObject(obj, CurationPacketSchema, "curation-packet", diagnostics);
  }

  // Validate core memory objects — dispatch to specialized schema by kind
  for (const obj of store.coreObjects) {
    const hasId = typeof obj.data.id === "string";
    const hasStatement = typeof obj.data.statement === "string";
    const hasLegacyRelationFields = typeof obj.data.from === "string" && typeof obj.data.relation === "string";
    const hasStableRelationFields = typeof obj.data.from_ref === "object"
      && obj.data.from_ref !== null
      && typeof obj.data.relation === "string";

    if (hasId && (hasStatement || hasLegacyRelationFields || hasStableRelationFields)) {
      const { schema, name } = schemaForKind(obj.data.kind);
      validateObject(obj, schema, name, diagnostics);
    }
  }

  // Validate contradictions
  for (const obj of store.contradictions) {
    validateObject(obj, ContradictionSchema, "contradiction", diagnostics);
  }

  return diagnostics;
}

function validateObject(
  obj: ParsedObject,
  schema: ZodSchema,
  schemaName: string,
  diagnostics: Diagnostic[],
): void {
  const result = schema.safeParse(obj.data);
  if (!result.success && result.error) {
    for (const issue of result.error.issues) {
      const pathStr = obj.index !== undefined
        ? `[${obj.index}].${issue.path.join(".")}`
        : issue.path.join(".");
      diagnostics.push(
        error(`${RULE}/${schemaName}`, issue.message, {
          file: obj.file,
          path: pathStr,
          objectId: objectIdentifier(obj.data),
        }),
      );
    }
  }
}

function objectIdentifier(data: Record<string, unknown>): string | undefined {
  if (typeof data.id === "string") return data.id;
  if (typeof data.packet_id === "string") return data.packet_id;
  return undefined;
}
