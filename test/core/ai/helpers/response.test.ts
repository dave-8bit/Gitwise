import { describe, it, expect } from 'vitest';

import { parseJSONResponse } from '../../../../src/core/ai/helpers/response';

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

