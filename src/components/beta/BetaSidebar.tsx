'use client';

import { ChatCircle, GearSix, Lightning, ListChecks, Newspaper, Plus, Sparkle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { AppSwitcher } from './AppSwitcher';
import { ConversationList } from './ConversationList';
import { DecisionHistory } from './DecisionHistory';
import { BriefingHistory } from './BriefingHistory';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';

export type BetaTab = 'conversations' | 'agents' | 'decisions' | 'briefing' | 'settings';

interface TabItem {
  id: BetaTab;
  label: string;
  icon: typeof ChatCircle;
}

const TABS: TabItem[] = [
  { id: 'conversations', label: 'Conversaciones', icon: ChatCircle },
  { id: 'agents', label: 'Agentes', icon: Lightning },
  { id: 'decisions', label: 'Decisiones', icon: ListChecks },
  { id: 'briefing', label: 'Briefing', icon: Newspaper },
  { id: 'settings', label: 'Configuracion', icon: GearSix },
];

interface BetaSidebarProps {
  basePath: string;
  activeTab?: BetaTab;
  onTabChange?: (tab: BetaTab) => void;
  className?: string;
}

/**
 * BetaSidebar - Mission Control sidebar with tabs, conversation list, and AppSwitcher.
 *
 * When "Conversaciones" tab is active, shows the ConversationList below tabs.
 * Other tabs show placeholder content (future phases).
 */
export function BetaSidebar({ basePath, activeTab = 'conversations', onTabChange, className }: BetaSidebarProps) {
  const { createConversation, pendingDecisionsCount, hasNewBriefing, markBriefingSeen } = useBetaChatContext();

  const handleTabChange = (tab: BetaTab) => {
    if (tab === 'briefing') {
      markBriefingSeen();
    }
    onTabChange?.(tab);
  };

  return (
    <aside
      className={cn(
        'flex flex-col w-[260px] h-full',
        'bg-white dark:bg-card',
        'border-r border-neutral-200 dark:border-border',
        className
      )}
    >
      {/* AppSwitcher at top */}
      <div className="px-3 pt-3 pb-2">
        <AppSwitcher basePath={basePath} />
      </div>

      {/* Separator */}
      <div className="mx-3 border-b border-neutral-200 dark:border-border" />

      {/* Tab navigation */}
      <nav className="px-3 py-3">
        <div className="space-y-0.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-[14px]',
                  'transition-colors',
                  isActive
                    ? 'text-foreground font-medium bg-neutral-100 dark:bg-[#1f1f21]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-neutral-50 dark:hover:bg-[#1a1a1c]'
                )}
              >
                <Icon
                  className={cn(
                    'w-[18px] h-[18px]',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                  weight={isActive ? 'fill' : 'regular'}
                />
                <span className="flex-1 text-left">{tab.label}</span>
                {tab.id === 'decisions' && pendingDecisionsCount > 0 && (
                  <span
                    className={cn(
                      'inline-flex items-center justify-center',
                      'min-w-[20px] h-5 px-1.5 rounded-full',
                      'bg-indigo-500 text-white text-[11px] font-semibold',
                      'transition-all duration-200',
                      'animate-in fade-in zoom-in-75'
                    )}
                  >
                    {pendingDecisionsCount}
                  </span>
                )}
                {tab.id === 'briefing' && hasNewBriefing && (
                  <span
                    className={cn(
                      'w-[6px] h-[6px] rounded-full',
                      'bg-amber-500',
                      'transition-all duration-200',
                      'animate-in fade-in zoom-in-75'
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Separator */}
      <div className="mx-3 border-b border-neutral-200 dark:border-border" />

      {/* Tab content area */}
      <div className="flex-1 overflow-hidden px-3 py-3">
        {activeTab === 'conversations' && <ConversationList />}
        {activeTab === 'agents' && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-[13px]">
            Fase 20
          </div>
        )}
        {activeTab === 'decisions' && <DecisionHistory />}
        {activeTab === 'briefing' && (
          <BriefingHistory />
        )}
      </div>

      {/* Bottom section: New conversation + Beta badge */}
      <div className="px-3 pb-3 space-y-3">
        {/* New conversation button */}
        <button
          onClick={createConversation}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl',
            'text-[13px] font-medium',
            'text-indigo-600 dark:text-indigo-400',
            'bg-indigo-50 dark:bg-indigo-500/10',
            'hover:bg-indigo-100 dark:hover:bg-indigo-500/20',
            'border border-indigo-200/60 dark:border-indigo-500/20',
            'transition-colors'
          )}
        >
          <Plus className="w-4 h-4" weight="bold" />
          <span>Nueva conversacion</span>
        </button>

        {/* Beta badge */}
        <div className="flex items-center justify-center">
          <span
            className={cn(
              'inline-flex items-center gap-1.5',
              'bg-indigo-500/10 text-indigo-500',
              'text-xs font-medium px-2.5 py-1 rounded-full'
            )}
          >
            <Sparkle className="w-3 h-3" weight="fill" />
            Beta
          </span>
        </div>
      </div>
    </aside>
  );
}
