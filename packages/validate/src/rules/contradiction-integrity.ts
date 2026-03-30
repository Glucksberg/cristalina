import type { Diagnostic } from "../diagnostics.js";
import { error, warning } from "../diagnostics.js";
import type { ParsedStore } from "../store/reader.js";

const RULE = "contradiction-integrity";

/** Validate contradiction objects: both sides must exist, status must be coherent. */
export function contradictionIntegrity(store: ParsedStore): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Build ID -> status map from core objects
  const objectStatus = new Map<string, string>();
  for (const obj of store.coreObjects) {
    if (typeof obj.data.id === "string" && typeof obj.data.status === "string") {
      objectStatus.set(obj.data.id, obj.data.status);
    }
  }

  for (const ctr of store.contradictions) {
    const id = typeof ctr.data.id === "string" ? ctr.data.id : undefined;
    const left = ctr.data.left;
    const right = ctr.data.right;
    const status = ctr.data.status;

    // Both sides MUST reference existing objects
    if (typeof left !== "string") {
      diagnostics.push(
        error(`${RULE}/missing-left`, "Contradiction missing 'left' reference", {
          file: ctr.file,
          objectId: id,
        }),
      );
    } else if (!objectStatus.has(left)) {
      diagnostics.push(
        error(`${RULE}/orphan-left`, `Left reference "${left}" does not exist in the store`, {
          file: ctr.file,
          objectId: id,
        }),
      );
    }

    if (typeof right !== "string") {
      diagnostics.push(
        error(`${RULE}/missing-right`, "Contradiction missing 'right' reference", {
          file: ctr.file,
          objectId: id,
        }),
      );
    } else if (!objectStatus.has(right)) {
      diagnostics.push(
        error(`${RULE}/orphan-right`, `Right reference "${right}" does not exist in the store`, {
          file: ctr.file,
          objectId: id,
        }),
      );
    }

    // If contradiction is still open but one side is deprecated/archived, warn
    if (status === "open" || status === "queued") {
      if (typeof left === "string" && typeof right === "string") {
        const leftStatus = objectStatus.get(left);
        const rightStatus = objectStatus.get(right);

        if (leftStatus === "deprecated" || leftStatus === "archived") {
          diagnostics.push(
            warning(
              `${RULE}/stale`,
              `Open contradiction but left side "${left}" is ${leftStatus}`,
              { file: ctr.file, objectId: id },
            ),
          );
        }
        if (rightStatus === "deprecated" || rightStatus === "archived") {
          diagnostics.push(
            warning(
              `${RULE}/stale`,
              `Open contradiction but right side "${right}" is ${rightStatus}`,
              { file: ctr.file, objectId: id },
            ),
          );
        }
      }
    }
  }

  return diagnostics;
}
