import type { ParsedObject } from "@cristalina/validate";
import { scopeLevel, type PrivacyScope } from "@cristalina/types";

export interface ScoredObject {
  object: ParsedObject;
  score: number;
  tier: "hot" | "warm" | "cold";
}

/** Score a memory object for compiled context relevance */
export function scoreObject(obj: ParsedObject, now: string): number {
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
  if (kind === "identity_trait" || kind === "value" || kind === "priority") score += 15;
  else if (kind === "style_rule" || kind === "preference") score += 10;
  else if (kind === "constraint") score += 8;

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
export function assignTier(obj: ParsedObject, score: number): "hot" | "warm" | "cold" {
  const kind = obj.data.kind;

  // Identity and values are always HOT
  if (kind === "identity_trait" || kind === "value" || kind === "priority" || kind === "style_rule") {
    return score > 20 ? "hot" : "warm";
  }

  // High score = HOT, medium = WARM, low = COLD
  if (score >= 50) return "hot";
  if (score >= 25) return "warm";
  return "cold";
}

/**
 * Filter objects by audience privacy scope.
 * An object is visible if its scope is at least as public as the audience.
 * owner_private(0) audience sees everything; public_safe(4) only sees public_safe.
 */
export function filterByAudience(objects: ParsedObject[], audience: PrivacyScope): ParsedObject[] {
  const audienceLevel = scopeLevel(audience);
  return objects.filter((obj) => {
    const scope = obj.data.privacy_scope;
    if (typeof scope !== "string") return false;
    return scopeLevel(scope as PrivacyScope) >= audienceLevel;
  });
}
