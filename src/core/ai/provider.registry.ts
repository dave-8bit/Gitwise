import type { AIProvider } from './ai.provider';
import type { ProviderCapabilities } from './ai.capabilities';
import { GroqProvider } from '../../providers/groq/groq.provider';
import { OpenRouterProvider } from '../../providers/openrouter/openrouter.provider';
import { GeminiProvider } from '../../providers/gemini/gemini.provider';
import { OllamaProvider } from '../../providers/ollama/ollama.provider';
import { loadConfig } from '../config/config.service';


export type ProviderId = 'groq' | 'openrouter' | 'gemini' | 'ollama';


export const SUPPORTED_PROVIDERS: readonly ProviderId[] = [
  'groq',
  'openrouter',
  'gemini',
  'ollama',
] as const;

const defaultProviderId: ProviderId = 'groq';

// Preserve existing runtime behavior by instantiating providers at module load time.
export const providers: Record<ProviderId, AIProvider> = {
  groq: new GroqProvider(),
  openrouter: new OpenRouterProvider(),
  gemini: new GeminiProvider(),
  ollama: new OllamaProvider(),
};


export function getActiveProviderId(): ProviderId {
  // Provider selection order (highest precedence first):
  // 1) process.env.GRITCH_PROVIDER
  // 2) gritch.config.json: config.provider
  // 3) hard-coded default: 'groq'

  const fromEnv = process.env.GRITCH_PROVIDER;
  if (fromEnv && SUPPORTED_PROVIDERS.includes(fromEnv as ProviderId)) {
    return fromEnv as ProviderId;
  }

  // If env is explicitly set to an unsupported value, always fall back to groq.
  // Ensure warning is emitted exactly once per env value.
  if (fromEnv) {
    const g = globalThis as any;
    const warnedKey = '__gritchUnsupportedProviderWarned:' + String(fromEnv);
    if (!g[warnedKey]) {
      g[warnedKey] = true;
      console.warn(
        `WARNING: Unsupported GRITCH_PROVIDER="${fromEnv}"; supported providers: ${SUPPORTED_PROVIDERS.join(', ')}. Falling back to "${defaultProviderId}".`
      );
    }
    return defaultProviderId;
  }

  // NOTE: loadConfig() preserves legacy config behavior.
  // If provider is omitted, defaultConfig.provider will be used.
  // This ensures backward compatibility when no provider is specified.

  const config = loadConfig();
  if (config?.provider && SUPPORTED_PROVIDERS.includes(config.provider as ProviderId)) {
    return config.provider as ProviderId;
  }

  return defaultProviderId;
}

export function getActiveProvider(): AIProvider {
  const id = getActiveProviderId();
  return providers[id] ?? providers[defaultProviderId];
}

export function getProviderById(id: ProviderId): AIProvider {
  return providers[id] ?? providers[defaultProviderId];
}

/** Returns static capability declarations using the registry's existing fallback semantics. */
export function getProviderCapabilities(id: ProviderId): ProviderCapabilities | undefined {
  return getProviderById(id).capabilities;
}





