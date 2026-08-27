import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ProviderId } from '../../../../src/core/ai/provider.registry';
import { ProviderError } from '../../../../src/core/ai/helpers/provider-error';
import {
  withRetry,
  isRetriableError,
  computeBackoffDelay,
  defaultSleep,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_BASE_DELAY_MS,
  DEFAULT_MAX_DELAY_MS,
  type RetryOptions,
} from '../../../../src/core/ai/helpers/retry';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a no-op sleep that records every computed delay. */
function makeRecordingSleep() {
  const delays: number[] = [];
  const sleep = vi.fn((ms: number) => {
    delays.push(ms);
    return Promise.resolve();
  });
  return { sleep, delays };
}

function makeProviderError(
  errorCode: string,
  isRetriable: boolean,
  provider: ProviderId = 'groq',
  message = 'test error',
): ProviderError {
  return new ProviderError({ provider, message, errorCode, isRetriable });
}

// ---------------------------------------------------------------------------
// Constants & configuration
// ---------------------------------------------------------------------------

describe('retry policy defaults', () => {
  it('exposes a bounded max-attempts constant', () => {
    expect(DEFAULT_MAX_ATTEMPTS).toBe(3);
  });

  it('exposes a bounded base delay', () => {
    expect(DEFAULT_BASE_DELAY_MS).toBe(100);
  });

  it('exposes a bounded max delay', () => {
    expect(DEFAULT_MAX_DELAY_MS).toBe(1_000);
  });

  it('RetryOptions interface is exported for downstream use', () => {
    const opts: RetryOptions = { maxAttempts: 1, sleep: () => Promise.resolve() };
    expect(opts.maxAttempts).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// computeBackoffDelay
// ---------------------------------------------------------------------------

describe('computeBackoffDelay()', () => {
  it('returns 0 for attempt 0 when base is 0', () => {
    expect(computeBackoffDelay(0, 0, 1000)).toBe(0);
  });

  it('uses exponential growth: attempt 0 = base, attempt 1 = 2x base, attempt 2 = 4x base', () => {
    expect(computeBackoffDelay(0, 100, 1000)).toBe(100);
    expect(computeBackoffDelay(1, 100, 1000)).toBe(200);
    expect(computeBackoffDelay(2, 100, 1000)).toBe(400);
  });

  it('clamps to maxDelayMs', () => {
    expect(computeBackoffDelay(3, 100, 1000)).toBe(800);
    expect(computeBackoffDelay(4, 100, 1000)).toBe(1000);
    expect(computeBackoffDelay(10, 100, 1000)).toBe(1000);
  });

  it('never returns a negative delay', () => {
    expect(computeBackoffDelay(0, 0, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// defaultSleep
// ---------------------------------------------------------------------------

describe('defaultSleep()', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a Promise that resolves exactly once via a single setTimeout', async () => {
    vi.useFakeTimers();
    const resolveSpy = vi.fn();
    const promise = defaultSleep(50).then(resolveSpy);

    // A delay is scheduled as exactly one timeout (never an interval).
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(50);
    await promise;

    // The promise fired once and left no lingering timer behind.
    expect(resolveSpy).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('resolves with undefined after the delay', async () => {
    vi.useFakeTimers();

    const promise = defaultSleep(10);
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(10);
    await expect(promise).resolves.toBeUndefined();
  });

  it('defaultSleep(0) schedules a single timeout and resolves', async () => {
    vi.useFakeTimers();

    const promise = defaultSleep(0).then(() => 'done');
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(0);
    await expect(promise).resolves.toBe('done');
  });
});

// ---------------------------------------------------------------------------
// withRetry — success paths
// ---------------------------------------------------------------------------

describe('withRetry — success', () => {
  it('1. successful request on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const { sleep } = makeRecordingSleep();

    const result = await withRetry(fn, { sleep });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('2. transient failure followed by success', async () => {
    const { sleep, delays } = makeRecordingSleep();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce('ok');

    const result = await withRetry(fn, { sleep });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(delays).toEqual([DEFAULT_BASE_DELAY_MS]);
  });

  it('3. multiple transient failures followed by success', async () => {
    const { sleep, delays } = makeRecordingSleep();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockRejectedValueOnce(new Error('503 service unavailable'))
      .mockResolvedValueOnce('ok');

    const result = await withRetry(fn, { sleep });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(delays).toEqual([DEFAULT_BASE_DELAY_MS, DEFAULT_BASE_DELAY_MS * 2]);
  });
});

// ---------------------------------------------------------------------------
// withRetry — exhaustion
// ---------------------------------------------------------------------------

describe('withRetry — retry exhaustion', () => {
  it('4. retry exhaustion throws the last error', async () => {
    const { sleep } = makeRecordingSleep();
    const fn = vi.fn().mockRejectedValue(new Error('503 service unavailable'));

    await expect(withRetry(fn, { sleep })).rejects.toThrow('503 service unavailable');
    expect(fn).toHaveBeenCalledTimes(DEFAULT_MAX_ATTEMPTS);
    expect(sleep).toHaveBeenCalledTimes(DEFAULT_MAX_ATTEMPTS - 1);
  });

  it('16. final error after exhaustion preserves ProviderError context', async () => {
    const { sleep } = makeRecordingSleep();
    const original = makeProviderError('server', true, 'groq', '503 Service Unavailable');
    const fn = vi.fn().mockRejectedValue(original);

    try {
      await withRetry(fn, { sleep });
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBe(original); // same object, not wrapped
      expect((error as ProviderError).errorCode).toBe('server');
      expect((error as ProviderError).provider).toBe('groq');
      expect((error as ProviderError).isRetriable).toBe(true);
      expect((error as ProviderError).message).toBe('503 Service Unavailable');
    }

    expect(fn).toHaveBeenCalledTimes(DEFAULT_MAX_ATTEMPTS);
  });
});

// ---------------------------------------------------------------------------
// withRetry — non-retryable errors
// ---------------------------------------------------------------------------

describe('withRetry — non-retryable errors (fail fast)', () => {
  it('5. non-retryable error is not retried', async () => {
    const { sleep } = makeRecordingSleep();
    const fn = vi.fn().mockRejectedValue(new Error('400 Bad Request'));

    await expect(withRetry(fn, { sleep })).rejects.toThrow('400 Bad Request');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('6. missing API key is not retried', async () => {
    const { sleep } = makeRecordingSleep();
    const fn = vi.fn().mockRejectedValue(
      makeProviderError('missing_api_key', false, 'groq', 'Missing GROQ_API_KEY')
    );

    await expect(withRetry(fn, { sleep })).rejects.toThrow('Missing GROQ_API_KEY');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('7. authentication failure is not retried', async () => {
    const { sleep } = makeRecordingSleep();
    const fn = vi.fn().mockRejectedValue(
      makeProviderError('auth', false, 'gemini', '401 Unauthorized')
    );

    await expect(withRetry(fn, { sleep })).rejects.toThrow('401 Unauthorized');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('8. invalid request / permanent 4xx is not retried', async () => {
    const { sleep } = makeRecordingSleep();
    const fn = vi.fn().mockRejectedValue(
      makeProviderError('config', false, 'openrouter', 'OpenRouter request failed: 400 Bad Request')
    );

    await expect(withRetry(fn, { sleep })).rejects.toThrow('400 Bad Request');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// withRetry — retryable errors
// ---------------------------------------------------------------------------

describe('withRetry — retryable errors', () => {
  it('9. 429 rate limit is retried', async () => {
    const { sleep } = makeRecordingSleep();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(makeProviderError('ratelimit', true, 'groq', '429 Too Many Requests'))
      .mockResolvedValueOnce('ok');

    const result = await withRetry(fn, { sleep });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('10. 5xx server error is retried', async () => {
    const { sleep } = makeRecordingSleep();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(makeProviderError('server', true, 'gemini', '503 Service Unavailable'))
      .mockResolvedValueOnce('ok');

    const result = await withRetry(fn, { sleep });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('11. network error is retried', async () => {
    const { sleep } = makeRecordingSleep();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(makeProviderError('network', true, 'openrouter', 'fetch failed'))
      .mockResolvedValueOnce('ok');

    const result = await withRetry(fn, { sleep });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('12. timeout is retried', async () => {
    const { sleep } = makeRecordingSleep();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(makeProviderError('timeout', true, 'ollama', 'Request timed out after 30000ms'))
      .mockResolvedValueOnce('ok');

    const result = await withRetry(fn, { sleep });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('12b. plain Error with "timed out" message is retried', async () => {
    const { sleep } = makeRecordingSleep();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Request timed out after 30000ms'))
      .mockResolvedValueOnce('ok');

    const result = await withRetry(fn, { sleep });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// withRetry — bounded behaviour
// ---------------------------------------------------------------------------

describe('withRetry — bounds and backoff', () => {
  it('13. maximum attempt bound is respected', async () => {
    const { sleep } = makeRecordingSleep();
    // Custom policy: maxAttempts=5, always fails
    const fn = vi.fn().mockRejectedValue(new Error('transient'));

    await expect(withRetry(fn, { sleep, maxAttempts: 5 })).rejects.toThrow('transient');
    expect(fn).toHaveBeenCalledTimes(5);
    expect(sleep).toHaveBeenCalledTimes(4);
  });

  it('13b. maxAttempts=1 means no retry (single attempt)', async () => {
    const { sleep } = makeRecordingSleep();
    const fn = vi.fn().mockRejectedValue(new Error('transient'));

    await expect(withRetry(fn, { sleep, maxAttempts: 1 })).rejects.toThrow('transient');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('14. backoff is applied correctly between retries', async () => {
    const { sleep, delays } = makeRecordingSleep();
    const fn = vi.fn().mockRejectedValue(new Error('503 service unavailable'));

    await expect(withRetry(fn, { sleep, maxAttempts: 3 })).rejects.toThrow();

    // With maxAttempts=3: 2 sleeps between 3 attempts.
    // attempt 0 → baseDelayMs * 2^0 = 100
    // attempt 1 → baseDelayMs * 2^1 = 200
    expect(delays).toEqual([100, 200]);
  });

  it('14b. backoff respects custom base and max delay', async () => {
    const { sleep, delays } = makeRecordingSleep();
    const fn = vi.fn().mockRejectedValue(new Error('transient'));

    await withRetry(fn, {
      sleep,
      maxAttempts: 5,
      baseDelayMs: 50,
      maxDelayMs: 150,
    }).catch(() => {});

    // 4 delays: 50, 100, 150 (capped), 150 (capped)
    expect(delays).toEqual([50, 100, 150, 150]);
  });

  it('15. does not actually sleep when sleep is injected as no-op', async () => {
    const start = Date.now();
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fn = vi.fn().mockRejectedValue(new Error('503 service unavailable'));

    await expect(withRetry(fn, { sleep, maxAttempts: 3 })).rejects.toThrow();

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50); // no real sleeping
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// withRetry — mixed scenarios
// ---------------------------------------------------------------------------

describe('withRetry — mixed scenarios', () => {
  it('does not retry after a non-retryable error even if it appears after retryable ones', async () => {
    const { sleep } = makeRecordingSleep();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('503 service unavailable')) // retryable
      .mockRejectedValueOnce(new Error('401 unauthorized')) // NOT retryable
      .mockResolvedValueOnce('ok')
      .mockResolvedValueOnce('ok');

    await expect(withRetry(fn, { sleep })).rejects.toThrow('401');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1); // only one sleep before the 401
  });

  it('throws immediately on non-retryable error before any retry', async () => {
    const { sleep } = makeRecordingSleep();
    const fn = vi.fn().mockRejectedValue(new Error('400 Bad Request'));

    await expect(withRetry(fn, { sleep })).rejects.toThrow('400');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('propagates the error from the successful attempt, not a prior failure', async () => {
    const { sleep } = makeRecordingSleep();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('503 service unavailable'))
      .mockResolvedValueOnce('recovered');

    const result = await withRetry(fn, { sleep });
    expect(result).toBe('recovered');
  });
});

// ---------------------------------------------------------------------------
// isRetriableError — classification
// ---------------------------------------------------------------------------

describe('isRetriableError', () => {
  it('returns true for ProviderError with isRetriable=true', () => {
    expect(isRetriableError(makeProviderError('network', true))).toBe(true);
    expect(isRetriableError(makeProviderError('timeout', true))).toBe(true);
    expect(isRetriableError(makeProviderError('ratelimit', true))).toBe(true);
    expect(isRetriableError(makeProviderError('server', true))).toBe(true);
  });

  it('returns false for ProviderError with isRetriable=false', () => {
    expect(isRetriableError(makeProviderError('missing_api_key', false))).toBe(false);
    expect(isRetriableError(makeProviderError('auth', false))).toBe(false);
    expect(isRetriableError(makeProviderError('config', false))).toBe(false);
  });

  it('classifies plain Error timeout messages as retryable', () => {
    expect(isRetriableError(new Error('Request timed out after 30000ms'))).toBe(true);
    expect(isRetriableError(new Error('The operation was aborted.'))).toBe(true);
  });

  it('classifies plain Error network messages as retryable', () => {
    expect(isRetriableError(new Error('ECONNREFUSED'))).toBe(true);
    expect(isRetriableError(new Error('fetch failed'))).toBe(true);
  });

  it('classifies plain Error 429 messages as retryable', () => {
    expect(isRetriableError(new Error('429 Too Many Requests'))).toBe(true);
  });

  it('classifies plain Error 5xx messages as retryable', () => {
    expect(isRetriableError(new Error('502 Bad Gateway'))).toBe(true);
    expect(isRetriableError(new Error('503 Service Unavailable'))).toBe(true);
  });

  it('classifies plain Error auth messages as non-retryable', () => {
    expect(isRetriableError(new Error('401 Unauthorized'))).toBe(false);
    expect(isRetriableError(new Error('403 Forbidden'))).toBe(false);
  });

  it('classifies plain Error 400 messages as non-retryable', () => {
    expect(isRetriableError(new Error('400 Bad Request'))).toBe(false);
  });

  it('classifies missing API key messages as non-retryable', () => {
    expect(isRetriableError(new Error('Missing GROQ_API_KEY'))).toBe(false);
  });

  it('classifies unclassifiable messages as retryable (resilient default)', () => {
    expect(isRetriableError(new Error('something weird happened'))).toBe(true);
    expect(isRetriableError(new Error('random failure'))).toBe(true);
  });
});