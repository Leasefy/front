/**
 * T-0173 — /beta on a phone: the full-screen overlay used to start at top 0,
 * right over the panel header (its hamburger "Abrir menú de navegación", the
 * Piloto pill, the processes button and the breadcrumb), and its own mobile
 * bar with a second hamburger ("Abrir menu") sat on top of the real one.
 * Inside the panel the overlay now starts BELOW the 4rem panel header.
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

describe('BetaLayout — overlay vs. panel header on phones', () => {
  it('inside the panel, the overlay starts below the 4rem header under md', async () => {
    const overlay = await pintar({ dentroDelPanel: true });
    expect(overlay.className).toContain('max-md:top-16');
    expect(overlay.className).toContain('max-md:h-[calc(100dvh-4rem)]');
  });

  it('the standalone alias (/panel/beta) keeps the true full-screen overlay', async () => {
    const overlay = await pintar({});
    expect(overlay.className).not.toContain('max-md:top-16');
    expect(overlay.className).toContain('top-0');
  });
});
