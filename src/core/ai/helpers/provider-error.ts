import type { ProviderId } from '../provider.registry';

/**
 * Structured error representation for provider failures.
 * Enables reliable error classification for fallback decisions.
 *
 * Extends Error for compatibility with existing error handling.
 * Adds provider, errorCode, and isRetriable for structured classification.
 */
export class ProviderError extends Error {
  readonly provider: ProviderId;
  readonly errorCode: string; // HTTP status code, 'timeout', 'network', 'auth', etc.
  readonly isRetriable: boolean;
  readonly originalError?: Error;

  constructor(params: {
    provider: ProviderId;
    message: string;
    errorCode: string;
    isRetriable: boolean;
    originalError?: Error;
  }) {
    super(params.message);
    this.provider = params.provider;
    this.errorCode = params.errorCode;
    this.isRetriable = params.isRetriable;
    this.originalError = params.originalError;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ProviderError.prototype);
  }
}

/**
 * Determines if an HTTP status code should trigger provider fallback.
 * Terminal errors (auth, config) return false; transient errors return true.
 */
export function isRetriableHttpStatus(status: number): boolean {
  // Rate limiting, server errors, gateway errors - retriable
  if (status >= 429 && status <= 599) return true;
  
  // Everything else (4xx except those above) - not retriable
  return false;
}

/**
 * Creates a ProviderError from an HTTP response.
 * Automatically determines if the error is retriable based on status code.
 */
export function createHttpError(params: {
  provider: ProviderId;
  response: Response;
  prefix: string;
  body?: string;
}): ProviderError {
  const { provider, response, prefix, body } = params;
  const status = response.status;
  const retriable = isRetriableHttpStatus(status);

  // Determine error code for classification
  let errorCode = String(status);
  if (status === 401 || status === 403) errorCode = 'auth';
  else if (status === 400) errorCode = 'config';
  else if (status === 429) errorCode = 'ratelimit';
  else if (status >= 500) errorCode = 'server';

  const message = `${prefix}: ${status} ${response.statusText}${body ? ` - ${body}` : ''}`;

  return new ProviderError({
    provider,
    message,
    errorCode,
    isRetriable: retriable,
  });
}

/**
 * Creates a ProviderError for missing API key.
 */
export function createMissingApiKeyError(params: {
  provider: ProviderId;
  envVarName: string;
}): ProviderError {
  return new ProviderError({
    provider: params.provider,
    message: `Missing ${params.envVarName}`,
    errorCode: 'missing_api_key',
    isRetriable: false, // Auth/config errors are never retriable
  });
}

/**
 * Creates a ProviderError for timeout.
 */
export function createTimeoutError(params: {
  provider: ProviderId;
  message: string;
}): ProviderError {
  return new ProviderError({
    provider: params.provider,
    message: params.message,
    errorCode: 'timeout',
    isRetriable: true,
  });
}

/**
 * Creates a ProviderError for network/connection errors.
 */
export function createNetworkError(params: {
  provider: ProviderId;
  message: string;
  originalError?: Error;
}): ProviderError {
  return new ProviderError({
    provider: params.provider,
    message: params.message,
    errorCode: 'network',
    isRetriable: true,
    originalError: params.originalError,
  });
}
