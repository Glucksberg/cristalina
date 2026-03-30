import { MemoryStatus } from "@cristalina/types";
import type { Diagnostic } from "../diagnostics.js";
import { error, warning } from "../diagnostics.js";
import type { ParsedStore } from "../store/reader.js";

const RULE = "status-consistency";
const VALID_STATUSES = new Set(MemoryStatus.options);

/** Validate status values and logical consistency. */
export function statusConsistency(store: ParsedStore): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const obj of store.coreObjects) {
    const id = typeof obj.data.id === "string" ? obj.data.id : undefined;
    const status = obj.data.status;

    if (status === undefined) continue;

    // Check valid enum value
    if (typeof status !== "string" || !VALID_STATUSES.has(status as typeof MemoryStatus._type)) {
      diagnostics.push(
        error(`${RULE}/invalid`, `Invalid memory status: "${status}"`, {
          file: obj.file,
          objectId: id,
        }),
      );
      continue;
    }

    const confidence = obj.data.confidence;

    // Crystallized memories MUST have high confidence (SPEC.md §10.4)
    if (status === "crystallized" && typeof confidence === "number" && confidence < 0.95) {
      diagnostics.push(
        error(
          `${RULE}/crystallized-low-confidence`,
          `Crystallized memory has confidence ${confidence}, expected >= 0.95`,
          { file: obj.file, objectId: id },
        ),
      );
    }

    // Deprecated memories SHOULD have superseded_by
    if (status === "deprecated") {
      const supersededBy = obj.data.superseded_by;
      if (!Array.isArray(supersededBy) || supersededBy.length === 0) {
        diagnostics.push(
          warning(
            `${RULE}/deprecated-no-successor`,
            "Deprecated memory has no superseded_by reference",
            { file: obj.file, objectId: id },
          ),
        );
      }
    }

    // Draft memories SHOULD NOT have high confidence
    if (status === "draft" && typeof confidence === "number" && confidence >= 0.80) {
      diagnostics.push(
        warning(
          `${RULE}/draft-high-confidence`,
          `Draft memory has unexpectedly high confidence: ${confidence}`,
          { file: obj.file, objectId: id },
        ),
      );
    }
  }

  return diagnostics;
}
