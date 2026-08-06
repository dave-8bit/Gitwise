import type { AIResponse, AIResponseMetadata, AIUsage } from '../ai.types';

export function assembleAIResponse(content: string, metadata?: AIResponseMetadata): AIResponse {
  return metadata ? { content, metadata } : { content };
}

/**
 * Removes keys whose value is `undefined` from a metadata-like object.
 * Shared across providers so identical filtering logic lives in one place.
 */
export function compactMetadata<T extends object>(metadata: T): T {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, v]) => v !== undefined)
  ) as T;
}

/**
 * Normalizes provider-specific token usage into the canonical {@link AIUsage}
 * shape (`promptTokens` / `completionTokens` / `totalTokens`).
 *
 * Handles the token-key variants used by providers:
 *  - OpenAI-compatible: `prompt_tokens`, `completion_tokens`, `total_tokens`
 *  - Gemini: `promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`
 *  - Canonical: `promptTokens`, `completionTokens`, `totalTokens`
 *
 * Returns `undefined` when `raw` is missing or no recognized token fields exist.
 */
export function normalizeUsage(raw: Record<string, unknown> | undefined): AIUsage | undefined {
  if (!raw) return undefined;

  const promptTokens = raw.promptTokens ?? raw.prompt_tokens ?? raw.promptTokenCount;
  const completionTokens = raw.completionTokens ?? raw.completion_tokens ?? raw.candidatesTokenCount;
  const totalTokens = raw.totalTokens ?? raw.total_tokens ?? raw.totalTokenCount;

  const usage: AIUsage = {};
  if (typeof promptTokens === 'number') usage.promptTokens = promptTokens;
  if (typeof completionTokens === 'number') usage.completionTokens = completionTokens;
  if (typeof totalTokens === 'number') usage.totalTokens = totalTokens;

  return Object.keys(usage).length > 0 ? usage : undefined;
}

/**
 * Assembles provider response metadata and strips `undefined` fields.
 * Always returns an object (the `provider` field is always present).
 */
export function buildProviderMetadata(
  provider: string,
  params: {
    model?: string;
    finishReason?: string;
    usage?: AIUsage;
  }
): AIResponseMetadata {
  return compactMetadata({
    provider,
    model: params.model,
    finishReason: params.finishReason,
    usage: params.usage,
  });
}

/**
 * Parses a model response that is expected to be a single JSON value.
 *
 * Handles the common real-world case where a small/local model wraps the
 * JSON in a Markdown code fence:
 *
 *   ```json
 *   { ... }
 *   ```
 *
 * or a plain fence:
 *
 *   ```
 *   { ... }
 *   ```
 *
 * The input is trimmed first, then:
 *  - If it is a complete code fence containing the JSON, the inner content
 *    is parsed.
 *  - Otherwise the trimmed string is parsed directly.
 *
 * Arbitrary prose surrounding the JSON is NOT supported — the whole response
 * must be either bare JSON or a single fenced JSON block. Malformed JSON
 * throws (the caller decides how to surface it).
 *
 * @throws SyntaxError when the response is not valid JSON.
 */
export function parseJSONResponse<T>(raw: string): T {
  const trimmed = raw.trim();

  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const candidate = fenced ? fenced[1] : trimmed;

  return JSON.parse(candidate) as T;
}


