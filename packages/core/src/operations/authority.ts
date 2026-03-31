import { coreFilePath } from "../store/paths.js";

const HIGH_RISK_KINDS = new Set([
  "value", "priority", "identity_trait", "style_rule",
]);

const RESTRICTED_PATHS = [
  "core/values/",
  "core/identity/",
  "core/privacy/",
];

/**
 * Check if an operation on a given kind requires human authorization.
 * Throws if authorization is required but not provided.
 */
export function enforceAuthority(
  kind: string,
  targetId: string,
  authorized: boolean | undefined,
): void {
  const filePath = coreFilePath(kind);
  const isRestricted = RESTRICTED_PATHS.some((p) => filePath.startsWith(p));
  const isHighRisk = HIGH_RISK_KINDS.has(kind);

  if ((isRestricted || isHighRisk) && !authorized) {
    throw new Error(
      `Operation on high-risk domain requires authorization for "${targetId}" (kind: ${kind}). ` +
      `Set authorized: true to confirm human approval.`,
    );
  }
}
