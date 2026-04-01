import type { PolicyKind } from "@cristalina/types";
import type { Diagnostic } from "../diagnostics.js";
import { error } from "../diagnostics.js";
import type { ParsedObject, ParsedStore } from "../store/reader.js";

const RULE = "policy-selection";

function policyStatus(entry: ParsedObject["data"]): "active" | "draft" | "deprecated" {
  return entry.status === "draft" || entry.status === "deprecated" ? entry.status : "active";
}

function policyKinds(store: ParsedStore): PolicyKind[] {
  return ["audience_policy", "promotion_policy", "authority_policy", "projection_policy"]
    .filter((kind): kind is PolicyKind => store.policyObjects.some((entry) => entry.data.kind === kind));
}

export function policySelection(store: ParsedStore): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const kind of policyKinds(store)) {
    const entries = store.policyObjects.filter((entry) => entry.data.kind === kind);
    const active = entries.filter((entry) => policyStatus(entry.data) === "active");
    const nonDeprecated = entries.filter((entry) => policyStatus(entry.data) !== "deprecated");

    if (active.length > 1) {
      for (const entry of active) {
        diagnostics.push(error(
          `${RULE}/multiple-active`,
          `Policy kind "${kind}" has multiple active definitions. Exactly one active policy is allowed.`,
          {
            file: entry.file,
            objectId: typeof entry.data.id === "string" ? entry.data.id : undefined,
          },
        ));
      }
    }

    if (active.length === 0 && nonDeprecated.length > 1) {
      for (const entry of nonDeprecated) {
        diagnostics.push(error(
          `${RULE}/ambiguous`,
          `Policy kind "${kind}" has multiple non-deprecated definitions and no active selector.`,
          {
            file: entry.file,
            objectId: typeof entry.data.id === "string" ? entry.data.id : undefined,
          },
        ));
      }
    }
  }

  return diagnostics;
}
