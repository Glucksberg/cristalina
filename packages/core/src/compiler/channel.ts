import type { PrivacyScope, ProjectionProfile } from "@cristalina/types";
import { DEFAULT_PROJECTION_POLICY, type ProjectionPolicy } from "../policy/runtime.js";

export interface ChannelProjectionContext {
  requestedChannel?: string;
  normalizedChannel: string;
  profile: ProjectionProfile;
  useCompatibilityAlias: boolean;
}

function sanitizeChannel(channel: string): string {
  return channel.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function defaultChannelForAudience(audience: PrivacyScope): string {
  return `${audience}_runtime`;
}

export function normalizeProjectionChannel(channel: string | undefined, audience: PrivacyScope): string {
  return sanitizeChannel(channel ?? defaultChannelForAudience(audience));
}

export function projectionProfileForChannel(
  channel: string,
  audience: PrivacyScope,
  policy: ProjectionPolicy = DEFAULT_PROJECTION_POLICY,
): ProjectionProfile {
  for (const rule of policy.channelProfileRules) {
    if (channel.startsWith(rule.matchPrefix)) {
      return rule.profile;
    }
  }
  return policy.defaultProfiles[audience];
}

export function resolveChannelProjectionContext(
  audience: PrivacyScope,
  requestedChannel?: string,
  requestedProfile?: ProjectionProfile,
  policy: ProjectionPolicy = DEFAULT_PROJECTION_POLICY,
): ChannelProjectionContext {
  const normalizedChannel = normalizeProjectionChannel(requestedChannel, audience);
  return {
    requestedChannel,
    normalizedChannel,
    profile: requestedProfile ?? projectionProfileForChannel(normalizedChannel, audience, policy),
    useCompatibilityAlias: requestedChannel === undefined,
  };
}
