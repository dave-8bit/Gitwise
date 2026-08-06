import type { AIProvider } from '../../core/ai/ai.provider';
import type { AIRequest, AIResponse } from '../../core/ai/ai.types';

import { assembleAIResponse } from '../../core/ai/helpers/response';
import { throwFetchHttpError } from '../../core/ai/helpers/http-error';
import {
  buildChatMessages,
  buildOpenAICompatibleMetadata,
  extractOpenAICompatibleContent,
  type OpenAICompatibleResponse,
} from '../../core/ai/helpers/openai-compatible';

// Ollama runs a local OpenAI-compatible API.
// No API key is required for local inference.
const OLLAMA_BASE_URL = 'http://localhost:11434';

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
          messages: buildChatMessages(request.systemPrompt, request.userPrompt),
        }),
      },
    );

    if (!response.ok) {
      await throwFetchHttpError({
        response,
        prefix: 'Ollama request failed',
      });
    }

    const json = (await response.json()) as OpenAICompatibleResponse;
    const content = extractOpenAICompatibleContent(json);
    const metadata = buildOpenAICompatibleMetadata('ollama', json);

    return assembleAIResponse(content, metadata);
  }
}
