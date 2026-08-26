import type { AIProvider } from './ai.provider';
import type { ProviderHealthResult } from './helpers/provider-health';
import { getActiveProviderId, getProviderById, type ProviderId } from './provider.registry';

/**
 * Provider health service.
 *
 * A thin entry point that determines whether a configured provider is currently
 * reachable/usable, without performing a normal AI generation request. Each
 * provider owns the details of its lightweight probe endpoint (via its
 * {@link AIProvider.health}). No background polling or persistent health state
 * is kept.
 */
export async function checkProviderHealth(providerId: ProviderId): Promise<ProviderHealthResult> {
  const provider: AIProvider = getProviderById(providerId);
  return provider.health();
}

/** Checks the currently active/preferred provider. */
export async function checkActiveProviderHealth(): Promise<ProviderHealthResult> {
  const id = getActiveProviderId();
  return checkProviderHealth(id);
}