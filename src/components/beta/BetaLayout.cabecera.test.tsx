/**
 * T-0173 — /beta must never hide the panel navigation. It used to be a
 * `fixed inset-0 z-50` layer over the whole panel (header, sidebar, bottom
 * nav). Inside the panel it now lives in the content slot, like the embedded
 * INICIO chat, but keeps its own chat-list sidebar.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k, locale: 'es' }) }));
vi.mock('./BetaSidebar', () => ({ BetaSidebar: () => null }));
vi.mock('./PreferencesPanel', () => ({ PreferencesPanel: () => null }));
vi.mock('./MobileSidebarDrawer', () => ({ MobileSidebarDrawer: () => null }));
vi.mock('./BetaErrorBoundary', () => ({
  BetaErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/hooks/useBetaKeyboardShortcuts', () => ({ useBetaKeyboardShortcuts: () => {} }));
vi.mock('@/lib/context/BetaChatContext', () => ({
  BetaChatProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useBetaChatContext: () => ({ createConversation: () => {} }),
}));

import { BetaLayout } from './BetaLayout';

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.innerHTML = '';
});

async function pintar(props: Partial<React.ComponentProps<typeof BetaLayout>>) {
  await act(async () => {
    root.render(
      <BetaLayout basePath="/panel/inmobiliaria" {...props}>
        <p>chat</p>
      </BetaLayout>,
    );
  });
  return container.firstElementChild as HTMLElement;
}

describe('BetaLayout — overlay vs. panel navigation', () => {
  it('inside the panel, the chat sits in the content slot, not in a fixed layer', async () => {
    const area = await pintar({ dentroDelPanel: true });
    expect(area.className).not.toContain('fixed');
    expect(area.className).not.toContain('z-50');
    expect(area.className).toContain('relative');
  });

  it('inside the panel, it leaves room for the 4rem header and the 5rem bottom nav below lg', async () => {
    const area = await pintar({ dentroDelPanel: true });
    expect(area.className).toContain('h-[calc(100dvh-4rem-5rem)]');
    expect(area.className).toContain('lg:h-[calc(100dvh-4rem)]');
  });

  it('inside the panel, the chat list menu is still offered', async () => {
    await pintar({ dentroDelPanel: true });
    expect(container.querySelector('[aria-label="beta.mobile.openMenu"]')).not.toBeNull();
  });

  it('the standalone alias (/panel/beta) keeps the true full-screen overlay', async () => {
    const overlay = await pintar({});
    expect(overlay.className).toContain('fixed');
    expect(overlay.className).toContain('top-0');
  });
});
