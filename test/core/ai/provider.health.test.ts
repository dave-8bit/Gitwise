import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Fake a ProviderId so we don't import the real registry before mocking it.
type FakeProviderId = 'groq' | 'openrouter' | 'gemini' | 'ollama';

const mockProviders: Record<FakeProviderId, { chat: ReturnType<typeof vi.fn>; health: ReturnType<typeof vi.fn> }> = {
  groq: { chat: vi.fn(), health: vi.fn() },
  openrouter: { chat: vi.fn(), health: vi.fn() },
  gemini: { chat: vi.fn(), health: vi.fn() },
  ollama: { chat: vi.fn(), health: vi.fn() },
};

// Mock the registry so the service delegates to our fake providers.
vi.mock('../../../src/core/ai/provider.registry', () => ({
  getActiveProviderId: vi.fn(),
  getProviderById: (id: string) => mockProviders[id as FakeProviderId],
  SUPPORTED_PROVIDERS: ['groq', 'openrouter', 'gemini', 'ollama'] as const,
}));

import { getActiveProviderId } from '../../../src/core/ai/provider.registry';
import {
  checkActiveProviderHealth,
  checkProviderHealth,
} from '../../../src/core/ai/provider.health';

const mockGetActiveProviderId = getActiveProviderId as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('provider health service', () => {
  it('checkProviderHealth delegates to the named provider health()', async () => {
    const canned = { provider: 'groq' as const, status: 'ok' as const, responseTimeMs: 3 };
    mockProviders.groq.health.mockResolvedValue(canned);

    const result = await checkProviderHealth('groq');

    expect(mockProviders.groq.health).toHaveBeenCalledTimes(1);
    expect(result).toEqual(canned);
  });

  it('checkActiveProviderHealth uses the active provider id', async () => {
    mockGetActiveProviderId.mockReturnValue('ollama');
    const canned = { provider: 'ollama' as const, status: 'ok' as const, responseTimeMs: 5 };
    mockProviders.ollama.health.mockResolvedValue(canned);

    const result = await checkActiveProviderHealth();

    expect(mockGetActiveProviderId).toHaveBeenCalledTimes(1);
    expect(result).toEqual(canned);
  });

  it('propagates the provider health result verbatim (including failures)', async () => {
    const canned = { provider: 'gemini', status: 'auth', errorCode: 'auth', statusCode: 401 };
    mockProviders.gemini.health.mockResolvedValue(canned);

    const result = await checkProviderHealth('gemini');

    expect(result).toEqual(canned);
  });

  it('performs no network request itself (delegates fully)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    mockProviders.openrouter.health.mockResolvedValue({
      provider: 'openrouter',
      status: 'unavailable',
      errorCode: 'network',
    });

    const result = await checkProviderHealth('openrouter');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.status).toBe('unavailable');
  });
});