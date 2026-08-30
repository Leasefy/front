/**
 * MessagesWidget.test.tsx — T-0038 WU-6, contract-addendum-2.md §B.3.
 *
 * `GET /messages/conversations` breaks the live inbox in a way that
 * produces NO error at all: `applicationId` goes `string` -> `string | null`
 * for a PROPERTY_INQUIRY thread. Before this fix, `MessagesWidget` used
 * `applicationId` as the SELECTION KEY (`conversations.find(c =>
 * c.applicationId === selectedApplicationId)`), so every null-application
 * thread matched the FIRST one — clicking the second silently opened the
 * first. `useMessages.ts` already early-returns on a falsy id, so nothing
 * 404s; it just shows the wrong conversation. These tests pin the fix:
 * selection keys on `conversation.id`.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { ChatConversation } from '@/lib/api/messages.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { searchParamsState, useChatMock, markAsReadMock } = vi.hoisted(() => ({
  searchParamsState: { conversationId: null as string | null, applicationId: null as string | null },
  useChatMock: vi.fn(),
  markAsReadMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === 'conversationId' ? searchParamsState.conversationId : key === 'applicationId' ? searchParamsState.applicationId : null),
  }),
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}));

vi.mock('@leasefy/cadence', () => ({
  IconButton: (props: Record<string, unknown>) => React.createElement('button', { 'aria-label': props['aria-label'] }),
  MonoLabel: ({ children }: { children?: React.ReactNode }) => React.createElement('span', null, children),
  Input: React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLInputElement>) =>
    React.createElement('input', { ...props, ref }),
  ),
  Button: React.forwardRef((props: Record<string, unknown> & { children?: React.ReactNode }, ref: React.Ref<HTMLButtonElement>) => {
    const { children, ...rest } = props;
    return React.createElement('button', { ...rest, ref }, children);
  }),
}));

vi.mock('@phosphor-icons/react', () => ({
  Chat: () => null,
  ChatCircle: () => null,
  MagnifyingGlass: () => null,
  PaperPlaneTilt: () => null,
  Paperclip: () => null,
  DotsThreeVertical: () => null,
  Check: () => null,
  Checks: () => null,
  Info: () => null,
  Image: () => null,
  Smiley: () => null,
  ArrowLeft: () => null,
  X: () => null,
  House: () => null,
  Envelope: () => null,
  Archive: () => null,
  BellSlash: () => null,
  Flag: () => null,
}));

// Memoized per-tag — an unmemoized Proxy `get` trap returns a brand-new
// component on every `motion.div` access, forcing React to unmount+remount
// the whole subtree every render. That is a real infinite loop, not a slow
// test, whenever a mocked child calls something render-triggering from an
// effect (confirmed against ConsignacionWizard.test.tsx's documented fix).
vi.mock('framer-motion', () => {
  const motionTagCache = new Map<string, (props: Record<string, unknown>) => React.ReactElement>();
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        if (!motionTagCache.has(tag)) {
          motionTagCache.set(
            tag,
            ({ children, whileHover, whileTap, initial, animate, exit, transition, ...rest }: Record<string, unknown> & { children?: React.ReactNode }) =>
              React.createElement(tag, rest, children),
          );
        }
        return motionTagCache.get(tag);
      },
    },
  );
  return { motion, AnimatePresence: ({ children }: { children?: React.ReactNode }) => children };
});

vi.mock('@/components/ui/empty-state', () => ({
  EmptyState: ({ title }: { title?: string }) => React.createElement('div', null, title),
}));

vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: () => React.createElement('div', null, 'error'),
}));

let conversationsState: ChatConversation[] = [];

vi.mock('@/lib/hooks/useMessages', () => ({
  useConversations: () => ({
    conversations: conversationsState,
    totalUnread: 0,
    isLoading: false,
    errorCrudo: null,
    refetch: vi.fn(),
  }),
  useChat: (id: string | null) => useChatMock(id),
}));

import { MessagesWidget } from './MessagesWidget';

function makeConversation(overrides: Partial<ChatConversation> = {}): ChatConversation {
  return {
    id: 'conv-1',
    kind: 'APPLICATION',
    applicationId: 'app-1',
    name: 'Ana',
    role: 'Propietario',
    email: 'ana@test.com',
    property: 'Depto Chicó',
    propertyId: 'prop-1',
    lastMessage: 'Hola',
    lastMessageTime: '10:00',
    unreadCount: 0,
    updatedAt: '2026-08-29T00:00:00.000Z',
    ...overrides,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  searchParamsState.conversationId = null;
  searchParamsState.applicationId = null;
  conversationsState = [];
  useChatMock.mockReset().mockReturnValue({
    messages: [],
    isLoading: false,
    isSending: false,
    sendMessage: vi.fn(),
    markAsRead: markAsReadMock,
  });
  markAsReadMock.mockReset();
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

function render() {
  act(() => {
    root.render(React.createElement(MessagesWidget, { actor: 'tenant' }));
  });
}

describe('<MessagesWidget> — selection keys on conversation.id, never applicationId (contract-addendum-2.md §B.3)', () => {
  it('auto-selects the first conversation by id when none is selected yet', () => {
    conversationsState = [
      makeConversation({ id: 'conv-1', applicationId: null, name: 'Inquiry One' }),
      makeConversation({ id: 'conv-2', applicationId: null, name: 'Inquiry Two' }),
    ];
    render();
    expect(useChatMock).toHaveBeenLastCalledWith('conv-1');
  });

  it('REGRESSION: clicking the SECOND of two null-applicationId threads opens the second, not the first', () => {
    conversationsState = [
      makeConversation({ id: 'conv-1', kind: 'PROPERTY_INQUIRY', applicationId: null, name: 'Inquiry One' }),
      makeConversation({ id: 'conv-2', kind: 'PROPERTY_INQUIRY', applicationId: null, name: 'Inquiry Two' }),
    ];
    render();

    // Auto-selected the first by default.
    expect(useChatMock).toHaveBeenLastCalledWith('conv-1');

    const secondButton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Inquiry Two'),
    );
    expect(secondButton).toBeTruthy();
    act(() => {
      (secondButton as HTMLButtonElement).click();
    });

    // The OLD bug: both threads have applicationId === null, so
    // `conversations.find(c => c.applicationId === selectedApplicationId)`
    // always matched conv-1. Selection must now resolve to conv-2.
    expect(useChatMock).toHaveBeenLastCalledWith('conv-2');
  });

  it('the header shows the selected conversation, not the first one, after selecting the second', () => {
    conversationsState = [
      makeConversation({ id: 'conv-1', kind: 'PROPERTY_INQUIRY', applicationId: null, name: 'Inquiry One' }),
      makeConversation({ id: 'conv-2', kind: 'PROPERTY_INQUIRY', applicationId: null, name: 'Inquiry Two' }),
    ];
    render();
    const secondButton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Inquiry Two'),
    );
    act(() => {
      (secondButton as HTMLButtonElement).click();
    });
    // Chat header (desktop pane) should now render "Inquiry Two"'s name.
    expect(container.textContent).toContain('Inquiry Two');
  });

  it('resolves the legacy ?applicationId= deep-link to the matching thread id (signed-contract flows keep working)', () => {
    searchParamsState.applicationId = 'app-legacy';
    conversationsState = [
      makeConversation({ id: 'conv-1', applicationId: 'app-other' }),
      makeConversation({ id: 'conv-2', applicationId: 'app-legacy' }),
    ];
    render();
    expect(useChatMock).toHaveBeenLastCalledWith('conv-2');
  });

  it('a new ?conversationId= deep-link selects that thread directly', () => {
    searchParamsState.conversationId = 'conv-2';
    conversationsState = [
      makeConversation({ id: 'conv-1', applicationId: null }),
      makeConversation({ id: 'conv-2', kind: 'PROPERTY_INQUIRY', applicationId: null }),
    ];
    render();
    expect(useChatMock).toHaveBeenLastCalledWith('conv-2');
  });
});
