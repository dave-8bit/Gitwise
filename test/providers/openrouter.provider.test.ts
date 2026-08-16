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

describe('OpenRouterProvider', () => {
  const originalApiKey = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
  });

  afterEach(() => {
    if (originalApiKey) {
      process.env.OPENROUTER_API_KEY = originalApiKey;
    } else {
      delete process.env.OPENROUTER_API_KEY;
    }
    vi.clearAllMocks();
  });

  const mockRequest: AIRequest = {
    systemPrompt: 'You are helpful.',
    userPrompt: 'Hello',
    model: 'openai/gpt-4o-mini',
    maxTokens: 256,
  };

  it('success response returns assembled AI response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          model: 'openai/gpt-4o-mini',
          choices: [{ message: { content: 'Hello from OpenRouter' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 9, completion_tokens: 5, total_tokens: 14 },
        }),
      }),
    );

    const { OpenRouterProvider } = await import('../../src/providers/openrouter/openrouter.provider');
    const provider = new OpenRouterProvider();
    const result = await provider.chat(mockRequest);

    expect(result.content).toBe('Hello from OpenRouter');
    expect(result.metadata?.provider).toBe('openrouter');
    expect(result.metadata?.usage?.promptTokens).toBe(9);
  });

  it('missing API key is normalized as a ProviderError', async () => {
    delete process.env.OPENROUTER_API_KEY;
    const { OpenRouterProvider } = await import('../../src/providers/openrouter/openrouter.provider');
    const provider = new OpenRouterProvider();

    await expectProviderFailure(provider.chat(mockRequest), { provider: 'openrouter', errorCode: 'missing_api_key', isRetriable: false });
  });

  it('HTTP 400 is treated as a config error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: vi.fn().mockResolvedValue('Bad payload'),
      }),
    );

    const { OpenRouterProvider } = await import('../../src/providers/openrouter/openrouter.provider');
    const provider = new OpenRouterProvider();

    await expectProviderFailure(provider.chat(mockRequest), { provider: 'openrouter', errorCode: 'config', isRetriable: false });
  });

  it('HTTP 401 is treated as an auth error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: vi.fn().mockResolvedValue('Bad key'),
      }),
    );

    const { OpenRouterProvider } = await import('../../src/providers/openrouter/openrouter.provider');
    const provider = new OpenRouterProvider();

    await expectProviderFailure(provider.chat(mockRequest), { provider: 'openrouter', errorCode: 'auth', isRetriable: false });
  });

  it('HTTP 429 is treated as a retriable rate-limit error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: vi.fn().mockResolvedValue('Rate limited'),
      }),
    );

    const { OpenRouterProvider } = await import('../../src/providers/openrouter/openrouter.provider');
    const provider = new OpenRouterProvider();

    await expectProviderFailure(provider.chat(mockRequest), { provider: 'openrouter', errorCode: 'ratelimit', isRetriable: true });
  });

  it('HTTP 503 is retriable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: vi.fn().mockResolvedValue('temporary outage'),
      }),
    );

    const { OpenRouterProvider } = await import('../../src/providers/openrouter/openrouter.provider');
    const provider = new OpenRouterProvider();

    await expectProviderFailure(provider.chat(mockRequest), { provider: 'openrouter', errorCode: 'server', isRetriable: true });
  });

  it('network failure is normalized as a retriable ProviderError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')));

    const { OpenRouterProvider } = await import('../../src/providers/openrouter/openrouter.provider');
    const provider = new OpenRouterProvider();

    await expectProviderFailure(provider.chat(mockRequest), { provider: 'openrouter', errorCode: 'network', isRetriable: true });
  });

  it('timeout is normalized as a retriable ProviderError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Request timed out after 30000ms')));

    const { OpenRouterProvider } = await import('../../src/providers/openrouter/openrouter.provider');
    const provider = new OpenRouterProvider();

    await expectProviderFailure(provider.chat(mockRequest), { provider: 'openrouter', errorCode: 'timeout', isRetriable: true });
  });
});
