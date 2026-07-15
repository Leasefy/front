/**
 * Legal API service
 * Fetches versioned legal/consent texts from the public backend endpoint.
 * No auth required — endpoint is public and browser-callable.
 */

import { ApiError } from './client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

// ============================================================================
// Types
// ============================================================================

export interface ConsentTextResponse {
  version: string;
  type: string;
  lang: string;
  title: string;
  text: string;
  effective_from: string;
  supersedes: string | null;
}

export interface GetConsentTextParams {
  type?: string;
  lang?: string;
}

// ============================================================================
// Error
// ============================================================================

/** Thrown when the consent text endpoint returns 404 (not configured yet). */
export class ConsentTextNotFoundError extends Error {
  constructor(type: string) {
    super(`Consent text not found for type "${type}"`);
    this.name = 'ConsentTextNotFoundError';
  }
}

// ============================================================================
// Service
// ============================================================================

/**
 * Fetch the current versioned consent text for a given type and language.
 * Defaults to `type=habeas-data-centrales` and `lang=es`.
 *
 * Throws `ConsentTextNotFoundError` on 404.
 * Throws `ApiError` on other non-OK responses.
 */
export async function getConsentText(
  params: GetConsentTextParams = {}
): Promise<ConsentTextResponse> {
  const type = params.type ?? 'habeas-data-centrales';
  const lang = params.lang ?? 'es';

  const url = `${BACKEND_URL}/legal/consent-text?type=${encodeURIComponent(type)}&lang=${encodeURIComponent(lang)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    throw new ApiError(0, `Could not reach legal endpoint. ${raw}`);
  }

  if (res.status === 404) {
    throw new ConsentTextNotFoundError(type);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (body as { message?: string }).message || `Error ${res.status}`);
  }

  return res.json() as Promise<ConsentTextResponse>;
}
