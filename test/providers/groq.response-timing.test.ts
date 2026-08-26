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

describe('GroqProvider response timing', () => {
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
  });

  const mockRequest: AIRequest = {
    systemPrompt: 'You are helpful.',
    userPrompt: 'Hello',
    model: 'llama-3.3-70b-versatile',
  };

  it('successful response contains numeric non-negative responseTimeMs', async () => {
    mockGroqCreate.mockResolvedValue({
      model: 'llama-3.3-70b-versatile',
      choices: [{ message: { content: 'Hi' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
    });

    const { GroqProvider } = await import('../../src/providers/groq/groq.provider');
    const result = await new GroqProvider().chat(mockRequest);

    expect(result.metadata?.responseTimeMs).toBeDefined();
    expect(typeof result.metadata?.responseTimeMs).toBe('number');
    expect(result.metadata?.responseTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('preserves existing response content and metadata', async () => {
    mockGroqCreate.mockResolvedValue({
      model: 'llama-3.3-70b-versatile',
      choices: [{ message: { content: 'Hi' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
    });

    const { GroqProvider } = await import('../../src/providers/groq/groq.provider');
    const result = await new GroqProvider().chat(mockRequest);

    expect(result.content).toBe('Hi');
    expect(result.metadata?.provider).toBe('groq');
    expect(result.metadata?.model).toBe('llama-3.3-70b-versatile');
    expect(result.metadata?.finishReason).toBe('stop');
    expect(result.metadata?.usage).toEqual({ promptTokens: 5, completionTokens: 2, totalTokens: 7 });
  });

  it('failed request still rejects without breaking ProviderError normalization', async () => {
    mockGroqCreate.mockRejectedValue(new Error('401 unauthorized'));

    const { GroqProvider } = await import('../../src/providers/groq/groq.provider');

    try {
      await new GroqProvider().chat(mockRequest);
      throw new Error('expected rejection');
    } catch (error) {
      expect((error as Record<string, unknown>).errorCode).toBe('auth');
      expect((error as Record<string, unknown>).isRetriable).toBe(false);
    }
  });
});