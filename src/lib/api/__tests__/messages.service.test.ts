/**
 * messages.service.test.ts — T-0038 WU-6, contract-addendum-2.md §B.8 route table.
 *
 * Pins which route each method hits — the universal `/conversations/:id/*`
 * routes (recommended shape, used by MessagesWidget) vs. the legacy
 * `/applications/:id/chat*` compat path (kept only for the two standalone
 * <ChatThread> call sites, "stays live").
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { messagesApi } from '../messages.service';
import { setAccessToken } from '../client';

function mockFetchOnce(body: unknown) {
  const fn = vi.fn().mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response);
  globalThis.fetch = fn as typeof globalThis.fetch;
  return fn;
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_BACKEND_URL = 'http://backend.test';
  setAccessToken('test-token');
});

afterEach(() => {
  setAccessToken(null);
  vi.restoreAllMocks();
});

describe('messagesApi — universal conversation routes (§B.8, new)', () => {
  it('getConversationMessages hits GET /conversations/:id', async () => {
    const fetchMock = mockFetchOnce({ id: 'conv-1', applicationId: null, messages: [] });
    await messagesApi.getConversationMessages('conv-1');
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/conversations/conv-1');
  });

  it('sendConversationMessage hits POST /conversations/:id/messages with the content body', async () => {
    const fetchMock = mockFetchOnce({ id: 'm1', content: 'hola', senderId: 'u1', createdAt: '2026-01-01' });
    await messagesApi.sendConversationMessage('conv-1', 'hola');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/conversations/conv-1/messages');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ content: 'hola' });
  });

  it('markConversationAsRead hits PATCH /conversations/:id/read', async () => {
    const fetchMock = mockFetchOnce({ updated: 2 });
    const res = await messagesApi.markConversationAsRead('conv-1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/conversations/conv-1/read');
    expect(init?.method).toBe('PATCH');
    expect(res).toEqual({ updated: 2 });
  });

  it('createPropertyInquiry hits POST /properties/:id/conversations with no body fields', async () => {
    const fetchMock = mockFetchOnce({ conversationId: 'conv-new' });
    const res = await messagesApi.createPropertyInquiry('prop-1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/properties/prop-1/conversations');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({});
    expect(res).toEqual({ conversationId: 'conv-new' });
  });
});

describe('messagesApi — legacy application compat routes (§B.8, stays live)', () => {
  it('getApplicationMessages hits GET /applications/:id/chat', async () => {
    const fetchMock = mockFetchOnce({ id: 'conv-1', applicationId: 'app-1', messages: [] });
    await messagesApi.getApplicationMessages('app-1');
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/applications/app-1/chat');
  });

  it('sendApplicationMessage hits POST /applications/:id/chat/messages', async () => {
    const fetchMock = mockFetchOnce({ id: 'm1', content: 'hola', senderId: 'u1', createdAt: '2026-01-01' });
    await messagesApi.sendApplicationMessage('app-1', 'hola');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/applications/app-1/chat/messages');
    expect(init?.method).toBe('POST');
  });

  it('markApplicationAsRead hits PATCH /applications/:id/chat/read — different response shape than the new route', async () => {
    const fetchMock = mockFetchOnce({ message: 'Mensajes marcados como leidos' });
    const res = await messagesApi.markApplicationAsRead('app-1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/applications/app-1/chat/read');
    expect(init?.method).toBe('PATCH');
    expect(res).toEqual({ message: 'Mensajes marcados como leidos' });
  });
});
