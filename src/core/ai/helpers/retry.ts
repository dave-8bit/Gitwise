import { ProviderError } from './provider-error';

/**
 * Default retry policy constants.
 *
 * These values form the canonical, bounded retry policy used by the
 * provider orchestrator. They are exported so tests and callers can
 * reference the exact policy in assertions.
 */
export const DEFAULT_MAX_ATTEMPTS = 3;
export const DEFAULT_BASE_DELAY_MS = 100;
export const DEFAULT_MAX_DELAY_MS = 1_000;

export interface RetryOptions {
  /**
   * Maximum number of attempts, **including** the first try.
   * Default: {@link DEFAULT_MAX_ATTEMPTS} (3 => 1 initial + 2 retries).
   */
  maxAttempts?: number;
  /**
   * Base delay in milliseconds for the exponential backoff formula.
   * Default: {@link DEFAULT_BASE_DELAY_MS} (100).
   */
  baseDelayMs?: number;
  /**
   * Upper bound (ms) on any single backoff delay.
   * Default: {@link DEFAULT_MAX_DELAY_MS} (1_000).
   */
  maxDelayMs?: number;
  /**
   * Injectable sleep so tests can avoid real delays.
   * Receives the computed delay in milliseconds.
   */
  sleep?: (ms: number) => Promise<void>;
  /**
   * Classification of whether an error merits a retry.
   * Defaults to {@link isRetriableError}.
   */
  isRetryable?: (error: unknown) => boolean;
}

/**
 * Computes the backoff delay (ms) before the attempt-th retry.
 *
 * attempt is 0-indexed:
 *   0 => delay before the 2nd attempt (first retry)
 *   1 => delay before the 3rd attempt (second retry)
 *
 * Formula: baseDelayMs * 2^attempt, clamped to [0, maxDelayMs].
 *
 * Example (baseDelayMs=100, maxDelayMs=1000):
 *   attempt 0 => 100ms
 *   attempt 1 => 200ms
 *   attempt 2 => 400ms
 *
 * No jitter is applied -- delays are deterministic and fully controllable in
 * tests via RetryOptions.sleep.
 */
export function computeBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  const delay = baseDelayMs * Math.pow(2, attempt);
  return Math.min(Math.max(0, delay), maxDelayMs);
}

/**
 * Default sleep implementation using setTimeout.
 *
 * Tests inject their own sleep via RetryOptions.sleep to avoid
 * real delays.
 */
export function defaultSleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Classifies whether an error represents a transient failure that should
 * be retried.
 *
 * Reuses the canonical ProviderError.isRetriable flag when the error is a
 * structured ProviderError. For plain Error instances, applies the same
 * string-pattern classification the orchestrator already uses for fallback
 * decisions, so retry and fallback share a single source of truth.
 *
 * Retryable (transient):
 *  - network failures (econnrefused, enotfound, etimedout, network, fetch failed)
 *  - request timeout / abort
 *  - HTTP 429 / rate limiting
 *  - transient HTTP 5xx server failures
 *
 * NOT retryable (permanent):
 *  - missing API key
 *  - authentication failure (401/403)
 *  - malformed/invalid request (400)
 *
 * Unknown errors default to retryable for resilience, matching the existing
 * orchestrator behavior.
 */
export function isRetriableError(error: unknown): boolean {
  if (error instanceof ProviderError) {
    return error.isRetriable;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (
      message.includes('timed out') ||
      message.includes('timeout') ||
      message.includes('abort')
    ) {
      return true;
    }
    if (
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('etimedout') ||
      message.includes('network') ||
      message.includes('fetch failed')
    ) {
      return true;
    }
    if (
      message.includes('429') ||
      message.includes('too many requests') ||
      message.includes('rate limit')
    ) {
      return true;
    }
    if (
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504') ||
      message.includes('service unavailable')
    ) {
      return true;
    }

    if (
      message.includes('401') ||
      message.includes('403') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return false;
    }
    if (message.includes('400') || message.includes('bad request')) {
      return false;
    }
    if (message.includes('missing') && message.includes('api_key')) {
      return false;
    }
  }

  return true;
}

/**
 * Wraps an async operation with bounded, deterministic retry behavior.
 *
 * Guarantees:
 * - Bounded: at most maxAttempts total invocations of fn.
 * - No infinite loops: maxAttempts defaults to DEFAULT_MAX_ATTEMPTS.
 * - No recursive retry chain: the loop is iterative.
 * - First attempt is immediate (no leading delay).
 * - Non-retryable errors throw immediately without delay.
 * - Exhausted retries throw the last error -- the original
 *   ProviderError (with its provider, errorCode, isRetriable, and
 *   originalError context) is preserved and propagated to the caller.
 *
 * @param fn - The operation to attempt.
 * @param options - Retry policy overrides.
 * @returns The result of fn() on success.
 * @throws The last error when all attempts fail or a non-retryable error
 *   occurs on the first attempt.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const sleep = options.sleep ?? defaultSleep;
  const isRetryable = options.isRetryable ?? isRetriableError;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= maxAttempts) {
        break;
      }

      if (!isRetryable(error)) {
        throw error;
      }

      const delay = computeBackoffDelay(attempt - 1, baseDelayMs, maxDelayMs);
      await sleep(delay);
    }
  }

  throw lastError;
}