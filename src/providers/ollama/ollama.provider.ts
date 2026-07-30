import type { AIProvider } from '../../core/ai/ai.provider';
import type { AIRequest, AIResponse } from '../../core/ai/ai.types';

import { assembleAIResponse } from '../../core/ai/helpers/response';
import { throwFetchHttpError } from '../../core/ai/helpers/http-error';

// Ollama runs a local OpenAI-compatible API.
// No API key is required for local inference.
const OLLAMA_BASE_URL = 'http://localhost:11434';

type OllamaChatCompletionResponse = {
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
};

export class OllamaProvider implements AIProvider {
  async chat(request: AIRequest): Promise<AIResponse> {
    const response = await fetch(
      `${OLLAMA_BASE_URL}/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model ?? 'llama3',
          max_tokens: request.maxTokens ?? 1024,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt },
          ],
        }),
      },
    );

    if (!response.ok) {
      await throwFetchHttpError({
        response,
        prefix: 'Ollama request failed',
      });
    }

    const json = (await response.json()) as OllamaChatCompletionResponse;
    const content = json.choices?.[0]?.message?.content ?? '';

    const metadata = {
      provider: 'ollama',
      model: (json as any).model,
      finishReason: json.choices?.[0]?.finish_reason,
      usage: (json as any).usage
        ? {
            promptTokens: (json as any).usage.prompt_tokens,
            completionTokens: (json as any).usage.completion_tokens,
            totalTokens: (json as any).usage.total_tokens,
          }
        : undefined,
    };

    const filteredMetadata = Object.fromEntries(
      Object.entries(metadata).filter(([, v]) => v !== undefined),
    ) as typeof metadata;

    return assembleAIResponse(content, filteredMetadata);
  }
}
