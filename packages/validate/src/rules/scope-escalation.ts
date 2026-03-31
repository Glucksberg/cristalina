import { PrivacyScope, isScopeEscalation, newlyVisibleAudiences } from "@cristalina/types";
import type { Diagnostic } from "../diagnostics.js";
import { error } from "../diagnostics.js";
import type { ParsedStore } from "../store/reader.js";

const RULE = "scope-escalation";
const VALID_SCOPES = new Set(PrivacyScope.options);

/**
 * Detect automatic scope escalation patterns (SPEC.md §14.2).
 * A memory MUST NOT rise in privacy scope automatically.
 */
export function scopeEscalation(store: ParsedStore): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

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

      if (isScopeEscalation(oldScope, currentScope as PrivacyScope)) {
        const introducedAudiences = newlyVisibleAudiences(oldScope, currentScope as PrivacyScope);
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
