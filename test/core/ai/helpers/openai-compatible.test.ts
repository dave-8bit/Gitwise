import { describe, it, expect } from 'vitest';

import {
  buildChatMessages,
  buildOpenAICompatibleMetadata,
  extractOpenAICompatibleContent,
  type OpenAICompatibleResponse,
} from '../../../../src/core/ai/helpers/openai-compatible';

describe('buildChatMessages()', () => {
  it('builds a system message followed by a user message', () => {
    expect(buildChatMessages('sys', 'usr')).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'usr' },
    ]);
  });

  it('preserves prompt content verbatim', () => {
    const system = 'You are a helpful assistant.';
    const user = 'Explain recursion.';
    const result = buildChatMessages(system, user);
    expect(result[0]).toEqual({ role: 'system', content: system });
    expect(result[1]).toEqual({ role: 'user', content: user });
  });
});

describe('extractOpenAICompatibleContent()', () => {
  it('extracts content from the first choice message', () => {
    const response: OpenAICompatibleResponse = {
      choices: [{ message: { role: 'assistant', content: 'Hello' } }],
    };
    expect(extractOpenAICompatibleContent(response)).toBe('Hello');
  });

  it('returns empty string when content is missing', () => {
    expect(extractOpenAICompatibleContent({})).toBe('');
  });

  it('returns empty string when choices is empty', () => {
    expect(extractOpenAICompatibleContent({ choices: [] })).toBe('');
  });

  it('returns empty string when message content is undefined', () => {
    const response: OpenAICompatibleResponse = {
      choices: [{ message: { role: 'assistant' } }],
    };
    expect(extractOpenAICompatibleContent(response)).toBe('');
  });
});

describe('buildOpenAICompatibleMetadata()', () => {
  it('builds full metadata from an OpenAI-compatible response', () => {
    const response: OpenAICompatibleResponse = {
      model: 'model-x',
      choices: [{ finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    };
    expect(buildOpenAICompatibleMetadata('ollama', response)).toEqual({
      provider: 'ollama',
      model: 'model-x',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    });
  });

  it('omits undefined fields but keeps provider', () => {
    expect(buildOpenAICompatibleMetadata('groq', {})).toEqual({ provider: 'groq' });
  });

  it('omits usage when none is present', () => {
    const response: OpenAICompatibleResponse = { model: 'm' };
    expect(buildOpenAICompatibleMetadata('openrouter', response)).toEqual({
      provider: 'openrouter',
      model: 'm',
    });
  });
});
