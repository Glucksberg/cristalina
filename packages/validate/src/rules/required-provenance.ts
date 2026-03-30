import type { Diagnostic } from "../diagnostics.js";
import { error } from "../diagnostics.js";
import type { ParsedStore } from "../store/reader.js";

const RULE = "required-provenance";

// Required provenance fields for canonical memory (SPEC.md §15)
const REQUIRED_FIELDS = [
  "source_type",
  "source_ref",
  "created_at",
  "last_confirmed_at",
  "confirmed_by",
  "evidence_count",
  "confidence",
  "privacy_scope",
] as const;

/** Validate that every canonical memory object includes all required provenance fields. */
export function requiredProvenance(store: ParsedStore): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const obj of store.coreObjects) {
    // Only check objects that look like canonical memory (have id + statement)
    if (typeof obj.data.statement !== "string") continue;

    const id = typeof obj.data.id === "string" ? obj.data.id : undefined;

    for (const field of REQUIRED_FIELDS) {
      if (!(field in obj.data)) {
        diagnostics.push(
          error(`${RULE}/missing`, `Missing required provenance field: ${field}`, {
            file: obj.file,
            path: field,
            objectId: id,
          }),
        );
      }
    }
  }

  return diagnostics;
}
