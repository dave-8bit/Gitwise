import type { ProviderId } from '../provider.registry';
import { createHttpError } from './provider-error';

export async function throwFetchHttpError(params: {
  response: Response;
  prefix: string;
  provider?: ProviderId;
}): Promise<never> {
  const { response, prefix, provider = 'unknown' as ProviderId } = params;

  const text = await response.text().catch(() => '');
  throw createHttpError({
    provider,
    response,
    prefix,
    body: text,
  });
}

