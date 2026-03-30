import { z } from "zod";
import { PrivacyScope } from "../enums.js";

// Privacy scope field — mandatory on every memory object (SPEC.md §14.1)
export const PrivacyScopeField = z.object({
  privacy_scope: PrivacyScope,
});

// Optional audience exceptions for scope overrides
export const AudienceExceptions = z.object({
  audience_exceptions: z.array(z.string()).optional(),
});

// Ordered scope levels for escalation detection (least → most visible)
export const SCOPE_ORDER: readonly PrivacyScope[] = [
  "owner_private",
  "agent_operational",
  "project_private",
  "shareable",
  "public_safe",
] as const;

export function scopeLevel(scope: PrivacyScope): number {
  return SCOPE_ORDER.indexOf(scope);
}

export function isScopeEscalation(from: PrivacyScope, to: PrivacyScope): boolean {
  return scopeLevel(to) > scopeLevel(from);
}
