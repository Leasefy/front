'use client';

import { useState, useCallback } from 'react';
import { List, Plus, Sparkle } from '@phosphor-icons/react';
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
export function BetaLayout({ children, basePath }: BetaLayoutProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<BetaTab>('conversations');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleTabChange = useCallback((tab: BetaTab) => {
    setActiveTab(tab);
    setDrawerOpen(false); // Close drawer when navigating on mobile
  }, []);

  return (
    <BetaChatProvider onTabChange={(tab) => setActiveTab(tab as BetaTab)}>
      <BetaKeyboardShortcuts onCloseDrawer={() => setDrawerOpen(false)} drawerOpen={drawerOpen} />
      <div
        className={cn(
          'fixed inset-0 z-50',
          'flex flex-col md:flex-row',
          'bg-[#f5f5f7] dark:bg-[#0c0c0e]'
        )}
      >
        {/* Skip to chat link - visible only on focus for screen readers */}
        <a
          href="#beta-chat-main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white uppercase tracking-wide font-mono focus:rounded-lg focus:text-sm focus:font-medium"
        >
          {t('beta.a11y.skipToChat')}
        </a>
        {/* Mobile header - visible only on mobile */}
        <div
          className={cn(
            'md:hidden flex items-center justify-between',
            'h-12 px-3 flex-shrink-0',
            'border-b border-neutral-200 dark:border-border',
            'bg-white dark:bg-card'
          )}
        >
          {/* Hamburger button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className={cn(
              'w-9 h-9 rounded-lg',
              'flex items-center justify-center',
              'text-muted-foreground hover:text-foreground',
              'hover:bg-neutral-100 dark:hover:bg-neutral-800',
              'transition-colors duration-150'
            )}
            aria-label={t('beta.mobile.openMenu')}
          >
            <List className="w-5 h-5" weight="regular" />
          </button>

          {/* Title */}
          <div className="flex items-center gap-1.5">
            <Sparkle className="w-4 h-4 text-indigo-500" weight="fill" />
            <span className="text-[14px] font-semibold text-foreground">
              {t('beta.title')}
            </span>
          </div>

          {/* New chat button - wired via context inside provider */}
          <MobileNewChatButton />
        </div>

        {/* Desktop sidebar - hidden on mobile, error-isolated */}
        <BetaErrorBoundary>
          <div className="hidden md:flex">
            <BetaSidebar
              basePath={basePath}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </div>
        </BetaErrorBoundary>

        {/* Mobile drawer */}
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
    <button
      onClick={createConversation}
      className={cn(
        'w-9 h-9 rounded-lg',
        'flex items-center justify-center',
        'text-indigo-500 hover:text-indigo-600',
        'hover:bg-indigo-50 dark:hover:bg-indigo-700/10',
        'transition-colors duration-150'
      )}
      aria-label={t('beta.mobile.newChat')}
    >
      <Plus className="w-5 h-5" weight="bold" />
    </button>
  );
}
