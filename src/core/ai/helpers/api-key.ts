import type { ProviderId } from '../provider.registry';
import { createMissingApiKeyError } from './provider-error';

export function requireApiKey(key: string | undefined, envVarName: string, provider?: ProviderId): string {
  const value = key ?? '';
  if (!value) {
    // Throw structured ProviderError if provider known, else plain error for backward compatibility
    if (provider) {
      throw createMissingApiKeyError({ provider, envVarName });
    }
    throw new Error(`Missing ${envVarName}`);
  }
  return value;
}

