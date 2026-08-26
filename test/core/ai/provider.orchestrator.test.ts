import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { chatWithFallback } from '../../../src/core/ai/provider.orchestrator';
import type { AIProvider } from '../../../src/core/ai/ai.provider';
import type { AIRequest, AIResponse } from '../../../src/core/ai/ai.types';
import type { ProviderId } from '../../../src/core/ai/provider.registry';
import type { RetryOptions } from '../../../src/core/ai/helpers/retry';

// These tests verify FALLBACK semantics (one attempt per provider before
// moving on). Retry is deliberately disabled (maxAttempts=1) so provider
// call counts remain exactly one per provider. Retry-specific integration is
// covered separately in test/core/ai/helpers/retry.test.ts and in the
// orchestrator retry-integration tests.
const noRetryOptions: RetryOptions = { maxAttempts: 1 };

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

describe('Provider orchestrator', () => {
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
    
    // Reset all provider mocks
    mockProviders.groq = {
      chat: vi.fn(),
      health: vi.fn(),
    } as AIProvider;
    mockProviders.openrouter = {
      chat: vi.fn(),
      health: vi.fn(),
    } as AIProvider;
    mockProviders.gemini = {
      chat: vi.fn(),
      health: vi.fn(),
    } as AIProvider;
    mockProviders.ollama = {
      chat: vi.fn(),
      health: vi.fn(),
    } as AIProvider;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preferred provider succeeds → no fallback', async () => {
    mockGetActiveProviderId.mockReturnValue('groq');
    (mockProviders.groq.chat as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuccessResponse);

    const result = await chatWithFallback(mockRequest, noRetryOptions);

    expect(result).toEqual(mockSuccessResponse);
    expect(mockProviders.groq.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.openrouter.chat).not.toHaveBeenCalled();
    expect(mockProviders.gemini.chat).not.toHaveBeenCalled();
    expect(mockProviders.ollama.chat).not.toHaveBeenCalled();
  });

  it('preferred provider fails → next viable provider succeeds', async () => {
    mockGetActiveProviderId.mockReturnValue('groq');
    (mockProviders.groq.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Request timed out after 30000ms')
    );
    (mockProviders.openrouter.chat as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuccessResponse);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await chatWithFallback(mockRequest, noRetryOptions);

    expect(result).toEqual(mockSuccessResponse);
    expect(mockProviders.groq.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.openrouter.chat).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('⚠ groq unavailable — switching to openrouter...');
    
    warnSpy.mockRestore();
  });

  it('multiple providers fail → continues through viable candidates', async () => {
    mockGetActiveProviderId.mockReturnValue('groq');
    (mockProviders.groq.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Request timed out')
    );
    (mockProviders.openrouter.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('ECONNREFUSED')
    );
    (mockProviders.gemini.chat as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuccessResponse);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await chatWithFallback(mockRequest, noRetryOptions);

    expect(result).toEqual(mockSuccessResponse);
    expect(mockProviders.groq.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.openrouter.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.gemini.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.ollama.chat).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('⚠ groq unavailable — switching to gemini...');
    
    warnSpy.mockRestore();
  });

  it('all providers fail → bounded clean failure', async () => {
    mockGetActiveProviderId.mockReturnValue('groq');
    (mockProviders.groq.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Request timed out')
    );
    (mockProviders.openrouter.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('ECONNREFUSED')
    );
    (mockProviders.gemini.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('500 Internal Server Error')
    );
    (mockProviders.ollama.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('503 Service Unavailable')
    );

    await expect(chatWithFallback(mockRequest, noRetryOptions)).rejects.toThrow(
      'All AI providers failed'
    );
    expect(mockProviders.groq.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.openrouter.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.gemini.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.ollama.chat).toHaveBeenCalledTimes(1);
  });

  it('provider with 401 error does NOT fallback - throws immediately', async () => {
    mockGetActiveProviderId.mockReturnValue('groq');
    (mockProviders.groq.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Gemini request failed: 401 Unauthorized')
    );
    (mockProviders.openrouter.chat as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuccessResponse);

    await expect(chatWithFallback(mockRequest, noRetryOptions)).rejects.toThrow('401 Unauthorized');
    expect(mockProviders.groq.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.openrouter.chat).not.toHaveBeenCalled();
  });

  it('provider with 403 error does NOT fallback - throws immediately', async () => {
    mockGetActiveProviderId.mockReturnValue('gemini');
    (mockProviders.gemini.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Request failed: 403 Forbidden')
    );
    (mockProviders.groq.chat as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuccessResponse);

    await expect(chatWithFallback(mockRequest, noRetryOptions)).rejects.toThrow('403 Forbidden');
    expect(mockProviders.gemini.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.groq.chat).not.toHaveBeenCalled();
  });

  it('provider with missing API key does NOT fallback - throws immediately', async () => {
    mockGetActiveProviderId.mockReturnValue('ollama');
    (mockProviders.ollama.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Missing GEMINI_API_KEY')
    );
    (mockProviders.groq.chat as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuccessResponse);

    await expect(chatWithFallback(mockRequest, noRetryOptions)).rejects.toThrow('Missing GEMINI_API_KEY');
    expect(mockProviders.ollama.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.groq.chat).not.toHaveBeenCalled();
  });

  it('provider with 400 error does NOT fallback - throws immediately', async () => {
    mockGetActiveProviderId.mockReturnValue('openrouter');
    (mockProviders.openrouter.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Request failed: 400 Bad Request')
    );
    (mockProviders.groq.chat as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuccessResponse);

    await expect(chatWithFallback(mockRequest, noRetryOptions)).rejects.toThrow('400 Bad Request');
    expect(mockProviders.openrouter.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.groq.chat).not.toHaveBeenCalled();
    expect(mockProviders.gemini.chat).not.toHaveBeenCalled();
  });

  it('provider with 429 error triggers fallback', async () => {
    mockGetActiveProviderId.mockReturnValue('groq');
    (mockProviders.groq.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Request failed: 429 Too Many Requests')
    );
    (mockProviders.openrouter.chat as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuccessResponse);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await chatWithFallback(mockRequest, noRetryOptions);

    expect(result).toEqual(mockSuccessResponse);
    expect(mockProviders.groq.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.openrouter.chat).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('⚠ groq unavailable — switching to openrouter...');
    
    warnSpy.mockRestore();
  });

  it('provider with 5xx error triggers fallback', async () => {
    mockGetActiveProviderId.mockReturnValue('gemini');
    (mockProviders.gemini.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Gemini request failed: 502 Bad Gateway')
    );
    (mockProviders.groq.chat as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuccessResponse);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await chatWithFallback(mockRequest, noRetryOptions);

    expect(result).toEqual(mockSuccessResponse);
    expect(mockProviders.gemini.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.groq.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.ollama.chat).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('⚠ gemini unavailable — switching to groq...');
    
    warnSpy.mockRestore();
  });

  it('provider is not attempted twice in one request', async () => {
    mockGetActiveProviderId.mockReturnValue('groq');
    (mockProviders.groq.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Request timed out')
    );
    (mockProviders.openrouter.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Request timed out')
    );
    (mockProviders.gemini.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Request timed out')
    );
    (mockProviders.ollama.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Request timed out')
    );

    await expect(chatWithFallback(mockRequest, noRetryOptions)).rejects.toThrow();

    // Each provider attempted exactly once
    expect(mockProviders.groq.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.openrouter.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.gemini.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.ollama.chat).toHaveBeenCalledTimes(1);
  });

  it('no hardcoded Ollama → Groq assumption', async () => {
    // Test with different preferred providers to ensure no hardcoded chain
    const testCases: ProviderId[] = ['groq', 'openrouter', 'gemini', 'ollama'];
    
    for (const preferred of testCases) {
      vi.clearAllMocks();
      
      mockGetActiveProviderId.mockReturnValue(preferred);
      
      // Make preferred fail, second provider succeed
      (mockProviders[preferred].chat as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Request timed out')
      );
      
      // Find the next provider that should succeed
      const otherProviders = testCases.filter(p => p !== preferred);
      const nextProvider = otherProviders[0];
      (mockProviders[nextProvider].chat as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuccessResponse);
      
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = await chatWithFallback(mockRequest, noRetryOptions);
      
      expect(result).toEqual(mockSuccessResponse);
      expect(mockProviders[preferred].chat).toHaveBeenCalledTimes(1);
      expect(mockProviders[nextProvider].chat).toHaveBeenCalledTimes(1);
      
      warnSpy.mockRestore();
    }
  });

  it('network error triggers fallback', async () => {
    mockGetActiveProviderId.mockReturnValue('groq');
    (mockProviders.groq.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('fetch failed')
    );
    (mockProviders.openrouter.chat as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuccessResponse);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await chatWithFallback(mockRequest, noRetryOptions);

    expect(result).toEqual(mockSuccessResponse);
    expect(mockProviders.groq.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.openrouter.chat).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('⚠ groq unavailable — switching to openrouter...');
    
    warnSpy.mockRestore();
  });

  it('ECONNREFUSED triggers fallback', async () => {
    mockGetActiveProviderId.mockReturnValue('ollama');
    (mockProviders.ollama.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('ECONNREFUSED')
    );
    (mockProviders.groq.chat as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuccessResponse);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await chatWithFallback(mockRequest, noRetryOptions);

    expect(result).toEqual(mockSuccessResponse);
    expect(mockProviders.ollama.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.groq.chat).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('⚠ ollama unavailable — switching to groq...');
    
    warnSpy.mockRestore();
  });

  it('abort error triggers fallback', async () => {
    mockGetActiveProviderId.mockReturnValue('gemini');
    (mockProviders.gemini.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new DOMException('The operation was aborted.', 'AbortError')
    );
    (mockProviders.groq.chat as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuccessResponse);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await chatWithFallback(mockRequest, noRetryOptions);

    expect(result).toEqual(mockSuccessResponse);
    expect(mockProviders.gemini.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.groq.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.openrouter.chat).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('⚠ gemini unavailable — switching to groq...');
    
    warnSpy.mockRestore();
  });

  it('preserves existing provider selection behavior', async () => {
    // Test that the orchestrator respects the configured provider
    mockGetActiveProviderId.mockReturnValue('groq');
    (mockProviders.groq.chat as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuccessResponse);

    const result = await chatWithFallback(mockRequest, noRetryOptions);

    expect(result).toEqual(mockSuccessResponse);
    expect(mockProviders.groq.chat).toHaveBeenCalledTimes(1);
    expect(mockGetActiveProviderId).toHaveBeenCalled();
  });

  it('error message includes all attempted providers and their errors', async () => {
    mockGetActiveProviderId.mockReturnValue('groq');
    (mockProviders.groq.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('timeout')
    );
    (mockProviders.openrouter.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('network')
    );
    (mockProviders.gemini.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('server error')
    );
    (mockProviders.ollama.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('unavailable')
    );

    await expect(chatWithFallback(mockRequest, noRetryOptions)).rejects.toThrow(
      /All AI providers failed/
    );
    await expect(chatWithFallback(mockRequest, noRetryOptions)).rejects.toThrow(
      /groq: timeout/
    );
    await expect(chatWithFallback(mockRequest, noRetryOptions)).rejects.toThrow(
      /openrouter: network/
    );
  });

  it('CRITICAL: preferred provider Ollama fails, another provider succeeds', async () => {
    // This is the actual bug/requirement we're solving:
    // GRITCH_PROVIDER=ollama → Ollama is preferred
    // Ollama fails at runtime (timeout/connection refused)
    // Another viable provider is attempted
    // Request succeeds if another provider is available
    mockGetActiveProviderId.mockReturnValue('ollama');
    (mockProviders.ollama.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('ECONNREFUSED')
    );
    (mockProviders.groq.chat as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuccessResponse);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await chatWithFallback(mockRequest, noRetryOptions);

    expect(result).toEqual(mockSuccessResponse);
    expect(mockProviders.ollama.chat).toHaveBeenCalledTimes(1);
    expect(mockProviders.groq.chat).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('⚠ ollama unavailable — switching to groq...');

    warnSpy.mockRestore();
  });

  it('original request is passed through unchanged to all providers', async () => {
    mockGetActiveProviderId.mockReturnValue('groq');
    (mockProviders.groq.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('timeout')
    );
    (mockProviders.openrouter.chat as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('network')
    );
    (mockProviders.gemini.chat as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuccessResponse);

    await chatWithFallback(mockRequest, noRetryOptions);

    // Verify the same request object was passed to each provider
    expect(mockProviders.groq.chat).toHaveBeenCalledWith(mockRequest);
    expect(mockProviders.openrouter.chat).toHaveBeenCalledWith(mockRequest);
    expect(mockProviders.gemini.chat).toHaveBeenCalledWith(mockRequest);
  });
});
