import { z } from "zod";

// Confidence is a float from 0.00 to 1.00 (DATA-MODEL.md §5)
export const Confidence = z.number().min(0).max(1);
export type Confidence = z.infer<typeof Confidence>;

// Interpretation ranges (SPEC.md §10, DATA-MODEL.md §5)
export const CONFIDENCE_RANGES = {
  weak: { min: 0.0, max: 0.29 },
  tentative: { min: 0.3, max: 0.59 },
  fairly_strong: { min: 0.6, max: 0.79 },
  human_confirmed: { min: 0.8, max: 0.94 },
  crystallization_candidate: { min: 0.95, max: 1.0 },
} as const;

// Recommended initial ranges by source type (SPEC.md §10.1)
export const INITIAL_CONFIDENCE_RANGES = {
  agent_inference: { min: 0.3, max: 0.6 },
  agent_synthesis: { min: 0.55, max: 0.75 },
  human_reply: { min: 0.8, max: 0.95 },
  human_message: { min: 0.8, max: 0.95 },
} as const;
