import { describe, it, expect } from 'vitest';

import {
  parseJSONResponse,
  compactMetadata,
  normalizeUsage,
  buildProviderMetadata,
} from '../../../../src/core/ai/helpers/response';

const validReview = {
  score: 7,
  summary: 'Solid implementation with minor style nits.',
  issues: [
    {
      severity: 'info',
      category: 'style',
      description: 'Add a doc comment.',
      suggestion: 'Document the function.',
    },
  ],
  passed: true,
};

describe('parseJSONResponse()', () => {
  it('parses plain JSON', () => {
    const result = parseJSONResponse<typeof validReview>(JSON.stringify(validReview));
    expect(result).toEqual(validReview);
  });

  it('parses JSON wrapped in a ```json code fence', () => {
    const raw = '```json\n' + JSON.stringify(validReview) + '\n```';
    const result = parseJSONResponse<typeof validReview>(raw);
    expect(result).toEqual(validReview);
  });

  it('parses JSON wrapped in a plain ``` code fence', () => {
    const raw = '```\n' + JSON.stringify(validReview) + '\n```';
    const result = parseJSONResponse<typeof validReview>(raw);
    expect(result).toEqual(validReview);
  });

  it('trims leading and trailing whitespace around plain JSON', () => {
    const raw = '  \n\t ' + JSON.stringify(validReview) + '  \n\t ';
    const result = parseJSONResponse<typeof validReview>(raw);
    expect(result).toEqual(validReview);
  });

  it('trims leading and trailing whitespace around fenced JSON', () => {
    const raw = '  \n ```json\n' + JSON.stringify(validReview) + '\n```\n  ';
    const result = parseJSONResponse<typeof validReview>(raw);
    expect(result).toEqual(validReview);
  });

  it('rejects malformed JSON', () => {
    expect(() => parseJSONResponse('{ this is not valid json }')).toThrow(SyntaxError);
  });

  it('rejects arbitrary prose surrounding JSON', () => {
    const raw =
      'Here is the review:\n```json\n' +
      JSON.stringify(validReview) +
      '\n```\nHope that helps!';
    expect(() => parseJSONResponse(raw)).toThrow(SyntaxError);
  });

  it('rejects an unterminated code fence', () => {
    const raw = '```json\n' + JSON.stringify(validReview);
    expect(() => parseJSONResponse(raw)).toThrow(SyntaxError);
  });
});

describe('compactMetadata()', () => {
  it('drops undefined values', () => {
    const result = compactMetadata({ provider: 'groq', model: undefined, finishReason: 'stop' });
    expect(result).toEqual({ provider: 'groq', finishReason: 'stop' });
  });

  it('keeps all values when none are undefined', () => {
    const result = compactMetadata({ a: 1, b: 2 });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('returns an empty object when all values are undefined', () => {
    const result = compactMetadata({ a: undefined, b: undefined });
    expect(result).toEqual({});
  });
});

describe('normalizeUsage()', () => {
  it('returns undefined when raw is missing', () => {
    expect(normalizeUsage(undefined)).toBeUndefined();
  });

  it('normalizes OpenAI-compatible snake_case token fields', () => {
    expect(
      normalizeUsage({ prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 })
    ).toEqual({ promptTokens: 10, completionTokens: 5, totalTokens: 15 });
  });

  it('normalizes Gemini token-count fields to canonical keys', () => {
    expect(
      normalizeUsage({
        promptTokenCount: 20,
        candidatesTokenCount: 7,
        totalTokenCount: 27,
      })
    ).toEqual({ promptTokens: 20, completionTokens: 7, totalTokens: 27 });
  });

  it('accepts canonical camelCase token fields', () => {
    expect(
      normalizeUsage({ promptTokens: 1, completionTokens: 2, totalTokens: 3 })
    ).toEqual({ promptTokens: 1, completionTokens: 2, totalTokens: 3 });
  });

  it('returns undefined when no recognized token fields are present', () => {
    expect(normalizeUsage({ foo: 1 })).toBeUndefined();
  });

  it('omits non-number token fields', () => {
    expect(normalizeUsage({ prompt_tokens: '10', totalTokens: 15 })).toEqual({
      totalTokens: 15,
    });
  });
});

describe('buildProviderMetadata()', () => {
  it('builds full metadata with provider always present', () => {
    const result = buildProviderMetadata('groq', {
      model: 'm',
      finishReason: 'stop',
      usage: { promptTokens: 1, totalTokens: 2 },
    });
    expect(result).toEqual({
      provider: 'groq',
      model: 'm',
      finishReason: 'stop',
      usage: { promptTokens: 1, totalTokens: 2 },
    });
  });

  it('omits undefined fields but keeps provider', () => {
    const result = buildProviderMetadata('ollama', {});
    expect(result).toEqual({ provider: 'ollama' });
  });
});

