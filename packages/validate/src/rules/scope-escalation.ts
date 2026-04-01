import { PrivacyScope, type AudiencePolicy } from "@cristalina/types";
import type { Diagnostic } from "../diagnostics.js";
import { error } from "../diagnostics.js";
import type { ParsedStore } from "../store/reader.js";

const RULE = "scope-escalation";
const VALID_SCOPES = new Set(PrivacyScope.options);

function resolveAudienceMatrix(store: ParsedStore): Record<PrivacyScope, readonly PrivacyScope[]> {
  const policy = store.policyObjects.find((obj) => obj.data.kind === "audience_policy");
  if (!policy) {
    return {
      owner_private: ["owner_private", "agent_operational", "project_private", "shareable", "public_safe"],
      agent_operational: ["agent_operational", "shareable", "public_safe"],
      project_private: ["project_private", "shareable", "public_safe"],
      shareable: ["shareable", "public_safe"],
      public_safe: ["public_safe"],
    };
  }

  const audiences = (policy.data as AudiencePolicy).audiences;
  return {
    owner_private: audiences.owner_private.can_view,
    agent_operational: audiences.agent_operational.can_view,
    project_private: audiences.project_private.can_view,
    shareable: audiences.shareable.can_view,
    public_safe: audiences.public_safe.can_view,
  };
}

function newlyVisibleAudiences(
  matrix: Record<PrivacyScope, readonly PrivacyScope[]>,
  from: PrivacyScope,
  to: PrivacyScope,
): PrivacyScope[] {
  const visibleAudiencesForScope = (scope: PrivacyScope) =>
    PrivacyScope.options.filter((audience) => matrix[audience].includes(scope));
  const fromAudiences = new Set(visibleAudiencesForScope(from));
  return visibleAudiencesForScope(to).filter((audience) => !fromAudiences.has(audience));
}

function isScopeEscalation(
  matrix: Record<PrivacyScope, readonly PrivacyScope[]>,
  from: PrivacyScope,
  to: PrivacyScope,
): boolean {
  return newlyVisibleAudiences(matrix, from, to).length > 0;
}

/**
 * Detect automatic scope escalation patterns (SPEC.md §14.2).
 * A memory MUST NOT rise in privacy scope automatically.
 */
export function scopeEscalation(store: ParsedStore): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const audienceMatrix = resolveAudienceMatrix(store);

  // Build ID -> scope map
  const scopeMap = new Map<string, PrivacyScope>();
  for (const obj of store.coreObjects) {
    const id = obj.data.id;
    const scope = obj.data.privacy_scope;
    if (typeof id === "string" && typeof scope === "string" && VALID_SCOPES.has(scope as PrivacyScope)) {
      scopeMap.set(id, scope as PrivacyScope);
    }
  }

  // Check all supersession chains for scope escalation
  for (const obj of store.coreObjects) {
    const id = typeof obj.data.id === "string" ? obj.data.id : undefined;
    const currentScope = obj.data.privacy_scope;
    const supersedes = obj.data.supersedes;

    if (!id || typeof currentScope !== "string" || !VALID_SCOPES.has(currentScope as PrivacyScope)) continue;
    if (!Array.isArray(supersedes)) continue;

    for (const oldId of supersedes) {
      if (typeof oldId !== "string") continue;
      const oldScope = scopeMap.get(oldId);
      if (!oldScope) continue;

      if (isScopeEscalation(audienceMatrix, oldScope, currentScope as PrivacyScope)) {
        const introducedAudiences = newlyVisibleAudiences(audienceMatrix, oldScope, currentScope as PrivacyScope);
        // Check if this was human-approved (source_type = human_reply or human_message)
        const sourceType = obj.data.source_type;
        if (sourceType !== "human_reply" && sourceType !== "human_message") {
          diagnostics.push(
            error(
              `${RULE}/automatic`,
              `Scope escalation from "${oldScope}" to "${currentScope}" exposes new audiences (${introducedAudiences.join(", ")}) without human approval (source: ${sourceType})`,
              { file: obj.file, objectId: id },
            ),
          );
        }
      }
    }
  }

  return diagnostics;
}
