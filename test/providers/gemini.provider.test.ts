import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AIRequest } from '../../src/core/ai/ai.types';

function expectProviderFailure(
  promise: Promise<unknown>,
  expected: { provider: string; errorCode?: string; isRetriable?: boolean },
) {
  return promise.then(
    () => {
      throw new Error('Expected promise to reject');
    },
    (error: unknown) => {
      expect(error).toBeInstanceOf(Error);
      expect((error as Record<string, unknown>).provider).toBe(expected.provider);
      if (expected.errorCode) {
        expect((error as Record<string, unknown>).errorCode).toBe(expected.errorCode);
      }
      if (typeof expected.isRetriable === 'boolean') {
        expect((error as Record<string, unknown>).isRetriable).toBe(expected.isRetriable);
      }
    },
  );
}

describe('GeminiProvider', () => {
  const originalApiKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-gemini-key';
  });

  afterEach(() => {
    if (originalApiKey) {
      process.env.GEMINI_API_KEY = originalApiKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
    vi.clearAllMocks();
  });

  const mockRequest: AIRequest = {
    systemPrompt: 'You are helpful.',
    userPrompt: 'Hello',
    model: 'gemini-1.5-flash',
    maxTokens: 256,
  };

  it('success response returns assembled AI response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{
            content: { parts: [{ text: 'Hello from Gemini' }] },
            finishReason: 'STOP',
          }],
          usageMetadata: {
            promptTokenCount: 12,
            candidatesTokenCount: 5,
            totalTokenCount: 17,
          },
        }),
      }),
    );

    const { GeminiProvider } = await import('../../src/providers/gemini/gemini.provider');
    const provider = new GeminiProvider();
    const result = await provider.chat(mockRequest);

    expect(result.content).toBe('Hello from Gemini');
    expect(result.metadata?.provider).toBe('gemini');
    expect(result.metadata?.usage?.promptTokens).toBe(12);
  });

  it('missing API key is normalized as a ProviderError', async () => {
    delete process.env.GEMINI_API_KEY;
    const { GeminiProvider } = await import('../../src/providers/gemini/gemini.provider');
    const provider = new GeminiProvider();

    await expectProviderFailure(provider.chat(mockRequest), { provider: 'gemini', errorCode: 'missing_api_key', isRetriable: false });
  });

  it('HTTP 400 is treated as a config error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: vi.fn().mockResolvedValue('Bad request payload'),
      }),
    );

    const { GeminiProvider } = await import('../../src/providers/gemini/gemini.provider');
    const provider = new GeminiProvider();

    await expectProviderFailure(provider.chat(mockRequest), { provider: 'gemini', errorCode: 'config', isRetriable: false });
  });

  it('unauthorized response is treated as auth error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: vi.fn().mockResolvedValue('Invalid API key'),
      }),
    );

    const { GeminiProvider } = await import('../../src/providers/gemini/gemini.provider');
    const provider = new GeminiProvider();

    await expectProviderFailure(provider.chat(mockRequest), { provider: 'gemini', errorCode: 'auth', isRetriable: false });
  });

  it('rate limit response is retriable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: vi.fn().mockResolvedValue('Rate limit reached'),
      }),
    );

    const { GeminiProvider } = await import('../../src/providers/gemini/gemini.provider');
    const provider = new GeminiProvider();

    await expectProviderFailure(provider.chat(mockRequest), { provider: 'gemini', errorCode: 'ratelimit', isRetriable: true });
  });

  it('5xx response is retriable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: vi.fn().mockResolvedValue('Temporary outage'),
      }),
    );

    const { GeminiProvider } = await import('../../src/providers/gemini/gemini.provider');
    const provider = new GeminiProvider();

    await expectProviderFailure(provider.chat(mockRequest), { provider: 'gemini', errorCode: 'server', isRetriable: true });
  });

  it('network failure is normalized as a retriable ProviderError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')));

    const { GeminiProvider } = await import('../../src/providers/gemini/gemini.provider');
    const provider = new GeminiProvider();

    await expectProviderFailure(provider.chat(mockRequest), { provider: 'gemini', errorCode: 'network', isRetriable: true });
  });

  it('timeout is normalized as a retriable ProviderError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Request timed out after 30000ms')));

    const { GeminiProvider } = await import('../../src/providers/gemini/gemini.provider');
    const provider = new GeminiProvider();

    await expectProviderFailure(provider.chat(mockRequest), { provider: 'gemini', errorCode: 'timeout', isRetriable: true });
  });
});
