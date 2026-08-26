import { performance } from 'node:perf_hooks';

import type { AIResponse } from '../ai.types';

/**
 * Wraps a provider request and records its elapsed duration onto the resulting
 * AI response metadata as `responseTimeMs`.
 *
 * Timing spans the full duration of `run()` — i.e. the provider request
 * lifecycle (request through assembled response). A monotonic, high-resolution
 * timer (`performance.now()`) is used, so the value is non-negative.
 *
 * Existing response content and metadata are preserved; only `responseTimeMs`
 * is added. The result is clamped to `0` as a guard.
 *
 * On failure the error propagates unchanged — failed requests deliberately do
 * not expose timing through the (unchanged) {@link ProviderError} architecture.
 *
 * Shared across all providers so timing logic lives in exactly one place.
 */
export async function withResponseTiming<T extends AIResponse>(
  run: () => Promise<T>
): Promise<T> {
  const startedAt = performance.now();
  const response = await run();
  const responseTimeMs = Math.max(0, performance.now() - startedAt);

  return {
    ...response,
    metadata: {
      ...(response.metadata ?? {}),
      responseTimeMs,
    },
  };
}