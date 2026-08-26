import { performance } from 'node:perf_hooks';

import type { ProviderId } from '../provider.registry';
import { fetchWithTimeout } from './http-timeout';

/**
 * Categorization of a provider's current reachability/usability.
 *
 * Mirrors the classification already used by {@link ProviderError} so health
 * results and error normalization stay consistent.
 */
export type ProviderHealthStatus = 'ok' | 'unavailable' | 'auth' | 'config';

/**
 * Result of a provider health probe.
 *
 * `responseTimeMs` is the latency of the probe (monotonic/high-resolution).
 * `errorCode` reuses the ProviderError vocabulary ('auth', 'config', 'network',
 * 'timeout', 'ratelimit', 'server', 'missing_api_key', ...).
 */
export interface ProviderHealthResult {
  provider: ProviderId;
  status: ProviderHealthStatus;
  responseTimeMs?: number;
  /** HTTP status code (e.g. `401`) or a ProviderError-style error code. */
  statusCode?: number;
  errorCode?: string;
  message?: string;
}

/** Default probe timeout, applied to every lightweight health request. */
export const PROVIDER_HEALTH_TIMEOUT_MS = 10_000;

/**
 * Builds a health result for a provider that requires an API key but has none
 * configured. This is a configuration failure and never hits the network.
 */
export function missingApiKeyHealthResult(
  provider: ProviderId,
  envVarName: string
): ProviderHealthResult {
  return {
    provider,
    status: 'config',
    errorCode: 'missing_api_key',
    message: `Missing ${envVarName}`,
  };
}

function httpHealthResult(
  provider: ProviderId,
  status: number,
  responseTimeMs: number
): ProviderHealthResult {
  const base = { provider, statusCode: status, responseTimeMs };

  if (status >= 200 && status < 300) {
    return { ...base, status: 'ok' };
  }
  if (status === 401 || status === 403) {
    return { ...base, status: 'auth', errorCode: 'auth', message: `HTTP ${status}` };
  }
  if (status === 429) {
    return { ...base, status: 'unavailable', errorCode: 'ratelimit', message: `HTTP ${status}` };
  }
  if (status >= 500) {
    return { ...base, status: 'unavailable', errorCode: 'server', message: `HTTP ${status}` };
  }
  // Any other 4xx (400, 404, ...) is a configuration-level problem.
  return { ...base, status: 'config', errorCode: 'config', message: `HTTP ${status}` };
}

function thrownHealthResult(
  provider: ProviderId,
  error: unknown,
  responseTimeMs: number
): ProviderHealthResult {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes('timed out') || normalized.includes('timeout') || normalized.includes('abort')) {
    return {
      provider,
      status: 'unavailable',
      errorCode: 'timeout',
      message,
      responseTimeMs,
    };
  }

  return {
    provider,
    status: 'unavailable',
    errorCode: 'network',
    message,
    responseTimeMs,
  };
}

/**
 * Performs a lightweight GET probe against a provider endpoint and classifies
 * the outcome into a {@link ProviderHealthResult}. Reuses the shared
 * {@link fetchWithTimeout} timeout guard and ProviderError classification
 * conventions. Transitive to HTTP errors (gives a clear `auth`/`config`
 * distinction) and network/timeout failures (`unavailable`).
 */
export async function probeProviderHealth(params: {
  provider: ProviderId;
  url: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}): Promise<ProviderHealthResult> {
  const { provider, url, headers, timeoutMs = PROVIDER_HEALTH_TIMEOUT_MS } = params;

  const startedAt = performance.now();
  try {
    const response = await fetchWithTimeout(url, { method: 'GET', headers }, timeoutMs);
    const responseTimeMs = performance.now() - startedAt;
    return httpHealthResult(provider, response.status, responseTimeMs);
  } catch (error) {
    const responseTimeMs = performance.now() - startedAt;
    return thrownHealthResult(provider, error, responseTimeMs);
  }
}