import { z } from "zod";
import { EntityKind, MemoryObjectKind } from "../enums.js";
import { CanonicalObjectId, EntityId } from "../ids.js";

export const ReferenceKind = z.union([EntityKind, MemoryObjectKind]);
export type ReferenceKind = z.infer<typeof ReferenceKind>;

export const StableReferenceSchema = z
  .object({
    entity_id: EntityId.optional(),
    object_id: CanonicalObjectId.optional(),
    kind: ReferenceKind.optional(),
    facet: z.string().min(1).optional(),
    label: z.string().min(1).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.entity_id !== undefined
      || value.object_id !== undefined
      || value.kind !== undefined
      || value.facet !== undefined
      || value.label !== undefined,
    "stable reference must include at least one stable locator",
  );

export type StableReference = z.infer<typeof StableReferenceSchema>;
