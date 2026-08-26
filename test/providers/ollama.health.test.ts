import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('OllamaProvider.health()', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports ok without requiring an API key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { OllamaProvider } = await import('../../src/providers/ollama/ollama.provider');
    const result = await new OllamaProvider().health();

    expect(result.provider).toBe('ollama');
    expect(result.status).toBe('ok');
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:11434/api/tags');
  });

  it('issues a lightweight GET to the tags endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { OllamaProvider } = await import('../../src/providers/ollama/ollama.provider');
    await new OllamaProvider().health();

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('GET');
  });

  it('reports unavailable on connection refused', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const { OllamaProvider } = await import('../../src/providers/ollama/ollama.provider');
    const result = await new OllamaProvider().health();

    expect(result.status).toBe('unavailable');
    expect(result.errorCode).toBe('network');
  });

  it('reports unavailable on timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Request timed out after 10000ms'))
    );

    const { OllamaProvider } = await import('../../src/providers/ollama/ollama.provider');
    const result = await new OllamaProvider().health();

    expect(result.status).toBe('unavailable');
    expect(result.errorCode).toBe('timeout');
  });

  it('reports config failure on unexpected client error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));

    const { OllamaProvider } = await import('../../src/providers/ollama/ollama.provider');
    const result = await new OllamaProvider().health();

    expect(result.status).toBe('config');
    expect(result.statusCode).toBe(404);
  });
});