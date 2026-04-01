import { z } from "zod";
import { EntityId } from "../ids.js";
import { EntityKind, EntityStatus, PrivacyScope } from "../enums.js";

export const EntitySchema = z
  .object({
    id: EntityId,
    kind: EntityKind,
    name: z.string().min(1),
    status: EntityStatus,
    privacy_scope: PrivacyScope,
    aliases: z.array(z.string().min(1)).optional(),
    description: z.string().min(1).optional(),
    channels: z.array(z.string().min(1)).optional(),
    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
  })
  .strict();

export type Entity = z.infer<typeof EntitySchema>;
