import type { AIRequest, AIResponse } from './ai.types';
import type { ProviderHealthResult } from './helpers/provider-health';

export interface AIProvider {
  chat(request: AIRequest): Promise<AIResponse>;

  /**
   * Determines whether this provider is currently reachable/usable without
   * performing a normal AI generation request.
   */
  health(): Promise<ProviderHealthResult>;
}

