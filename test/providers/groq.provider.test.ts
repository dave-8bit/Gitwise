import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AIRequest } from '../../src/core/ai/ai.types';

const mockGroqCreate = vi.hoisted(() => vi.fn());

vi.mock('groq-sdk', () => ({
  default: class {
    chat = {
      completions: {
        create: mockGroqCreate,
      },
    };
  },
}));

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

describe('GroqProvider', () => {
  const originalApiKey = process.env.GROQ_API_KEY;

  beforeEach(() => {
    mockGroqCreate.mockReset();
    process.env.GROQ_API_KEY = 'test-groq-key';
  });

  afterEach(() => {
    if (originalApiKey) {
      process.env.GROQ_API_KEY = originalApiKey;
    } else {
      delete process.env.GROQ_API_KEY;
    }
    mockGroqCreate.mockReset();
  });

  const mockRequest: AIRequest = {
    systemPrompt: 'You are helpful.',
    userPrompt: 'Hello',
    model: 'llama-3.3-70b-versatile',
    maxTokens: 256,
  };

  it('success response returns assembled AI response', async () => {
    mockGroqCreate.mockResolvedValue({
      model: 'llama-3.3-70b-versatile',
      choices: [{ message: { content: 'Hello from Groq' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 11, completion_tokens: 6, total_tokens: 17 },
    });

    const { GroqProvider } = await import('../../src/providers/groq/groq.provider');
    const provider = new GroqProvider();
    const result = await provider.chat(mockRequest);

    expect(result.content).toBe('Hello from Groq');
    expect(result.metadata?.provider).toBe('groq');
    expect(result.metadata?.usage?.promptTokens).toBe(11);
  });

  it('missing API key is normalized as a ProviderError', async () => {
    delete process.env.GROQ_API_KEY;
    const { GroqProvider } = await import('../../src/providers/groq/groq.provider');
    const provider = new GroqProvider();

    await expectProviderFailure(provider.chat(mockRequest), { provider: 'groq', errorCode: 'missing_api_key', isRetriable: false });
  });

  it('401 auth error is normalized', async () => {
    mockGroqCreate.mockRejectedValue(new Error('401 unauthorized'));
    const { GroqProvider } = await import('../../src/providers/groq/groq.provider');
    const provider = new GroqProvider();

    await expectProviderFailure(provider.chat(mockRequest), { provider: 'groq', errorCode: 'auth', isRetriable: false });
  });

  it('429 rate limit is retriable', async () => {
    mockGroqCreate.mockRejectedValue(new Error('429 too many requests'));
    const { GroqProvider } = await import('../../src/providers/groq/groq.provider');
    const provider = new GroqProvider();

    await expectProviderFailure(provider.chat(mockRequest), { provider: 'groq', errorCode: 'ratelimit', isRetriable: true });
  });

  it('5xx server errors are retriable', async () => {
    mockGroqCreate.mockRejectedValue(new Error('503 service unavailable'));
    const { GroqProvider } = await import('../../src/providers/groq/groq.provider');
    const provider = new GroqProvider();

    await expectProviderFailure(provider.chat(mockRequest), { provider: 'groq', errorCode: 'server', isRetriable: true });
  });

  it('network failure is normalized as a retriable ProviderError', async () => {
    mockGroqCreate.mockRejectedValue(new Error('ECONNREFUSED'));
    const { GroqProvider } = await import('../../src/providers/groq/groq.provider');
    const provider = new GroqProvider();

    await expectProviderFailure(provider.chat(mockRequest), { provider: 'groq', errorCode: 'network', isRetriable: true });
  });

  it('timeout is normalized as a retriable ProviderError', async () => {
    mockGroqCreate.mockRejectedValue(new Error('Request timed out after 30000ms'));
    const { GroqProvider } = await import('../../src/providers/groq/groq.provider');
    const provider = new GroqProvider();

    await expectProviderFailure(provider.chat(mockRequest), { provider: 'groq', errorCode: 'timeout', isRetriable: true });
  });
});
