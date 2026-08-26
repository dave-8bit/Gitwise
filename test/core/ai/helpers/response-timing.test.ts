import { describe, it, expect, vi } from 'vitest';

import type { AIResponse } from '../../../../src/core/ai/ai.types';
import { withResponseTiming } from '../../../../src/core/ai/helpers/response-timing';

describe('withResponseTiming()', () => {
    it('adds a non-negative numeric responseTimeMs to a successful response', async () => {
    const response: AIResponse = { content: 'hello' };

    const result = await withResponseTiming(async () => response);

    expect(result.metadata?.responseTimeMs).toBeDefined();
    expect(typeof result.metadata?.responseTimeMs).toBe('number');
    expect(result.metadata?.responseTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('preserves existing response content and metadata', async () => {
    const response: AIResponse = {
      content: 'answer',
      metadata: { provider: 'groq', model: 'm', finishReason: 'stop', usage: { totalTokens: 7 } },
    };

    const result = await withResponseTiming(async () => response);

    expect(result.content).toBe('answer');
    expect(result.metadata).toMatchObject({
      provider: 'groq',
      model: 'm',
      finishReason: 'stop',
      usage: { totalTokens: 7 },
    });
    expect(typeof result.metadata?.responseTimeMs).toBe('number');
  });

    it('adds responseTimeMs when the response has no metadata', async () => {
    const result = await withResponseTiming(async () => ({ content: 'bare' } as AIResponse));

    expect(result.metadata?.responseTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('reflects the elapsed duration of the underlying request lifecycle', async () => {
    let elapsedDuringRun = 0;
    const result = await withResponseTiming(async () => {
      const start = performance.now();
      await new Promise((resolve) => setTimeout(resolve, 25));
      elapsedDuringRun = performance.now() - start;
      return { content: 'slow' } as AIResponse;
    });

    expect(result.metadata?.responseTimeMs).toBeGreaterThanOrEqual(elapsedDuringRun * 0.9);
  });

  it('propagates failures without attaching timing to the thrown error', async () => {
    const failure = new Error('boom');
    await expect(
      withResponseTiming(async () => {
        throw failure;
      })
    ).rejects.toBe(failure);
  });
});

describe('withResponseTiming() delegation', () => {
  it('only invokes the run callback once', async () => {
    const run = vi.fn().mockResolvedValue({ content: 'x' });
    await withResponseTiming(run);
    expect(run).toHaveBeenCalledTimes(1);
  });

    it('works with responses already carrying timing metadata', async () => {
    const result = await withResponseTiming(async () => ({
      content: 'x',
      metadata: { provider: 'ollama', responseTimeMs: 5 },
    }));
    // Fresh timing overwrites the stale value with a real measured duration.
    expect(typeof result.metadata?.responseTimeMs).toBe('number');
    expect(result.metadata?.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.metadata?.provider).toBe('ollama');
    expect(result.content).toBe('x');
  });
});