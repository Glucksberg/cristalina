import { INITIAL_CONFIDENCE_RANGES } from "@cristalina/types";
import type { Diagnostic } from "../diagnostics.js";
import { error, warning } from "../diagnostics.js";
import type { ParsedStore, ParsedObject } from "../store/reader.js";

const RULE = "confidence-range";

/** Validate confidence values on canonical memory objects and proposals. */
export function confidenceRange(store: ParsedStore): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const obj of [...store.proposals, ...store.coreObjects]) {
    const id = typeof obj.data.id === "string" ? obj.data.id : undefined;
    const confidence = obj.data.confidence;

    const isCanonicalMemory = typeof obj.data.statement === "string";
    const isProposal = typeof obj.data.operation === "string";

    if (confidence === undefined || confidence === null) {
      if (isCanonicalMemory || isProposal) {
        diagnostics.push(
          error(`${RULE}/missing`, "Object missing confidence", {
            file: obj.file,
            objectId: id,
          }),
        );
      }
      continue;
    }

    if (typeof confidence !== "number") {
      diagnostics.push(
        error(`${RULE}/type`, `Confidence must be a number, got ${typeof confidence}`, {
          file: obj.file,
          objectId: id,
        }),
      );
      continue;
    }

    // MUST be 0.00–1.00
    if (confidence < 0 || confidence > 1) {
      diagnostics.push(
        error(`${RULE}/bounds`, `Confidence ${confidence} is outside valid range [0, 1]`, {
          file: obj.file,
          objectId: id,
        }),
      );
      continue;
    }

    // Advisory: only canonical memory currently carries source_type.
    const sourceType = obj.data.source_type;
    if (typeof sourceType === "string" && sourceType in INITIAL_CONFIDENCE_RANGES) {
      const range = INITIAL_CONFIDENCE_RANGES[sourceType as keyof typeof INITIAL_CONFIDENCE_RANGES];
      if (confidence > range.max + 0.15) {
        diagnostics.push(
          warning(
            `${RULE}/high-for-source`,
            `Confidence ${confidence} seems high for source_type "${sourceType}" (expected ${range.min}–${range.max})`,
            { file: obj.file, objectId: id },
          ),
        );
      }
    }
  }

  return diagnostics;
}
