import { z } from "zod";
import { PrivacyScope } from "../enums.js";

// Privacy scope field - mandatory on every memory object (SPEC.md §14.1)
export const PrivacyScopeField = z.object({
  privacy_scope: PrivacyScope,
});

// Optional audience exceptions for scope overrides
export const AudienceExceptions = z.object({
  audience_exceptions: z.array(z.string()).optional(),
});

// Legacy declaration order only. Audience access is matrix-based.
export const SCOPE_ORDER: readonly PrivacyScope[] = [
  "owner_private",
  "agent_operational",
  "project_private",
  "shareable",
  "public_safe",
] as const;

export const AUDIENCE_TO_VISIBLE_SCOPES: Record<PrivacyScope, readonly PrivacyScope[]> = {
  owner_private: ["owner_private", "agent_operational", "project_private", "shareable", "public_safe"],
  agent_operational: ["agent_operational", "shareable", "public_safe"],
  project_private: ["project_private", "shareable", "public_safe"],
  shareable: ["shareable", "public_safe"],
  public_safe: ["public_safe"],
} as const;

export function visibleScopesForAudience(audience: PrivacyScope): readonly PrivacyScope[] {
  return AUDIENCE_TO_VISIBLE_SCOPES[audience];
}

export function canAudienceAccessScope(audience: PrivacyScope, scope: PrivacyScope): boolean {
  return AUDIENCE_TO_VISIBLE_SCOPES[audience].includes(scope);
}

export function visibleAudiencesForScope(scope: PrivacyScope): PrivacyScope[] {
  return PrivacyScope.options.filter((audience) => canAudienceAccessScope(audience, scope));
}

export function newlyVisibleAudiences(from: PrivacyScope, to: PrivacyScope): PrivacyScope[] {
  const fromAudiences = new Set(visibleAudiencesForScope(from));
  return visibleAudiencesForScope(to).filter((audience) => !fromAudiences.has(audience));
}

export function scopeLevel(scope: PrivacyScope): number {
  return SCOPE_ORDER.indexOf(scope);
}

export function isScopeEscalation(from: PrivacyScope, to: PrivacyScope): boolean {
  return newlyVisibleAudiences(from, to).length > 0;
}
