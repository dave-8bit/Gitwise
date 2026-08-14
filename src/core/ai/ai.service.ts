import type { AIRequest, AIResponse } from './ai.types';
import { getActiveProvider } from './provider.registry';
import { chatWithFallback } from './provider.orchestrator';

class AIServiceImpl {
  async chat(request: AIRequest): Promise<AIResponse> {
    // Preserve error propagation semantics by not catching.
    return getActiveProvider().chat(request);
  }

  /**
   * Chat with automatic provider fallback on runtime failures.
   * Respects the configured preferred provider but falls back
   * to other viable providers when the preferred one fails.
   */
  async chatWithFallback(request: AIRequest): Promise<AIResponse> {
    return chatWithFallback(request);
  }
}

// Singleton instance to act as a stable single entry point.
export const AIService = new AIServiceImpl();


