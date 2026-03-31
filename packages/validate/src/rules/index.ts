import type { Diagnostic } from "../diagnostics.js";
import type { ParsedStore } from "../store/reader.js";

import { schemaConformance } from "./schema-conformance.js";
import { idPrefix } from "./id-prefix.js";
import { privacyScope } from "./privacy-scope.js";
import { confidenceRange } from "./confidence-range.js";
import { requiredProvenance } from "./required-provenance.js";
import { statusConsistency } from "./status-consistency.js";
import { supersessionIntegrity } from "./supersession-integrity.js";
import { contradictionIntegrity } from "./contradiction-integrity.js";
import { scopeEscalation } from "./scope-escalation.js";
import { stableReferences } from "./stable-references.js";
import { storeStructure } from "./store-structure.js";
import { snapshotExpectations } from "../snapshot/expectations.js";

export type Rule = (store: ParsedStore) => Diagnostic[];

export const ALL_RULES: readonly Rule[] = [
  schemaConformance,
  idPrefix,
  privacyScope,
  confidenceRange,
  requiredProvenance,
  statusConsistency,
  supersessionIntegrity,
  contradictionIntegrity,
  scopeEscalation,
  stableReferences,
  storeStructure,
  snapshotExpectations,
];

export {
  schemaConformance,
  idPrefix,
  privacyScope,
  confidenceRange,
  requiredProvenance,
  statusConsistency,
  supersessionIntegrity,
  contradictionIntegrity,
  scopeEscalation,
  stableReferences,
  storeStructure,
  snapshotExpectations,
};
