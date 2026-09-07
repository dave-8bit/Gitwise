import type { AIRequest, AIResponse } from './ai.types';
import type { ProviderCapabilities } from './ai.capabilities';
import type { ProviderHealthResult } from './helpers/provider-health';

export interface AIProvider {
  /** Static provider-level declarations; omitted by legacy providers means unknown. */
  readonly capabilities?: ProviderCapabilities;

  chat(request: AIRequest): Promise<AIResponse>;

  /**
   * Determines whether this provider is currently reachable/usable without
   * performing a normal AI generation request.
   */
  health(): Promise<ProviderHealthResult>;
}

