/**
 * SSE (Server-Sent Events) streaming utilities for the Leasefy AI chat.
 *
 * - parseSSEStream: AsyncGenerator that reads a Response body and yields typed ChatStreamEvent objects
 * - connectChatStream: Initiates a POST request to the SSE endpoint, returns raw Response
 *
 * The SSE protocol uses `data: <json>\n\n` lines, with `data: [DONE]` as the terminal sentinel.
 * Partial chunks are buffered across reads to handle split lines correctly.
 */

import type { ChatStreamEvent, SendMessageRequest } from './types';

// ============================================================================
// SSE Parser
// ============================================================================

/**
 * Parse an SSE text stream into typed ChatStreamEvent objects.
 *
 * Handles:
 * - Partial chunks (buffered across reads)
 * - `data: [DONE]` sentinel (terminates the generator)
 * - Malformed JSON lines (silently skipped)
 * - Empty keep-alive lines (ignored)
 */
export async function* parseSSEStream(
  response: Response
): AsyncGenerator<ChatStreamEvent, void, unknown> {
  const body = response.body;
  if (!body) return;

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Last element may be an incomplete line — keep it in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) {
          // Empty line or SSE comment — skip
          continue;
        }

        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          if (data === '[DONE]') return;

          try {
            yield JSON.parse(data) as ChatStreamEvent;
          } catch {
            // Malformed JSON — skip silently
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ============================================================================
// SSE Connection
// ============================================================================

/**
 * Connect to the SSE endpoint for chat streaming.
 *
 * Sends a POST request with the message payload and returns the raw Response.
 * The caller should pass this to `parseSSEStream()` to consume events.
 *
 * @param baseUrl - API base URL (e.g. "/api/v1/ai")
 * @param request - Message payload
 * @param token - Optional Bearer token for authentication
 */
export async function connectChatStream(
  baseUrl: string,
  request: SendMessageRequest,
  token?: string
): Promise<Response> {
  const response = await fetch(`${baseUrl}/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(
      `SSE connection failed: ${response.status} ${response.statusText}`
    );
  }

  return response;
}
