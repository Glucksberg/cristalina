import type { ParsedObject } from "@cristalina/validate";
import type { MemoryObjectKind, PrivacyScope } from "@cristalina/types";
import {
  DEFAULT_AUDIENCE_POLICY,
  DEFAULT_PROJECTION_POLICY,
  canAudienceAccessScopeWithPolicy,
  type AudiencePolicyConfig,
  type ProjectionPolicy,
} from "../policy/runtime.js";

export interface ScoredObject {
  object: ParsedObject;
  score: number;
  tier: "hot" | "warm" | "cold";
}

/** Score a memory object for compiled context relevance */
export function scoreObject(
  obj: ParsedObject,
  now: string,
  policy: ProjectionPolicy = DEFAULT_PROJECTION_POLICY,
): number {
  let score = 0;
  const data = obj.data;

  // Status weight
  const status = data.status;
  if (status === "crystallized") score += 40;
  else if (status === "ratified") score += 30;
  else if (status === "candidate") score += 10;
  else if (status === "deprecated" || status === "archived") return 0;

  // Confidence weight
  const confidence = typeof data.confidence === "number" ? data.confidence : 0;
  score += Math.round(confidence * 20);

  // Kind weight (identity/values rank higher for HOT)
  const kind = data.kind;
  if (typeof kind === "string") {
    score += policy.kindWeights.get(kind as MemoryObjectKind) ?? 0;
  }

  // Evidence count
  const evidence = typeof data.evidence_count === "number" ? data.evidence_count : 0;
  score += Math.min(evidence * 2, 10);

  // Recency (bonus for recently confirmed)
  if (typeof data.last_confirmed_at === "string" && now) {
    const confirmed = new Date(data.last_confirmed_at).getTime();
    const current = new Date(now).getTime();
    const daysSince = (current - confirmed) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) score += 10;
    else if (daysSince < 30) score += 5;
  }

  return score;
}

/** Assign tier based on score and kind */
export function assignTier(
  obj: ParsedObject,
  score: number,
  policy: ProjectionPolicy = DEFAULT_PROJECTION_POLICY,
): "hot" | "warm" | "cold" {
  const kind = obj.data.kind;

  // Identity and values are always HOT
  if (typeof kind === "string" && policy.alwaysHotKinds.has(kind as MemoryObjectKind)) {
    return score > 20 ? "hot" : "warm";
  }

  // High score = HOT, medium = WARM, low = COLD
  if (score >= 50) return "hot";
  if (score >= 25) return "warm";
  return "cold";
}

/**
 * Filter objects by audience privacy scope.
 * Visibility is governed by an explicit audience matrix, not a linear scope ladder.
 */
export function filterByAudience(
  objects: ParsedObject[],
  audience: PrivacyScope,
  policy: AudiencePolicyConfig = DEFAULT_AUDIENCE_POLICY,
): ParsedObject[] {
  return objects.filter((obj) => {
    const scope = obj.data.privacy_scope;
    if (typeof scope !== "string") return false;
    return canAudienceAccessScopeWithPolicy(policy, audience, scope as PrivacyScope);
  });
}
