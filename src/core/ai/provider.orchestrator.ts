import type { AIProvider } from './ai.provider';
import type { AIRequest, AIResponse } from './ai.types';
import { getActiveProviderId, getProviderById, type ProviderId, SUPPORTED_PROVIDERS } from './provider.registry';
import { withRetry, isRetriableError, type RetryOptions } from './helpers/retry';

/**
 * Error classification for fallback decisions.
 *
 * Delegates to the shared {@link isRetriableError} so retry and fallback
 * share a single classification source of truth.  Retryable (transient)
 * errors are fallback-worthy; permanent errors (auth, config, missing key)
 * are not.
 */
function isFallbackWorthyError(error: unknown): boolean {
  return isRetriableError(error);
}

/**
 * Orchestrates provider attempts with bounded retry and fallback.
 *
 * Flow for each provider in priority order:
 *   1. Retry the same provider up to `maxAttempts` times on transient errors
 *      (network, timeout, 429, 5xx).
 *   2. If retries are exhausted, fall back to the next viable provider.
 *
 * Non-retryable errors (missing API key, auth, 4xx config) throw immediately
 * without retry or fallback.
 *
 * Retry and fallback share a single classification
 * ({@link isRetriableError}) so the two mechanisms can never disagree about
 * whether a failure is transient.
 */
export async function chatWithFallback(
  request: AIRequest,
  retryOptions?: RetryOptions
): Promise<AIResponse> {
  const preferredProviderId = getActiveProviderId();
  const attempted = new Set<ProviderId>();
  const errors: Array<{ provider: ProviderId; error: Error }> = [];

  // Build ordered list of providers to try
  // Start with preferred, then try others in any order
  const providerOrder: ProviderId[] = [preferredProviderId];

  for (const p of SUPPORTED_PROVIDERS) {
    if (p !== preferredProviderId) {
      providerOrder.push(p);
    }
  }

  for (const providerId of providerOrder) {
    // Skip if already attempted
    if (attempted.has(providerId)) {
      continue;
    }

    attempted.add(providerId);
    const provider = getProviderById(providerId);

    try {
      const response = await withRetry(
        () => provider.chat(request),
        retryOptions,
      );

      // If this isn't the preferred provider, notify user
      if (providerId !== preferredProviderId) {
        console.warn(`⚠ ${preferredProviderId} unavailable — switching to ${providerId}...`);
      }

      return response;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push({ provider: providerId, error: err });

      // If error is not fallback-worthy (auth/config errors), fail immediately
      // These are configuration problems that should be reported, not hidden by fallback
      if (!isFallbackWorthyError(error)) {
        throw err;
      }
    }
  }

  // All providers failed - construct meaningful error
  const errorSummary = errors
    .map(({ provider, error }) => `${provider}: ${error.message}`)
    .join('; ');

  throw new Error(
    `All AI providers failed. Attempted: ${Array.from(attempted).join(', ')}. ` +
    `Errors: ${errorSummary}`
  );
}