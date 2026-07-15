/**
 * Authorization header for browser → agent-microservice calls.
 *
 * The agent service authenticates with the user's Supabase access token via
 * `Authorization: Bearer <token>` and does NOT read cookies — so calls must send
 * the bearer header, NOT `credentials: 'include'` (which would also force the
 * agent's CORS allowlist to drop the wildcard origin). Returns a `Headers` object
 * so it composes cleanly with any existing headers a request already sets.
 *
 * Usage:
 *   fetch(url, { headers: agentAuthHeaders() })                       // GET
 *   fetch(url, { method: 'POST', headers: agentAuthHeaders({ 'content-type': 'application/json' }), body })
 */
import { getAccessToken } from './client';

export function agentAuthHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set('Authorization', `Bearer ${getAccessToken() ?? ''}`);
  return headers;
}
