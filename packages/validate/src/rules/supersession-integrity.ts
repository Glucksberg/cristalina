import type { Diagnostic } from "../diagnostics.js";
import { error, warning } from "../diagnostics.js";
import type { ParsedStore } from "../store/reader.js";

const RULE = "supersession-integrity";

/** Validate supersession chains: bidirectional references, no orphans. */
export function supersessionIntegrity(store: ParsedStore): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Build ID -> object map
  const objectMap = new Map<string, { file: string; data: Record<string, unknown> }>();
  for (const obj of store.coreObjects) {
    if (typeof obj.data.id === "string") {
      objectMap.set(obj.data.id, obj);
    }
  }

  for (const obj of store.coreObjects) {
    const id = typeof obj.data.id === "string" ? obj.data.id : undefined;

    // Check supersedes references
    const supersedes = obj.data.supersedes;
    if (Array.isArray(supersedes)) {
      for (const oldId of supersedes) {
        if (typeof oldId !== "string") continue;

        // Referenced object must exist
        const oldObj = objectMap.get(oldId);
        if (!oldObj) {
          diagnostics.push(
            error(`${RULE}/missing-target`, `Supersedes reference to non-existent object: "${oldId}"`, {
              file: obj.file,
              objectId: id,
            }),
          );
          continue;
        }

        // Bidirectional check: the old object SHOULD reference back
        const oldSupersededBy = oldObj.data.superseded_by;
        if (Array.isArray(oldSupersededBy)) {
          if (id && !oldSupersededBy.includes(id)) {
            diagnostics.push(
              warning(
                `${RULE}/missing-backref`,
                `"${oldId}" does not list "${id}" in superseded_by`,
                { file: oldObj.file, objectId: oldId },
              ),
            );
          }
        } else {
          diagnostics.push(
            warning(
              `${RULE}/missing-backref`,
              `"${oldId}" has no superseded_by field but is superseded by "${id}"`,
              { file: oldObj.file, objectId: oldId },
            ),
          );
        }
      }
    }

    // Check superseded_by references
    const supersededBy = obj.data.superseded_by;
    if (Array.isArray(supersededBy)) {
      for (const newId of supersededBy) {
        if (typeof newId !== "string") continue;

        const newObj = objectMap.get(newId);
        if (!newObj) {
          diagnostics.push(
            error(`${RULE}/missing-target`, `Superseded_by reference to non-existent object: "${newId}"`, {
              file: obj.file,
              objectId: id,
            }),
          );
        }
      }
    }
  }

  return diagnostics;
}
