import type { MemoryOperation } from "@cristalina/types";
import { coreFilePath } from "../store/paths.js";

export type AuthorityActorRole = "owner" | "agent" | "system";

export interface OperationAuthorityContext {
  actor_id?: string;
  actor_role?: AuthorityActorRole;
  runtime?: string;
  channel?: string;
  authorized?: boolean;
}

export interface OperationAuthorityRequest {
  operation: MemoryOperation;
  kind: string;
  targetId: string;
  authority?: OperationAuthorityContext;
}

export interface AuthorityDecision {
  allowed: boolean;
  requiresHumanApproval: boolean;
  reasons: string[];
  domainPath: string;
  authority: OperationAuthorityContext;
}

const HIGH_RISK_KINDS = new Set([
  "value", "priority", "identity_trait", "style_rule",
]);

const RESTRICTED_PATHS = [
  "core/values/",
  "core/identity/",
  "core/privacy/",
];

const TRUSTED_OWNER_CHANNEL_PREFIXES = [
  "owner_private",
  "project_private",
];

function inferActorRole(actorId: string | undefined): AuthorityActorRole | undefined {
  if (actorId === "owner") return "owner";
  if (actorId === "system") return "system";
  if (actorId === "agent") return "agent";
  return undefined;
}

function normalizeChannel(channel: string | undefined): string | undefined {
  return channel?.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function resolveAuthorityContext(
  authority: OperationAuthorityContext | undefined,
  legacyAuthorized?: boolean,
  actorHint?: string,
): OperationAuthorityContext {
  const actorId = authority?.actor_id ?? actorHint;
  return {
    ...authority,
    actor_id: actorId,
    actor_role: authority?.actor_role ?? inferActorRole(actorId),
    channel: normalizeChannel(authority?.channel),
    authorized: authority?.authorized ?? legacyAuthorized,
  };
}

export function actorForAudit(
  authority: OperationAuthorityContext | undefined,
  fallbackActor: string,
): string {
  return authority?.actor_id ?? authority?.actor_role ?? fallbackActor;
}

function isTrustedOwnerChannel(channel: string | undefined): boolean {
  if (!channel) return false;
  return TRUSTED_OWNER_CHANNEL_PREFIXES.some((prefix) => channel.startsWith(prefix));
}

export function evaluateAuthority(request: OperationAuthorityRequest): AuthorityDecision {
  const filePath = coreFilePath(request.kind);
  const reasons: string[] = [];

  if (RESTRICTED_PATHS.some((path) => filePath.startsWith(path))) {
    reasons.push("restricted_domain");
  }
  if (HIGH_RISK_KINDS.has(request.kind)) {
    reasons.push("high_risk_kind");
  }

  const authority = resolveAuthorityContext(request.authority);
  const requiresHumanApproval = reasons.length > 0;

  if (!requiresHumanApproval) {
    return {
      allowed: true,
      requiresHumanApproval: false,
      reasons,
      domainPath: filePath,
      authority,
    };
  }

  const hasExplicitAuthorization = authority.authorized === true;
  const hasTrustedOwnerAuthority = authority.actor_role === "owner"
    && isTrustedOwnerChannel(authority.channel);

  return {
    allowed: hasExplicitAuthorization || hasTrustedOwnerAuthority,
    requiresHumanApproval: true,
    reasons,
    domainPath: filePath,
    authority,
  };
}

export function enforceAuthority(request: OperationAuthorityRequest): void;
export function enforceAuthority(
  kind: string,
  targetId: string,
  authorized: boolean | undefined,
): void;
export function enforceAuthority(
  requestOrKind: OperationAuthorityRequest | string,
  targetId?: string,
  authorized?: boolean,
): void {
  const request: OperationAuthorityRequest = typeof requestOrKind === "string"
    ? {
        operation: "REVISE",
        kind: requestOrKind,
        targetId: targetId ?? `${requestOrKind}:unknown`,
        authority: { authorized },
      }
    : requestOrKind;

  const decision = evaluateAuthority(request);
  if (decision.allowed) return;

  const actor = decision.authority.actor_role ?? "agent";
  const channel = decision.authority.channel ?? "unspecified";

  throw new Error(
    `Operation ${request.operation} on sensitive domain requires authorization for "${request.targetId}" ` +
    `(kind: ${request.kind}; reasons: ${decision.reasons.join(", ")}; actor: ${actor}; channel: ${channel}). ` +
    `Provide authority.authorized: true or execute as owner through a trusted private channel.`,
  );
}
