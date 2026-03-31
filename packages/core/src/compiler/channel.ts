import type { PrivacyScope, ProjectionProfile } from "@cristalina/types";

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

export function projectionProfileForChannel(channel: string, audience: PrivacyScope): ProjectionProfile {
  if (channel.startsWith("group_") || channel.startsWith("public_")) {
    return "tiny";
  }

  if (channel.startsWith("project_") || channel.startsWith("agent_") || channel.startsWith("shareable_")) {
    return "standard";
  }

  if (channel.startsWith("owner_")) {
    return "deep";
  }

  switch (audience) {
    case "owner_private":
      return "deep";
    case "public_safe":
      return "tiny";
    default:
      return "standard";
  }
}

export function resolveChannelProjectionContext(
  audience: PrivacyScope,
  requestedChannel?: string,
  requestedProfile?: ProjectionProfile,
): ChannelProjectionContext {
  const normalizedChannel = normalizeProjectionChannel(requestedChannel, audience);
  return {
    requestedChannel,
    normalizedChannel,
    profile: requestedProfile ?? projectionProfileForChannel(normalizedChannel, audience),
    useCompatibilityAlias: requestedChannel === undefined,
  };
}
