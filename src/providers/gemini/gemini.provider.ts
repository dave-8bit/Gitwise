import type { AIProvider } from '../../core/ai/ai.provider';
import type { AIRequest, AIResponse } from '../../core/ai/ai.types';

import { requireApiKey } from '../../core/ai/helpers/api-key';
import { assembleAIResponse, buildProviderMetadata, normalizeUsage } from '../../core/ai/helpers/response';
import { throwFetchHttpError } from '../../core/ai/helpers/http-error';
import { createNetworkError, createTimeoutError } from '../../core/ai/helpers/provider-error';

type GeminiChatResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

export class GeminiProvider implements AIProvider {
  async chat(request: AIRequest): Promise<AIResponse> {
    const key = requireApiKey(process.env.GEMINI_API_KEY, 'GEMINI_API_KEY', 'gemini');

    const model = request.model ?? '';
    if (!model) {
      // Provider responsibilities only: ensure request is complete.
      // Model selection is expected to happen upstream (e.g., app/config).
      // If not provided, we let Gemini API fail with a clear error.
      throw new Error('Missing model in AIRequest');
    }

    const maxOutputTokens = request.maxTokens;

    // Google AI Studio (Gemini) REST API (non-streaming)
    // https://ai.google.dev/api/generate-content
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(key)}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: request.systemPrompt
            ? { parts: [{ text: request.systemPrompt }] }
            : undefined,
          contents: [
            {
              role: 'user',
              parts: [{ text: request.userPrompt }],
            },
          ],
          generationConfig: maxOutputTokens
            ? {
                maxOutputTokens,
              }
            : undefined,
        }),
      });

      if (!response.ok) {
        await throwFetchHttpError({
          response,
          prefix: 'Gemini request failed',
          provider: 'gemini',
        });
      }

      const json = (await response.json()) as GeminiChatResponse;

      const content =
        json.candidates?.[0]?.content?.parts
          ?.map((p) => p.text ?? '')
          .join('')
          ?.trim() ?? '';

      const metadata = buildProviderMetadata('gemini', {
        model: (json as any).model,
        finishReason: json.candidates?.[0]?.finishReason,
        usage: normalizeUsage(json.usageMetadata as Record<string, unknown> | undefined),
      });

      return assembleAIResponse(content, metadata);
    } catch (error) {
      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes('timed out') || message.includes('timeout') || message.includes('abort')) {
          throw createTimeoutError({
            provider: 'gemini',
            message: error.message,
          });
        }

        if (message.includes('econnrefused') ||
            message.includes('enotfound') ||
            message.includes('network') ||
            message.includes('fetch failed')) {
          throw createNetworkError({
            provider: 'gemini',
            message: error.message,
            originalError: error,
          });
        }
      }

      throw error;
    }
  }
}
