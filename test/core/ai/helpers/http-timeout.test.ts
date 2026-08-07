import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_FETCH_TIMEOUT_MS,
  fetchWithTimeout,
} from '../../../../src/core/ai/helpers/http-timeout';

/**
 * Builds a fetch stub that stays pending until the attached signal aborts,
 * then rejects with an AbortError. This simulates a request that hangs and is
 * cancelled by the timeout without performing any real network I/O.
 */
function hangingFetchStub() {
  return vi.fn((_url: string, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      });
    });
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('DEFAULT_FETCH_TIMEOUT_MS', () => {
  it('exports a shared default timeout constant', () => {
    expect(DEFAULT_FETCH_TIMEOUT_MS).toBe(30_000);
  });
});

describe('fetchWithTimeout()', () => {
  it('resolves with the fetch response on a successful request', async () => {
    const response = new Response('ok', { status: 200 });
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchWithTimeout('https://example.com', { method: 'GET' }, 1000);

    expect(result).toBe(response);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('passes the url and init through to fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);

    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    };

    await fetchWithTimeout('https://example.com', init, 1000);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }),
    );
  });

  it('attaches an abort signal to the underlying fetch call', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);

    await fetchWithTimeout('https://example.com', {}, 1000);

    const calledInit = fetchMock.mock.calls[0][1] as RequestInit;
    expect(calledInit.signal).toBeInstanceOf(AbortSignal);
  });

  it('honors a caller-provided signal without creating a timeout signal', async () => {
    const signal = new AbortController().signal;
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);

    const init: RequestInit = { signal };
    await fetchWithTimeout('https://example.com', init, 500);

    // The exact init (including the caller's signal) is passed straight through.
    expect(fetchMock).toHaveBeenCalledWith('https://example.com', init);
  });

  it('propagates non-timeout fetch errors unchanged', async () => {
    const networkError = new Error('network down');
    const fetchMock = vi.fn().mockRejectedValue(networkError);
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchWithTimeout('https://example.com', {}, 1000)).rejects.toBe(networkError);
  });

  it('aborts and throws a readable timeout error when the request times out', async () => {
    vi.useFakeTimers();
    const fetchMock = hangingFetchStub();
    vi.stubGlobal('fetch', fetchMock);

    const promise = fetchWithTimeout('https://example.com', {}, 1000);
    // Attach the rejection handler before firing the timer so the rejection
    // is never observed as unhandled.
    const expectation = expect(promise).rejects.toThrow(
      'Request timed out after 1000ms: https://example.com',
    );

    await vi.advanceTimersByTimeAsync(1001);
    await expectation;
  });

  it('uses the custom timeout when an override is provided', async () => {
    vi.useFakeTimers();
    const fetchMock = hangingFetchStub();
    vi.stubGlobal('fetch', fetchMock);

    const promise = fetchWithTimeout('https://example.com', {}, 500);
    const expectation = expect(promise).rejects.toThrow(
      'Request timed out after 500ms: https://example.com',
    );

    await vi.advanceTimersByTimeAsync(499);

    // Not timed out yet before the custom timeout elapses.
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2);
    await expectation;
  });

  it('uses the default timeout when no override is given', async () => {
    vi.useFakeTimers();
    const fetchMock = hangingFetchStub();
    vi.stubGlobal('fetch', fetchMock);

    const promise = fetchWithTimeout('https://example.com', {});
    const expectation = expect(promise).rejects.toThrow(
      `Request timed out after ${DEFAULT_FETCH_TIMEOUT_MS}ms: https://example.com`,
    );

    await vi.advanceTimersByTimeAsync(DEFAULT_FETCH_TIMEOUT_MS + 1);
    await expectation;
  });

  it('clears the timeout timer after a successful request', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);

    await fetchWithTimeout('https://example.com', {}, 1000);

    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears the timeout timer after a non-timeout error', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchWithTimeout('https://example.com', {}, 1000)).rejects.toThrow(
      'network down',
    );

    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears the timeout timer after a timeout abort', async () => {
    vi.useFakeTimers();
    const fetchMock = hangingFetchStub();
    vi.stubGlobal('fetch', fetchMock);

    const promise = fetchWithTimeout('https://example.com', {}, 1000);
    const expectation = expect(promise).rejects.toThrow('timed out');

    await vi.advanceTimersByTimeAsync(1001);
    await expectation;

    expect(vi.getTimerCount()).toBe(0);
  });
});

