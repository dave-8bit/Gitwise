import { describe, expect, it } from 'vitest';

import {
  getCapabilitySupport,
  hasUnknownCapability,
  supportsCapability,
  type ProviderCapabilities,
} from '../../../src/core/ai/ai.capabilities';
import { GeminiProvider } from '../../../src/providers/gemini/gemini.provider';
import { GroqProvider } from '../../../src/providers/groq/groq.provider';
import { OllamaProvider } from '../../../src/providers/ollama/ollama.provider';
import { OpenRouterProvider } from '../../../src/providers/openrouter/openrouter.provider';

describe('provider capabilities', () => {
  it('declares chat support for every current provider', () => {
    expect(new GroqProvider().capabilities?.chat).toBe('supported');
    expect(new GeminiProvider().capabilities?.chat).toBe('supported');
    expect(new OpenRouterProvider().capabilities?.chat).toBe('supported');
    expect(new OllamaProvider().capabilities?.chat).toBe('supported');
  });

  it('matches an explicitly supported capability', () => {
    const capabilities: ProviderCapabilities = { chat: 'supported' };

    expect(getCapabilitySupport(capabilities, 'chat')).toBe('supported');
    expect(supportsCapability(capabilities, 'chat')).toBe(true);
    expect(hasUnknownCapability(capabilities, 'chat')).toBe(false);
  });

  it('distinguishes explicitly unsupported capability', () => {
    const capabilities: ProviderCapabilities = { chat: 'unsupported' };

    expect(getCapabilitySupport(capabilities, 'chat')).toBe('unsupported');
    expect(supportsCapability(capabilities, 'chat')).toBe(false);
    expect(hasUnknownCapability(capabilities, 'chat')).toBe(false);
  });

  it('distinguishes unknown capability from unsupported capability', () => {
    expect(getCapabilitySupport(undefined, 'chat')).toBe('unknown');
    expect(supportsCapability(undefined, 'chat')).toBe(false);
    expect(hasUnknownCapability(undefined, 'chat')).toBe(true);
  });
});