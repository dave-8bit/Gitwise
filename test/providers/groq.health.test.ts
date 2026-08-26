import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Groq health checks use fetch against its models endpoint (SDK is not involved).
describe('GroqProvider.health()', () => {
  const originalApiKey = process.env.GROQ_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.GROQ_API_KEY = 'test-groq-key';
  });

  afterEach(() => {
    if (originalApiKey) {
      process.env.GROQ_API_KEY = originalApiKey;
    } else {
      delete process.env.GROQ_API_KEY;
    }
    vi.unstubAllGlobals();
  });

  it('reports ok when the endpoint is reachable', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { GroqProvider } = await import('../../src/providers/groq/groq.provider');
    const result = await new GroqProvider().health();

    expect(result.provider).toBe('groq');
    expect(result.status).toBe('ok');
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.groq.com/openai/v1/models');
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toEqual({
      Authorization: 'Bearer test-groq-key',
    });
  });

  it('never performs an AI generation request', async () => {
    const mockGroqCreate = vi.fn();
    vi.doMock('groq-sdk', () => ({
      default: class {
        chat = { completions: { create: mockGroqCreate } };
      },
    }));

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));

    try {
      const { GroqProvider } = await import('../../src/providers/groq/groq.provider');
      await new GroqProvider().health();
      expect(mockGroqCreate).not.toHaveBeenCalled();
    } finally {
      vi.doUnmock('groq-sdk');
    }
  });

  it('reports config failure without network access when the API key is missing', async () => {
    delete process.env.GROQ_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { GroqProvider } = await import('../../src/providers/groq/groq.provider');
    const result = await new GroqProvider().health();

    expect(result.status).toBe('config');
    expect(result.errorCode).toBe('missing_api_key');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports auth failure on invalid credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));

    const { GroqProvider } = await import('../../src/providers/groq/groq.provider');
    const result = await new GroqProvider().health();

    expect(result.status).toBe('auth');
    expect(result.statusCode).toBe(401);
  });

  it('reports unavailable on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const { GroqProvider } = await import('../../src/providers/groq/groq.provider');
    const result = await new GroqProvider().health();

    expect(result.status).toBe('unavailable');
    expect(result.errorCode).toBe('network');
  });
});