import type { AIResponse, AIResponseMetadata } from '../ai.types';

export function assembleAIResponse(content: string, metadata?: AIResponseMetadata): AIResponse {
  return metadata ? { content, metadata } : { content };
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


