import { ID_PREFIXES } from "@cristalina/types";
import type { Diagnostic } from "../diagnostics.js";
import { error } from "../diagnostics.js";
import type { ParsedStore, ParsedObject } from "../store/reader.js";

const RULE = "id-prefix";

/** Validate that every object's ID uses the correct prefix for its type. */
export function idPrefix(store: ParsedStore): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const obj of store.events) {
    checkPrefix(obj, ID_PREFIXES.event, "event", diagnostics);
  }

  for (const obj of store.proposals) {
    checkPrefix(obj, ID_PREFIXES.proposal, "proposal", diagnostics);
  }

  for (const obj of store.curationPackets) {
    checkNamedPrefix(obj, "packet_id", ID_PREFIXES.curationPacket, "curation-packet", diagnostics);
  }

  for (const obj of store.coreObjects) {
    const id = obj.data.id;
    if (typeof id !== "string") continue;

    // Determine expected prefix from the object kind or ID itself
    const kind = obj.data.kind;
    const expectedPrefix = kindToPrefix(kind);
    if (expectedPrefix) {
      checkPrefix(obj, expectedPrefix, String(kind), diagnostics);
    }
  }

  for (const obj of store.contradictions) {
    checkPrefix(obj, ID_PREFIXES.contradiction, "contradiction", diagnostics);
  }

  for (const obj of store.entities) {
    checkPrefix(obj, ID_PREFIXES.entity, "entity", diagnostics);
  }

  for (const obj of store.policyObjects) {
    checkPrefix(obj, ID_PREFIXES.policy, "policy-object", diagnostics);
  }

  return diagnostics;
}

function checkNamedPrefix(
  obj: ParsedObject,
  field: string,
  expectedPrefix: string,
  objectType: string,
  diagnostics: Diagnostic[],
): void {
  const id = obj.data[field];
  if (typeof id !== "string") {
    diagnostics.push(
      error(`${RULE}/missing`, `${objectType} object is missing ${field}`, { file: obj.file }),
    );
    return;
  }
  if (!id.startsWith(expectedPrefix)) {
    diagnostics.push(
      error(`${RULE}/wrong`, `${field} "${id}" should start with "${expectedPrefix}" for ${objectType}`, {
        file: obj.file,
        objectId: id,
      }),
    );
  }
}

function checkPrefix(
  obj: ParsedObject,
  expectedPrefix: string,
  objectType: string,
  diagnostics: Diagnostic[],
): void {
  const id = obj.data.id;
  if (typeof id !== "string") {
    diagnostics.push(
      error(`${RULE}/missing`, `${objectType} object is missing an ID`, { file: obj.file }),
    );
    return;
  }
  if (!id.startsWith(expectedPrefix)) {
    diagnostics.push(
      error(`${RULE}/wrong`, `ID "${id}" should start with "${expectedPrefix}" for ${objectType}`, {
        file: obj.file,
        objectId: id,
      }),
    );
  }
}

function kindToPrefix(kind: unknown): string | null {
  switch (kind) {
    case "fact":
    case "preference":
    case "constraint":
    case "project":
    case "belief":
      return ID_PREFIXES.fact;
    case "relationship":
      return ID_PREFIXES.relationship;
    case "value":
      return ID_PREFIXES.value;
    case "identity_trait":
      return ID_PREFIXES.identityTrait;
    case "style_rule":
      return ID_PREFIXES.styleRule;
    case "priority":
      return ID_PREFIXES.value;
    default:
      return null;
  }
}
