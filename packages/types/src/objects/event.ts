import { z } from "zod";
import { EventKind, SourceType, PrivacyScope } from "../enums.js";
import { EventId } from "../ids.js";

// Event — append-only raw record (DATA-MODEL.md §2.1)
// Events use .passthrough() because the spec allows arbitrary additional fields.

export const EventSchema = z
  .object({
    // Required fields
    id: EventId,
    kind: EventKind,
    ts: z.string().datetime(),
    summary: z.string().min(1),
    source_type: SourceType,
    privacy_scope: PrivacyScope,

    // Recommended fields
    actor: z.string().optional(),
    session_id: z.string().optional(),
    project: z.string().optional(),
    related_entities: z.array(z.string()).optional(),
    artifacts: z.array(z.string()).optional(),
    details: z
      .union([z.record(z.unknown()), z.array(z.unknown()), z.string(), z.null()])
      .optional(),
    tags: z.array(z.string()).optional(),
  })
  .passthrough();

export type Event = z.infer<typeof EventSchema>;
