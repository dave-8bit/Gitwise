import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  missingApiKeyHealthResult,
  probeProviderHealth,
  PROVIDER_HEALTH_TIMEOUT_MS,
  type ProviderHealthResult,
} from '../../../../src/core/ai/helpers/provider-health';

afterEach(() => {
  vi.unstubAllGlobals();
});

function okResponse(): Response {
  return new Response('{}', { status: 200 });
}

function httpStub(status: number): () => Promise<Response> {
  return vi.fn().mockResolvedValue(new Response('', { status }));
}

describe('missingApiKeyHealthResult()', () => {
  it('flags a missing key as a config failure with missing_api_key', () => {
    expect(missingApiKeyHealthResult('groq', 'GROQ_API_KEY')).toEqual({
      provider: 'groq',
      status: 'config',
      errorCode: 'missing_api_key',
      message: 'Missing GROQ_API_KEY',
    });
  });
});

describe('probeProviderHealth()', () => {
  it('reports ok for a 2xx response with non-negative timing', async () => {
    vi.stubGlobal('fetch', httpStub(200));

    const result = await probeProviderHealth({ provider: 'ollama', url: 'http://localhost:11434/api/tags' });

    expect(result.status).toBe('ok');
    expect(result.statusCode).toBe(200);
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('reports auth failure for 401', async () => {
    vi.stubGlobal('fetch', httpStub(401));
    const result = await probeProviderHealth({ provider: 'groq', url: 'https://x/models' });
    expect(result).toMatchObject({ provider: 'groq', status: 'auth', errorCode: 'auth', statusCode: 401 });
  });

  it('reports auth failure for 403', async () => {
    vi.stubGlobal('fetch', httpStub(403));
    const result = await probeProviderHealth({ provider: 'gemini', url: 'https://x/models' });
    expect(result.status).toBe('auth');
  });

  it('reports unavailable for 429 (rate limit)', async () => {
    vi.stubGlobal('fetch', httpStub(429));
    const result = await probeProviderHealth({ provider: 'openrouter', url: 'https://x/models' });
    expect(result.status).toBe('unavailable');
    expect(result.errorCode).toBe('ratelimit');
  });

  it('reports unavailable for a 5xx server error', async () => {
    vi.stubGlobal('fetch', httpStub(503));
    const result = await probeProviderHealth({ provider: 'openrouter', url: 'https://x/models' });
    expect(result.status).toBe('unavailable');
    expect(result.errorCode).toBe('server');
  });

  it('reports config failure for an unexpected 4xx', async () => {
    vi.stubGlobal('fetch', httpStub(404));
    const result = await probeProviderHealth({ provider: 'ollama', url: 'http://localhost:11434/x' });
    expect(result.status).toBe('config');
    expect(result.errorCode).toBe('config');
  });

  it('reports unavailable with network errorCode on a thrown network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const result = await probeProviderHealth({ provider: 'ollama', url: 'http://localhost:11434/api/tags' });
    expect(result.status).toBe('unavailable');
    expect(result.errorCode).toBe('network');
  });

  it('reports unavailable with timeout errorCode on a timed out request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Request timed out')));
    const result = await probeProviderHealth({ provider: 'gemini', url: 'https://x/models' });
    expect(result.status).toBe('unavailable');
    expect(result.errorCode).toBe('timeout');
  });

  it('does not reject — always resolves to a classified result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));
    const result: ProviderHealthResult = await probeProviderHealth({ provider: 'groq', url: 'https://x' });
    expect(result.provider).toBe('groq');
    expect(['ok', 'unavailable', 'auth', 'config']).toContain(result.status);
  });

  it('passes headers through to the underlying fetch call', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);

    await probeProviderHealth({
      provider: 'groq',
      url: 'https://api.groq.com/openai/v1/models',
      headers: { Authorization: 'Bearer k' },
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/models');
    expect(init.method).toBe('GET');
    expect(init.headers).toEqual({ Authorization: 'Bearer k' });
  });

  it('applies PROVIDER_HEALTH_TIMEOUT_MS as the default timeout', async () => {
    expect(PROVIDER_HEALTH_TIMEOUT_MS).toBe(10_000);
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);

    await probeProviderHealth({ provider: 'ollama', url: 'http://localhost:11434/api/tags' });

    // fetchWithTimeout builds a RequestInit with a signal; verify one was attached.
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});