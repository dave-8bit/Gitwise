import type { AIResponseMetadata } from '../ai.types';

import { buildProviderMetadata, normalizeUsage } from './response';

/**
 * Minimal OpenAI-compatible chat completion response shape shared by
 * Groq, OpenRouter, and Ollama. Only the fields those providers read are
 * declared.
 */
export interface OpenAICompatibleResponse {
  model?: string;
  choices?: Array<{
    message?: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/**
 * Builds the OpenAI-compatible `messages` payload from a system and user
 * prompt. Shared across OpenAI-compatible providers so the request shape
 * is identical everywhere.
 */
export function buildChatMessages(
  systemPrompt: string,
  userPrompt: string
): Array<{ role: 'system'; content: string } | { role: 'user'; content: string }> {
  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

/**
 * Extracts the assistant text content from an OpenAI-compatible response.
 * Returns `''` when the response has no content, matching provider defaults.
 */
export function extractOpenAICompatibleContent(response: OpenAICompatibleResponse): string {
  return response.choices?.[0]?.message?.content ?? '';
}

/**
 * Assembles provider response metadata for an OpenAI-compatible response.
 * Reuses {@link buildProviderMetadata} and {@link normalizeUsage}.
 */
export function buildOpenAICompatibleMetadata(
  provider: string,
  response: OpenAICompatibleResponse
): AIResponseMetadata {
  return buildProviderMetadata(provider, {
    model: response.model,
    finishReason: response.choices?.[0]?.finish_reason,
    usage: normalizeUsage(response.usage as Record<string, unknown> | undefined),
  });
}
