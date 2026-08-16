import type { AIProvider } from './ai.provider';
import type { AIRequest, AIResponse } from './ai.types';
import { getActiveProviderId, getProviderById, type ProviderId, SUPPORTED_PROVIDERS } from './provider.registry';
import { ProviderError } from './helpers/provider-error';

/**
 * Error classification for fallback decisions.
 * Distinguishes between errors that justify provider fallback
 * and errors that should not trigger blind retries.
 */
function isFallbackWorthyError(error: unknown): boolean {
  // Check structured ProviderError first (most reliable)
  if (error instanceof ProviderError) {
    return error.isRetriable;
  }

  // Fall back to string pattern matching for backward compatibility
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Timeout errors
    if (message.includes('timed out') || message.includes('abort')) {
      return true;
    }
    
    // Network/transport errors
    if (message.includes('econnrefused') || 
        message.includes('enotfound') ||
        message.includes('etimedout') ||
        message.includes('network') ||
        message.includes('fetch failed')) {
      return true;
    }
    
    // HTTP 429 (rate limiting) - fallback-worthy
    if (message.includes('429')) {
      return true;
    }
    
    // HTTP 5xx (server errors) - fallback-worthy
    if (message.includes('500') || 
        message.includes('502') || 
        message.includes('503') || 
        message.includes('504')) {
      return true;
    }
    
    // HTTP 401/403 (auth errors) - NOT fallback-worthy, provider unavailable
    if (message.includes('401') || message.includes('403')) {
      return false;
    }
    
    // HTTP 400 (bad request) - NOT fallback-worthy, likely config issue
    if (message.includes('400')) {
      return false;
    }
    
    // Missing API key - provider unavailable
    if (message.includes('missing') && message.includes('api_key')) {
      return false;
    }
  }
  
  // Unknown errors default to fallback-worthy for resilience
  return true;
}

/**
 * Orchestrates provider attempts with fallback.
 * Respects the configured preferred provider but falls back
 * to other viable providers on runtime failures.
 */
export async function chatWithFallback(request: AIRequest): Promise<AIResponse> {
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
      const response = await provider.chat(request);

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
