/**
 * Shared default timeout (in milliseconds) applied to fetch-based AI
 * provider requests when no explicit timeout is provided.
 *
 * Kept in the same file as {@link fetchWithTimeout} so the default and the
 * helper travel together and stay easy to locate.
 */
export const DEFAULT_FETCH_TIMEOUT_MS = 30_000;

/**
 * Wraps the global `fetch` with a timeout guard.
 *
 * Behavior:
 *  - If `init.signal` is already provided, it is honored as-is and no
 *    additional `AbortController` is created (no signal composition).
 *  - Otherwise, an `AbortController` is created and its signal is attached
 *    to the underlying `fetch` call.
 *  - The timeout timer is always cleared, on success, failure, or timeout.
 *  - If the request aborts because the timeout elapsed, a readable error is
 *    thrown. Any other error (including a caller-initiated abort) propagates
 *    unchanged, so successful fetch behavior is never altered.
 *
 * @param url - The URL to request.
 * @param init - Standard `RequestInit`, passed through to `fetch`.
 * @param timeoutMs - Timeout in milliseconds. Defaults to
 *   {@link DEFAULT_FETCH_TIMEOUT_MS}.
 * @returns A promise resolving to the `Response` from `fetch`.
 * @throws Error when the request times out.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  // Honor a caller-provided signal directly. This phase is intentionally
  // scoped to a pure timeout helper and does not compose signals.
  if (init.signal) {
    return fetch(url, init);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  } finally {
    // Always clear the timer so no timeout leaks after the request settles.
    clearTimeout(timeoutId);
  }
}
