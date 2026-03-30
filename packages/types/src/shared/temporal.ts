import { z } from "zod";

// Temporal and supersession fields (DATA-MODEL.md §3.5, §6)
export const TemporalFields = z.object({
  valid_from: z.string().optional(),
  valid_to: z.string().nullable().optional(),
  supersedes: z.array(z.string()).optional(),
  superseded_by: z.array(z.string()).optional(),
});
export type TemporalFields = z.infer<typeof TemporalFields>;
