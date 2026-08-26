import Groq from 'groq-sdk';

import type { AIProvider } from '../../core/ai/ai.provider';
import type { AIRequest, AIResponse } from '../../core/ai/ai.types';

import { requireApiKey } from '../../core/ai/helpers/api-key';
import { assembleAIResponse } from '../../core/ai/helpers/response';
import {
  buildChatMessages,
  buildOpenAICompatibleMetadata,
  extractOpenAICompatibleContent,
  type OpenAICompatibleResponse,
} from '../../core/ai/helpers/openai-compatible';
import {
  createNetworkError,
  createTimeoutError,
  ProviderError,
} from '../../core/ai/helpers/provider-error';
import { withResponseTiming } from '../../core/ai/helpers/response-timing';
import {
  missingApiKeyHealthResult,
  probeProviderHealth,
  type ProviderHealthResult,
} from '../../core/ai/helpers/provider-health';

// Groq lists available models over a lightweight GET endpoint. Health checks
// hit this instead of generating a completion.
const GROQ_MODELS_URL = 'https://api.groq.com/openai/v1/models';

export class GroqProvider implements AIProvider {
  async chat(request: AIRequest): Promise<AIResponse> {
    const apiKey = process.env.GROQ_API_KEY;
    const groq = new Groq({
      apiKey: apiKey ?? '',
    });

    // Fail fast before making any API request.
    requireApiKey(apiKey, 'GROQ_API_KEY', 'groq');

    try {
      return await withResponseTiming(async () => {
        const completion = (await groq.chat.completions.create({
          model: request.model ?? 'llama-3.3-70b-versatile',

          max_tokens: request.maxTokens ?? 1024,
          messages: buildChatMessages(request.systemPrompt, request.userPrompt),
        })) as OpenAICompatibleResponse;

        const content = extractOpenAICompatibleContent(completion);
        const metadata = buildOpenAICompatibleMetadata('groq', completion);

        return assembleAIResponse(content, metadata);
      });
    } catch (error) {
      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes('401') || message.includes('403') || message.includes('unauthorized') || message.includes('forbidden')) {
          throw new ProviderError({
            provider: 'groq',
            message: error.message,
            errorCode: 'auth',
            isRetriable: false,
            originalError: error,
          });
        }

        if (message.includes('400') || message.includes('bad request') || message.includes('invalid')) {
          throw new ProviderError({
            provider: 'groq',
            message: error.message,
            errorCode: 'config',
            isRetriable: false,
            originalError: error,
          });
        }

        if (message.includes('timed out') || message.includes('timeout') || message.includes('abort')) {
          throw createTimeoutError({
            provider: 'groq',
            message: error.message,
          });
        }

        if (message.includes('429') || message.includes('too many requests') || message.includes('rate limit')) {
          throw new ProviderError({
            provider: 'groq',
            message: error.message,
            errorCode: 'ratelimit',
            isRetriable: true,
            originalError: error,
          });
        }

        if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504') || message.includes('service unavailable')) {
          throw new ProviderError({
            provider: 'groq',
            message: error.message,
            errorCode: 'server',
            isRetriable: true,
            originalError: error,
          });
        }

        if (message.includes('econnrefused') ||
            message.includes('enotfound') ||
            message.includes('etimedout') ||
            message.includes('network') ||
            message.includes('fetch failed')) {
          throw createNetworkError({
            provider: 'groq',
            message: error.message,
            originalError: error,
          });
        }
      }

      throw error;
    }
  }

  async health(): Promise<ProviderHealthResult> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return missingApiKeyHealthResult('groq', 'GROQ_API_KEY');
    }

    return probeProviderHealth({
      provider: 'groq',
      url: GROQ_MODELS_URL,
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  }
}
