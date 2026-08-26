import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('OpenRouterProvider.health()', () => {
  const originalApiKey = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
  });

  afterEach(() => {
    if (originalApiKey) {
      process.env.OPENROUTER_API_KEY = originalApiKey;
    } else {
      delete process.env.OPENROUTER_API_KEY;
    }
    vi.unstubAllGlobals();
  });

  it('reports ok when the endpoint is reachable', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { OpenRouterProvider } = await import('../../src/providers/openrouter/openrouter.provider');
    const result = await new OpenRouterProvider().health();

    expect(result.provider).toBe('openrouter');
    expect(result.status).toBe('ok');
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(fetchMock.mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/models');
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toEqual({
      Authorization: 'Bearer test-openrouter-key',
    });
  });

  it('issues a lightweight GET, not a chat completion POST', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { OpenRouterProvider } = await import('../../src/providers/openrouter/openrouter.provider');
    await new OpenRouterProvider().health();

    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('GET');
  });

  it('reports config failure without network access when the API key is missing', async () => {
    delete process.env.OPENROUTER_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { OpenRouterProvider } = await import('../../src/providers/openrouter/openrouter.provider');
    const result = await new OpenRouterProvider().health();

    expect(result.status).toBe('config');
    expect(result.errorCode).toBe('missing_api_key');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports auth failure on invalid credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 403 })));

    const { OpenRouterProvider } = await import('../../src/providers/openrouter/openrouter.provider');
    const result = await new OpenRouterProvider().health();

    expect(result.status).toBe('auth');
    expect(result.statusCode).toBe(403);
  });

  it('reports unavailable when the service errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));

    const { OpenRouterProvider } = await import('../../src/providers/openrouter/openrouter.provider');
    const result = await new OpenRouterProvider().health();

    expect(result.status).toBe('unavailable');
    expect(result.errorCode).toBe('server');
  });

  it('reports unavailable on timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Request timed out after 10000ms'))
    );

    const { OpenRouterProvider } = await import('../../src/providers/openrouter/openrouter.provider');
    const result = await new OpenRouterProvider().health();

    expect(result.status).toBe('unavailable');
    expect(result.errorCode).toBe('timeout');
  });
});