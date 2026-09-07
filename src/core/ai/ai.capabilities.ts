/** Capabilities currently understood by the provider contract. */
export type CapabilityId = 'chat';

/** Whether a provider's support for a capability is known. */
export type CapabilitySupport = 'supported' | 'unsupported' | 'unknown';

/** Provider-level capability declarations. */
export type ProviderCapabilities = Readonly<Record<CapabilityId, CapabilitySupport>>;

/** Returns the declared support state, preserving unknown for undeclared data. */
export function getCapabilitySupport(
  capabilities: ProviderCapabilities | undefined,
  capability: CapabilityId,
): CapabilitySupport {
  return capabilities?.[capability] ?? 'unknown';
}

/** Returns true only when the capability is explicitly supported. */
export function supportsCapability(
  capabilities: ProviderCapabilities | undefined,
  capability: CapabilityId,
): boolean {
  return getCapabilitySupport(capabilities, capability) === 'supported';
}

/** Returns true when the provider has not declared a support decision. */
export function hasUnknownCapability(
  capabilities: ProviderCapabilities | undefined,
  capability: CapabilityId,
): boolean {
  return getCapabilitySupport(capabilities, capability) === 'unknown';
}