'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { BetaSidebar, BetaTab } from './BetaSidebar';
import { BetaChatProvider } from '@/lib/context/BetaChatContext';

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
 * BetaChatProvider wraps all children so chat state persists across
 * tab switches and page navigation within the Beta section.
 */
export function BetaLayout({ children, basePath }: BetaLayoutProps) {
  const [activeTab, setActiveTab] = useState<BetaTab>('conversations');

  const handleTabChange = useCallback((tab: BetaTab) => {
    setActiveTab(tab);
  }, []);

  return (
    <BetaChatProvider>
      <div
        className={cn(
          'fixed inset-0 z-50',
          'flex',
          'bg-plan-page'
        )}
      >
        {/* Mission Control Sidebar - hidden on mobile for now */}
        <div className="hidden md:flex">
          <BetaSidebar
            basePath={basePath}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>

        {/* Main content area (chat area in future phases) */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </BetaChatProvider>
  );
}
