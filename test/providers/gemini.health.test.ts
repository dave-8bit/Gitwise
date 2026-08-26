import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('GeminiProvider.health()', () => {
  const originalApiKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.GEMINI_API_KEY = 'test-gemini-key';
  });

  afterEach(() => {
    if (originalApiKey) {
      process.env.GEMINI_API_KEY = originalApiKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
    vi.unstubAllGlobals();
  });

  it('reports ok when the endpoint is reachable', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { GeminiProvider } = await import('../../src/providers/gemini/gemini.provider');
    const result = await new GeminiProvider().health();

    expect(result.provider).toBe('gemini');
    expect(result.status).toBe('ok');
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models?key=test-gemini-key'
    );
  });

  it('reports config failure without network access when the API key is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { GeminiProvider } = await import('../../src/providers/gemini/gemini.provider');
    const result = await new GeminiProvider().health();

    expect(result.status).toBe('config');
    expect(result.errorCode).toBe('missing_api_key');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports auth failure on invalid credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));

    const { GeminiProvider } = await import('../../src/providers/gemini/gemini.provider');
    const result = await new GeminiProvider().health();

    expect(result.status).toBe('auth');
    expect(result.statusCode).toBe(401);
  });

  it('reports unavailable on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')));

    const { GeminiProvider } = await import('../../src/providers/gemini/gemini.provider');
    const result = await new GeminiProvider().health();

    expect(result.status).toBe('unavailable');
    expect(result.errorCode).toBe('network');
  });
});