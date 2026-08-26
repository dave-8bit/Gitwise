import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { chatWithFallback } from '../../../src/core/ai/provider.orchestrator';
import type { AIProvider } from '../../../src/core/ai/ai.provider';
import type { AIRequest, AIResponse } from '../../../src/core/ai/ai.types';
import type { ProviderId } from '../../../src/core/ai/provider.registry';
import type { RetryOptions } from '../../../src/core/ai/helpers/retry';

// Mock provider registry
vi.mock('../../../src/core/ai/provider.registry', () => {
  const mockProviders: Record<string, AIProvider> = {};
  return {
    getActiveProviderId: vi.fn(),
    getProviderById: (id: string) => mockProviders[id],
    providers: mockProviders,
    SUPPORTED_PROVIDERS: ['groq', 'openrouter', 'gemini', 'ollama'] as const,
  };
});

import { getActiveProviderId, providers } from '../../../src/core/ai/provider.registry';

const mockGetActiveProviderId = getActiveProviderId as ReturnType<typeof vi.fn>;
const mockProviders = providers as Record<ProviderId, AIProvider>;

/** A no-op sleep so retries never actually wait during tests. */
const noopSleep = () => Promise.resolve();

/** Retry policy with injected sleep: 3 attempts total (1 initial + 2 retries). */
const retry3: RetryOptions = { maxAttempts: 3, sleep: noopSleep };

/**
 * Integration tests verifying that bounded retry sits BEFORE fallback in the
 * orchestrator flow, without bypassing provider orchestration:
 *
 *   Provider A → transient failure → retry Provider A (bounded)
 *              → exhausted → existing orchestrator fallback → Provider B
 *
 * These complement the shared-retry unit tests (retry.test.ts) and the
 * fallback-only tests (provider.orchestrator.test.ts, which pass
 * maxAttempts=1).
 */
describe('Provider orchestrator — retry then fallback', () => {
  const mockRequest: AIRequest = {
    systemPrompt: 'You are a helpful assistant.',
    userPrompt: 'Hello',
  };

  const mockSuccessResponse: AIResponse = {
    content: 'Success response',
    metadata: { provider: 'groq' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockProviders.groq = { chat: vi.fn(), health: vi.fn() } as AIProvider;
    mockProviders.openrouter = { chat: vi.fn(), health: vi.fn() } as AIProvider;
    mockProviders.gemini = { chat: vi.fn(), health: vi.fn() } as AIProvider;
    mockProviders.ollama = { chat: vi.fn(), health: vi.fn() } as AIProvider;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('transient failure then success on the same provider: retries without fallback', async () => {
    mockGetActiveProviderId.mockReturnValue('groq');
    (mockProviders.groq.chat as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('Network connection lost'))
      .mockResolvedValueOnce(mockSuccessResponse);
    // openrouter would resolve if fallback happened; it must NOT be attempted.
    (mockProviders.openrouter.chat as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuccessResponse);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await chatWithFallback(mockRequest, retry3);

    expect(result).toEqual(mockSuccessResponse);
    // Same provider attempted twice (1 initial + 1 retry) before success.
    expect(mockProviders.groq.chat).toHaveBeenCalledTimes(2);
    // No fallback occurred.
    expect(mockProviders.openrouter.chat).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('retry exhaustion on the preferred provider falls back to a viable provider', async () => {
    mockGetActiveProviderId.mockReturnValue('groq');
    // Always transiently failing: 3 attempts on groq.
    (mockProviders.groq.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('503 Service Unavailable')
    );
    (mockProviders.openrouter.chat as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuccessResponse);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await chatWithFallback(mockRequest, retry3);

    expect(result).toEqual(mockSuccessResponse);
    // groq retried up to maxAttempts (3) before falling back.
    expect(mockProviders.groq.chat).toHaveBeenCalledTimes(3);
    // fallback then tried openrouter exactly once.
    expect(mockProviders.openrouter.chat).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('⚠ groq unavailable — switching to openrouter...');
    warnSpy.mockRestore();
  });

  it('retry exhaustion across all providers throws the aggregate failure error', async () => {
    mockGetActiveProviderId.mockReturnValue('groq');
    for (const key of ['groq', 'openrouter', 'gemini', 'ollama'] as ProviderId[]) {
      (mockProviders[key].chat as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('503 Service Unavailable')
      );
    }

    await expect(chatWithFallback(mockRequest, retry3)).rejects.toThrow(
      /All AI providers failed/
    );

    // Each provider was retried up to the bound (3) then passed to the next.
    expect(mockProviders.groq.chat).toHaveBeenCalledTimes(3);
    expect(mockProviders.openrouter.chat).toHaveBeenCalledTimes(3);
    expect(mockProviders.gemini.chat).toHaveBeenCalledTimes(3);
    expect(mockProviders.ollama.chat).toHaveBeenCalledTimes(3);
  });

  it('non-retryable error is not retried and does not fall back', async () => {
    mockGetActiveProviderId.mockReturnValue('gemini');
    (mockProviders.gemini.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Gemini request failed: 401 Unauthorized')
    );
    (mockProviders.groq.chat as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuccessResponse);

    await expect(chatWithFallback(mockRequest, retry3)).rejects.toThrow('401 Unauthorized');

    expect(mockProviders.gemini.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.groq.chat).not.toHaveBeenCalled();
  });

  it('missing API key is not retried and does not fall back', async () => {
    mockGetActiveProviderId.mockReturnValue('ollama');
    (mockProviders.ollama.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Missing GROQ_API_KEY')
    );

    await expect(chatWithFallback(mockRequest, retry3)).rejects.toThrow('Missing GROQ_API_KEY');

    expect(mockProviders.ollama.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.groq.chat).not.toHaveBeenCalled();
  });

  it('preserves the original (meaningful) ProviderError after retry exhaustion and fallback-to-fallback', async () => {
    mockGetActiveProviderId.mockReturnValue('groq');
    // All fall simultaneously fail transiently.
    for (const key of ['groq', 'openrouter', 'gemini', 'ollama'] as ProviderId[]) {
      (mockProviders[key].chat as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Request timed out after 30000ms')
      );
    }

    await expect(chatWithFallback(mockRequest, retry3)).rejects.toThrow(
      /All AI providers failed/
    );
    // The aggregate error still surfaces each provider's original message.
    await expect(
      chatWithFallback(mockRequest, retry3)
    ).rejects.toThrow(/groq: Request timed out after 30000ms/);
  });

  it('does not bypass provider orchestration when the first provider eventually succeeds', async () => {
    mockGetActiveProviderId.mockReturnValue('ollama');
    // Ollama fails twice then succeeds on the 3rd attempt.
    (mockProviders.ollama.chat as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce(mockSuccessResponse);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await chatWithFallback(mockRequest, retry3);

    expect(result).toEqual(mockSuccessResponse);
    expect(mockProviders.ollama.chat).toHaveBeenCalledTimes(3);
    expect(mockProviders.groq.chat).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});