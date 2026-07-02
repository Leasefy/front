'use client';

import { useState, useCallback } from 'react';
import { List, Plus, Sparkle } from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { BetaSidebar, BetaTab } from './BetaSidebar';
import { BetaChatProvider, useBetaChatContext } from '@/lib/context/BetaChatContext';
import { BetaErrorBoundary } from './BetaErrorBoundary';
import { PreferencesPanel } from './PreferencesPanel';
import { MobileSidebarDrawer } from './MobileSidebarDrawer';
import { useBetaKeyboardShortcuts } from '@/lib/hooks/useBetaKeyboardShortcuts';

interface BetaLayoutProps {
  children: React.ReactNode;
  basePath: string;
  /**
   * fullscreen (default): fixed inset overlay — the "separate universe" used
   * by the /beta subtree.
   * embedded: fills the classic panel's content area so the main backoffice
   * sidebar + header stay visible (the INICIO chat — AI CHAT HOME F3 revisión:
   * la sidebar principal debe seguir existiendo).
   */
  variant?: 'fullscreen' | 'embedded';
}

/**
 * BetaLayout - Mission Control layout for the AI Beta universe.
 *
 * Full-screen layout that replaces the standard dashboard view.
 * Structure: BetaSidebar (260px) | Main content area (flex-1)
 *
 * Uses fixed inset-0 z-50 to create the "separate universe" experience.
 * The AppSwitcher in BetaSidebar navigates back to the classic dashboard.
 *
 * Mobile: sidebar becomes a slide-out drawer, a header bar provides
 * hamburger menu, title, and new-chat button.
 *
 * BetaChatProvider wraps all children so chat state persists across
 * tab switches and page navigation within the Beta section.
 */
export function BetaLayout({ children, basePath, variant = 'fullscreen' }: BetaLayoutProps) {
  const { t } = useI18n();
  const [activeTab, setTab] = useState<BetaTab>('conversations');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleTabChange = useCallback((tab: BetaTab) => {
    setTab(tab);
    setDrawerOpen(false); // Close drawer when navigating on mobile
  }, []);

  // The embedded INICIO drops the chat sidebar entirely — the classic backoffice
  // sidebar already provides all navigation, so the Beta chat bar was redundant
  // clutter (pedido Nico 2026-06-25). The /beta "separate universe" keeps it.
  const showBetaSidebar = variant === 'fullscreen';

  return (
    <BetaChatProvider onTabChange={(tab) => setTab(tab as BetaTab)}>
      <BetaKeyboardShortcuts onCloseDrawer={() => setDrawerOpen(false)} drawerOpen={drawerOpen} />
      <div
        className={cn(
          variant === 'fullscreen'
            ? // h-[100dvh] (not inset-0/100vh) keeps the chat input visible above
              // the on-screen keyboard / collapsing URL bar on mobile.
              'fixed inset-x-0 top-0 h-[100dvh] z-50'
            : // Embedded: fill the classic panel content area. The sticky
              // PlanHeader is h-16 (4rem); below lg the layout reserves pb-20
              // (5rem) for the MobileNavBar.
              'relative h-[calc(100dvh-4rem-5rem)] lg:h-[calc(100dvh-4rem)]',
          'flex flex-col md:flex-row',
          'bg-background'
        )}
      >
        {/* Skip to chat link - visible only on focus for screen readers */}
        <a
          href="#beta-chat-main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-fg focus:rounded-md focus:text-sm focus:font-medium"
        >
          {t('beta.a11y.skipToChat')}
        </a>
        {/* Mobile header - visible only on mobile. In embedded mode the chat
            sidebar is gone, so the hamburger is omitted (classic MobileNavBar
            handles navigation). */}
        <div
          className={cn(
            'md:hidden flex items-center justify-between',
            'h-12 px-3 flex-shrink-0',
            'border-b border-border',
            'bg-card'
          )}
        >
          {/* Hamburger button (only when the Beta sidebar exists) */}
          {showBetaSidebar ? (
            <IconButton
              type="button"
              icon={<List className="w-5 h-5" weight="regular" />}
              onClick={() => setDrawerOpen(true)}
              variant="ghost"
              aria-label={t('beta.mobile.openMenu')}
              className="w-11 h-11 rounded-md text-fg-muted hover:text-fg hover:bg-surface-hover"
            />
          ) : (
            <span className="w-11" aria-hidden="true" />
          )}

          {/* Title */}
          <div className="flex items-center gap-1.5">
            <Sparkle className="w-4 h-4 text-primary" weight="fill" />
            <span className="text-sm font-semibold text-fg">
              {t('beta.title')}
            </span>
          </div>

          {/* New chat button - wired via context inside provider */}
          <MobileNewChatButton />
        </div>

        {/* Desktop sidebar - hidden on mobile, error-isolated. Embedded INICIO
            renders no chat sidebar (the classic backoffice sidebar covers nav). */}
        {showBetaSidebar && (
          <BetaErrorBoundary>
            <div className="hidden md:flex">
              <BetaSidebar
                basePath={basePath}
                activeTab={activeTab}
                onTabChange={handleTabChange}
              />
            </div>
          </BetaErrorBoundary>
        )}

        {/* Mobile drawer (only when the Beta sidebar exists) */}
        {showBetaSidebar && (
          <MobileSidebarDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
          >
            <BetaSidebar
              basePath={basePath}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </MobileSidebarDrawer>
        )}

        {/* Main content area — error-isolated from sidebar */}
        <BetaErrorBoundary>
          <main
            id="beta-chat-main"
            className="flex-1 overflow-y-auto"
            role="main"
            aria-label={t('beta.a11y.mainChat')}
          >
            {activeTab === 'settings' ? <PreferencesPanel /> : children}
          </main>
        </BetaErrorBoundary>
      </div>
    </BetaChatProvider>
  );
}

/**
 * BetaKeyboardShortcuts - Wires global keyboard shortcuts inside BetaChatProvider.
 * Separate component because it needs access to useBetaChatContext.
 */
function BetaKeyboardShortcuts({ onCloseDrawer, drawerOpen }: { onCloseDrawer: () => void; drawerOpen: boolean }) {
  const { createConversation } = useBetaChatContext();

  useBetaKeyboardShortcuts({
    onNewConversation: createConversation,
    onClose: drawerOpen ? onCloseDrawer : undefined,
  });

  return null;
}

/**
 * MobileNewChatButton - Uses BetaChatContext to create a new conversation.
 * Separate component because it needs to be inside BetaChatProvider.
 */
function MobileNewChatButton() {
  const { t } = useI18n();
  const { createConversation } = useBetaChatContext();

  return (
    <IconButton
      type="button"
      icon={<Plus className="w-5 h-5" weight="bold" />}
      onClick={createConversation}
      variant="ghost"
      aria-label={t('beta.mobile.newChat')}
      className="w-11 h-11 rounded-md text-primary hover:bg-primary-soft"
    />
  );
}
