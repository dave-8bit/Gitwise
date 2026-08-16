import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AIRequest } from '../../src/core/ai/ai.types';
import { ProviderError } from '../../src/core/ai/helpers/provider-error';

describe('OllamaProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  const mockRequest: AIRequest = {
    systemPrompt: 'You are helpful.',
    userPrompt: 'Hello',
    model: 'llama3',
    maxTokens: 256,
  };

  it('success response returns assembled AI response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          model: 'llama3',
          choices: [{ message: { content: 'Hello from Ollama' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
        }),
      }),
    );

    const { OllamaProvider } = await import('../../src/providers/ollama/ollama.provider');
    const provider = new OllamaProvider();
    const result = await provider.chat(mockRequest);

    expect(result.content).toBe('Hello from Ollama');
    expect(result.metadata?.provider).toBe('ollama');
    expect(result.metadata?.usage?.promptTokens).toBe(10);
  });

  it('connection refused is normalized as a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const { OllamaProvider } = await import('../../src/providers/ollama/ollama.provider');
    const provider = new OllamaProvider();

    await expect(provider.chat(mockRequest)).rejects.toBeInstanceOf(ProviderError);
    try {
      await provider.chat(mockRequest);
    } catch (error) {
      if (error instanceof ProviderError) {
        expect(error.provider).toBe('ollama');
        expect(error.errorCode).toBe('network');
        expect(error.isRetriable).toBe(true);
      }
    }
  });

  it('timeout is normalized as a timeout error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Request timed out after 30000ms')));

    const { OllamaProvider } = await import('../../src/providers/ollama/ollama.provider');
    const provider = new OllamaProvider();

    await expect(provider.chat(mockRequest)).rejects.toBeInstanceOf(ProviderError);
    try {
      await provider.chat(mockRequest);
    } catch (error) {
      if (error instanceof ProviderError) {
        expect(error.provider).toBe('ollama');
        expect(error.errorCode).toBe('timeout');
        expect(error.isRetriable).toBe(true);
      }
    }
  });

  it('HTTP error response is surfaced as a ProviderError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: vi.fn().mockResolvedValue('Ollama crashed'),
      }),
    );

    const { OllamaProvider } = await import('../../src/providers/ollama/ollama.provider');
    const provider = new OllamaProvider();

    await expect(provider.chat(mockRequest)).rejects.toBeInstanceOf(ProviderError);
    try {
      await provider.chat(mockRequest);
    } catch (error) {
      if (error instanceof ProviderError) {
        expect(error.provider).toBe('ollama');
        expect(error.errorCode).toBe('server');
        expect(error.isRetriable).toBe(true);
      }
    }
  });
});
