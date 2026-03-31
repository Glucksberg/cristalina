import { PrivacyScope } from "@cristalina/types";
import type { Diagnostic } from "../diagnostics.js";
import { error } from "../diagnostics.js";
import type { ParsedStore, ParsedObject } from "../store/reader.js";

const RULE = "privacy-scope";
const VALID_SCOPES = new Set(PrivacyScope.options);

/**
 * Validate privacy scope presence and validity on every object.
 * Scope escalation detection is handled by the scope-escalation rule.
 */
export function privacyScope(store: ParsedStore): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  const allObjects: ParsedObject[] = [
    ...store.events,
    ...store.proposals,
    ...store.coreObjects,
    ...store.contradictions,
  ];

  for (const obj of allObjects) {
    const scope = obj.data.privacy_scope;
    const id = typeof obj.data.id === "string" ? obj.data.id : undefined;

    if (scope === undefined || scope === null) {
      diagnostics.push(
        error(`${RULE}/missing`, "Missing required privacy_scope field", {
          file: obj.file,
          objectId: id,
        }),
      );
      continue;
    }

    if (typeof scope !== "string" || !VALID_SCOPES.has(scope as PrivacyScope)) {
      diagnostics.push(
        error(`${RULE}/invalid`, `Invalid privacy_scope: "${scope}"`, {
          file: obj.file,
          objectId: id,
        }),
      );
    }
  }

  return diagnostics;
}
