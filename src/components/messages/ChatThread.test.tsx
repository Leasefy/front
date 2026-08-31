/**
 * ChatThread.test.tsx — T-0038 WU-6, contract-addendum-2.md §B.3/§B.8.
 *
 * `ChatThread`'s two call sites (tenant's own application page, agency
 * CandidateDrawer) only ever know an `applicationId`, never a
 * `conversation.id`. Locks that this component stays on the legacy compat
 * routes (`useApplicationChat`, `/applications/:id/chat*` — "stays live",
 * §B.8) rather than being silently rewired onto the new universal
 * `/conversations/:id/*` routes, which would 404 given an applicationId.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const useApplicationChatMock = vi.fn();

vi.mock('@/lib/hooks/useMessages', () => ({
  useApplicationChat: (id: string | null) => useApplicationChatMock(id),
}));

import { ChatThread } from './ChatThread';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  useApplicationChatMock.mockReset().mockReturnValue({
    messages: [],
    isLoading: false,
    isSending: false,
    error: null,
    sendMessage: vi.fn(),
    markAsRead: vi.fn(),
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
});

describe('<ChatThread> — stays on the legacy application-scoped compat path (§B.8)', () => {
  it('calls useApplicationChat with the given applicationId, not the universal useChat', () => {
    act(() => {
      root.render(React.createElement(ChatThread, { applicationId: 'app-1' }));
    });
    expect(useApplicationChatMock).toHaveBeenCalledWith('app-1');
  });

  it('renders without crashing when there are no messages yet', () => {
    act(() => {
      root.render(React.createElement(ChatThread, { applicationId: 'app-1' }));
    });
    expect(container.textContent).toContain('Sin mensajes');
  });
});
