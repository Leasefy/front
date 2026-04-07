'use client';

import { ChatCircle, GearSix, Lightning, ListChecks, Newspaper, Plus, Sparkle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { AppSwitcher } from './AppSwitcher';
import { ConversationList } from './ConversationList';
import { AgentActivityLog } from './AgentActivityLog';
import { DecisionHistory } from './DecisionHistory';
import { BriefingHistory } from './BriefingHistory';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';

export type BetaTab = 'conversations' | 'agents' | 'decisions' | 'briefing' | 'settings';

interface NavTab {
  id: Exclude<BetaTab, 'settings'>;
  labelKey: string;
  icon: typeof ChatCircle;
}

const NAV_TABS: NavTab[] = [
  { id: 'conversations', labelKey: 'beta.sidebar.conversations', icon: ChatCircle },
  { id: 'agents', labelKey: 'beta.sidebar.agents', icon: Lightning },
  { id: 'decisions', labelKey: 'beta.sidebar.decisions', icon: ListChecks },
  { id: 'briefing', labelKey: 'beta.sidebar.briefing', icon: Newspaper },
];

interface BetaSidebarProps {
  basePath: string;
  activeTab?: BetaTab;
  onTabChange?: (tab: BetaTab) => void;
  className?: string;
}

/**
 * BetaSidebar — Refined sidebar with brand header, compact tab bar,
 * conversation list, and settings at the bottom.
 */
export function BetaSidebar({ basePath, activeTab = 'conversations', onTabChange, className }: BetaSidebarProps) {
  const { t } = useI18n();
  const { createConversation, pendingDecisionsCount, hasNewBriefing, markBriefingSeen } = useBetaChatContext();

  const handleTabChange = (tab: BetaTab) => {
    if (tab === 'briefing') markBriefingSeen();
    onTabChange?.(tab);
  };

  return (
    <aside
      role="navigation"
      aria-label={t('beta.a11y.sidebarNav')}
      className={cn(
        'flex flex-col w-[272px] h-full',
        'bg-white dark:bg-[#141416]',
        'border-r border-neutral-200/80 dark:border-neutral-800/60',
        className
      )}
    >
      {/* Brand header */}
      <div className="px-4 pt-4 pb-3">
        <AppSwitcher basePath={basePath} />
      </div>

      {/* New conversation */}
      <div className="px-4 pb-3">
        <button
          onClick={createConversation}
          className={cn(
            'w-full flex items-center justify-center gap-2',
            'px-4 py-2.5 rounded-xl',
            'text-[13px] font-medium',
            'bg-neutral-900 dark:bg-white',
            'text-white dark:text-neutral-900',
            'hover:bg-neutral-800 dark:hover:bg-neutral-100',
            'active:scale-[0.98]',
            'transition-all duration-150'
          )}
        >
          <Plus className="w-4 h-4" weight="bold" />
          {t('beta.sidebar.newConversation')}
        </button>
      </div>

      {/* Compact icon tab bar */}
      <div className="px-4 pb-2">
        <div
          className="flex items-center gap-0.5 p-1 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/50"
          role="tablist"
          aria-label={t('beta.a11y.sidebarNav')}
        >
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const hasBadge = tab.id === 'decisions' && pendingDecisionsCount > 0;
            const hasDot = tab.id === 'briefing' && hasNewBriefing;

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab.id)}
                title={t(tab.labelKey)}
                className={cn(
                  'relative flex-1 flex items-center justify-center',
                  'py-2 rounded-lg',
                  'transition-all duration-150',
                  isActive
                    ? 'bg-white dark:bg-neutral-700 shadow-sm text-foreground'
                    : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300'
                )}
              >
                <Icon className="w-[17px] h-[17px]" weight={isActive ? 'fill' : 'regular'} />
                {hasBadge && (
                  <span className="absolute -top-1 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-indigo-600 text-white uppercase tracking-wide font-mono text-[10px] font-semibold flex items-center justify-center leading-none">
                    {pendingDecisionsCount}
                  </span>
                )}
                {hasDot && (
                  <span className="absolute top-0.5 right-1.5 w-[5px] h-[5px] rounded-full bg-amber-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden px-3 pt-1 pb-2" role="tabpanel">
        {activeTab === 'conversations' && <ConversationList />}
        {activeTab === 'agents' && <AgentActivityLog />}
        {activeTab === 'decisions' && <DecisionHistory />}
        {activeTab === 'briefing' && <BriefingHistory />}
      </div>

      {/* Bottom: settings + badge */}
      <div className="px-3 pb-3 pt-1 border-t border-neutral-100 dark:border-neutral-800/50">
        <button
          onClick={() => handleTabChange('settings')}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg',
            'text-[13px] transition-colors duration-150',
            activeTab === 'settings'
              ? 'text-foreground font-medium bg-neutral-100 dark:bg-neutral-800'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
          )}
        >
          <GearSix className="w-4 h-4" weight={activeTab === 'settings' ? 'fill' : 'regular'} />
          {t('beta.sidebar.settings')}
        </button>

        <div className="flex items-center justify-center mt-2">
          <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
            <Sparkle className="w-3 h-3" weight="fill" />
            {t('beta.badge')}
          </span>
        </div>
      </div>
    </aside>
  );
}
