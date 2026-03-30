import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { ManifestSchema } from "@cristalina/types";
import type { Diagnostic } from "../diagnostics.js";
import { error, warning } from "../diagnostics.js";
import type { ParsedStore } from "./reader.js";

const RULE = "manifest";

/**
 * Validate the store manifest against the Manifest schema
 * and check that referenced files exist on disk.
 */
export function validateManifest(store: ParsedStore): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  if (!store.manifest) {
    diagnostics.push(error(`${RULE}/missing`, "No manifest.yaml found in the store"));
    return diagnostics;
  }

  // Schema validation
  const result = ManifestSchema.safeParse(store.manifest);
  if (!result.success) {
    for (const issue of result.error.issues) {
      diagnostics.push(
        error(`${RULE}/schema`, issue.message, {
          file: store.manifestFile ?? undefined,
          path: issue.path.join("."),
        }),
      );
    }
    return diagnostics;
  }

  const manifest = result.data;

  // Check that referenced document paths exist relative to the repo root
  // The store root might be .cristalina/ inside a repo, so we check from 2 levels up
  const repoRoot = resolve(store.root, "..");
  const grandParent = resolve(store.root, "../..");

  for (const [key, docPath] of Object.entries(manifest.documents)) {
    const candidates = [
      resolve(repoRoot, docPath),
      resolve(grandParent, docPath),
      resolve(store.root, docPath),
    ];
    const exists = candidates.some((c) => existsSync(c));
    if (!exists) {
      diagnostics.push(
        warning(`${RULE}/missing-document`, `Referenced document not found: ${docPath} (key: ${key})`, {
          file: store.manifestFile ?? undefined,
          path: `documents.${key}`,
        }),
      );
    }
  }

  // Check that referenced schema paths exist
  for (const [key, schemaPath] of Object.entries(manifest.schemas)) {
    const candidates = [
      resolve(repoRoot, schemaPath),
      resolve(grandParent, schemaPath),
      resolve(store.root, schemaPath),
    ];
    const exists = candidates.some((c) => existsSync(c));
    if (!exists) {
      diagnostics.push(
        warning(`${RULE}/missing-schema`, `Referenced schema not found: ${schemaPath} (key: ${key})`, {
          file: store.manifestFile ?? undefined,
          path: `schemas.${key}`,
        }),
      );
    }
  }

  return diagnostics;
}
