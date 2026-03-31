import type { Diagnostic } from "../diagnostics.js";
import { warning } from "../diagnostics.js";
import type { ParsedStore } from "../store/reader.js";

const RULE = "stable-references";

export function stableReferences(store: ParsedStore): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const obj of store.coreObjects) {
    if (obj.data.kind !== "relationship") continue;

    const hasFromRef = typeof obj.data.from_ref === "object" && obj.data.from_ref !== null;
    const hasToRef = typeof obj.data.to_ref === "object" && obj.data.to_ref !== null;
    const hasLegacyFrom = typeof obj.data.from === "string";
    const hasLegacyTo = typeof obj.data.to === "string";

    if (!hasFromRef && hasLegacyFrom) {
      diagnostics.push(
        warning(RULE, "Relationship still relies on legacy textual from endpoint; add from_ref.", {
          file: obj.file,
          objectId: typeof obj.data.id === "string" ? obj.data.id : undefined,
          path: "from_ref",
        }),
      );
    }

    if (!hasToRef && hasLegacyTo) {
      diagnostics.push(
        warning(RULE, "Relationship still relies on legacy textual to endpoint; add to_ref.", {
          file: obj.file,
          objectId: typeof obj.data.id === "string" ? obj.data.id : undefined,
          path: "to_ref",
        }),
      );
    }
  }

  return diagnostics;
}
