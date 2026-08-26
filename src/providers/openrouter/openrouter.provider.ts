import type { AIProvider } from '../../core/ai/ai.provider';
import type { AIRequest, AIResponse } from '../../core/ai/ai.types';

import { requireApiKey } from '../../core/ai/helpers/api-key';
import { assembleAIResponse } from '../../core/ai/helpers/response';
import { throwFetchHttpError } from '../../core/ai/helpers/http-error';
import {
  buildChatMessages,
  buildOpenAICompatibleMetadata,
  extractOpenAICompatibleContent,
  type OpenAICompatibleResponse,
} from '../../core/ai/helpers/openai-compatible';
import { createNetworkError, createTimeoutError } from '../../core/ai/helpers/provider-error';
import { withResponseTiming } from '../../core/ai/helpers/response-timing';
import {
  missingApiKeyHealthResult,
  probeProviderHealth,
  type ProviderHealthResult,
} from '../../core/ai/helpers/provider-health';

// OpenRouter follows an OpenAI-compatible chat API.
// We use the minimal required surface: system+user prompts.
export class OpenRouterProvider implements AIProvider {
  async chat(request: AIRequest): Promise<AIResponse> {
    const key = requireApiKey(process.env.OPENROUTER_API_KEY, 'OPENROUTER_API_KEY', 'openrouter');

    try {
      return await withResponseTiming(async () => {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: request.model ?? 'openai/gpt-3.5-turbo',
            max_tokens: request.maxTokens ?? 1024,
            messages: buildChatMessages(request.systemPrompt, request.userPrompt),
          }),
        });

        if (!response.ok) {
          await throwFetchHttpError({
            response,
            prefix: 'OpenRouter request failed',
            provider: 'openrouter',
          });
        }

        const json = (await response.json()) as OpenAICompatibleResponse;
        const content = extractOpenAICompatibleContent(json);
        const metadata = buildOpenAICompatibleMetadata('openrouter', json);

        return assembleAIResponse(content, metadata);
      });
    } catch (error) {
      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes('timed out') || message.includes('timeout') || message.includes('abort')) {
          throw createTimeoutError({
            provider: 'openrouter',
            message: error.message,
          });
        }

        if (message.includes('econnrefused') ||
            message.includes('enotfound') ||
            message.includes('network') ||
            message.includes('fetch failed')) {
          throw createNetworkError({
            provider: 'openrouter',
            message: error.message,
            originalError: error,
          });
        }
      }

      throw error;
    }
  }

  async health(): Promise<ProviderHealthResult> {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      return missingApiKeyHealthResult('openrouter', 'OPENROUTER_API_KEY');
    }

    return probeProviderHealth({
      provider: 'openrouter',
      url: 'https://openrouter.ai/api/v1/models',
      headers: { Authorization: `Bearer ${key}` },
    });
  }
}
