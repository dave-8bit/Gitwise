import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AIRequest } from '../../src/core/ai/ai.types';

/** Returns a successful chat-completion fetch stub appropriate to each provider. */
function okFetchFor(label: string) {
  if (label === 'GeminiProvider') {
    // Gemini's generateContent response shape uses `candidates[].content.parts[].text`.
    return vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        model: 'm1',
        candidates: [
          {
            content: { parts: [{ text: 'Hi' }] },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: {
          promptTokenCount: 5,
          candidatesTokenCount: 2,
          totalTokenCount: 7,
        },
      }),
    });
  }

  // OpenAI-compatible shape used by Groq, OpenRouter, Ollama.
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({
      model: 'm1',
      choices: [{ message: { content: 'Hi' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
    }),
  });
}

interface ResponseTimingCase {
  label: string;
  modulePath: string;
  className: string;
  envKey?: string;
}

const cases: ResponseTimingCase[] = [
  {
    label: 'OpenRouterProvider',
    modulePath: '../../src/providers/openrouter/openrouter.provider',
    className: 'OpenRouterProvider',
    envKey: 'OPENROUTER_API_KEY',
  },
  {
    label: 'GeminiProvider',
    modulePath: '../../src/providers/gemini/gemini.provider',
    className: 'GeminiProvider',
    envKey: 'GEMINI_API_KEY',
  },
  {
    label: 'OllamaProvider',
    modulePath: '../../src/providers/ollama/ollama.provider',
    className: 'OllamaProvider',
  },
];

describe.each(cases)('$label response timing', ({ label, modulePath, className, envKey }) => {
  const originalApiKey = envKey ? process.env[envKey] : undefined;

  beforeEach(() => {
    vi.restoreAllMocks();
    if (envKey) {
      process.env[envKey] = `test-${label.toLowerCase()}-key`;
    }
  });

  afterEach(() => {
    if (envKey) {
      if (originalApiKey) {
        process.env[envKey] = originalApiKey;
      } else {
        delete process.env[envKey];
      }
    }
    vi.unstubAllGlobals();
  });

  const baseRequest: AIRequest = {
    systemPrompt: 'You are helpful.',
    userPrompt: 'Hello',
  };
  const request: AIRequest =
    label === 'GeminiProvider' ? { ...baseRequest, model: 'gemini-1.5-flash' } : baseRequest;

  it('successful response contains numeric non-negative responseTimeMs', async () => {
    vi.stubGlobal('fetch', okFetchFor(label));

    const mod = await import(modulePath);
    const provider = new mod[className]();
    const result = await provider.chat(request);

    expect(result.metadata?.responseTimeMs).toBeDefined();
    expect(typeof result.metadata?.responseTimeMs).toBe('number');
    expect(result.metadata?.responseTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('preserves existing response content and metadata', async () => {
    vi.stubGlobal('fetch', okFetchFor(label));

    const mod = await import(modulePath);
    const provider = new mod[className]();
    const result = await provider.chat(request);

    expect(result.content).toBe('Hi');
    expect(result.metadata?.provider).toBe(label.replace('Provider', '').toLowerCase());
    expect(result.metadata?.model).toBe('m1');
    expect(result.metadata?.finishReason).toBe(label === 'GeminiProvider' ? 'STOP' : 'stop');
    // Canonical usage survives untouched regardless of provider shape.
    expect(result.metadata?.usage).toEqual({ promptTokens: 5, completionTokens: 2, totalTokens: 7 });
  });
});

describe('OllamaProvider response timing failure path', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('network failure is normalized exactly as before', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const { OllamaProvider } = await import('../../src/providers/ollama/ollama.provider');

    try {
      await new OllamaProvider().chat({
        systemPrompt: 's',
        userPrompt: 'u',
        model: 'llama3',
      });
      throw new Error('expected rejection');
    } catch (error) {
      expect((error as Record<string, unknown>).provider).toBe('ollama');
      expect((error as Record<string, unknown>).errorCode).toBe('network');
      expect((error as Record<string, unknown>).isRetriable).toBe(true);
    }
  });
});