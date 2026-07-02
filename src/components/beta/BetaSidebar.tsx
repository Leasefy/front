'use client';

import { ChatCircle, GearSix, Lightning, ListChecks, Newspaper, Plus, Sparkle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button, Badge } from '@/components/ui';
import { SegmentedControl } from '@leasefy/cadence';
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
        'bg-bg',
        'border-r border-border',
        className
      )}
    >
      {/* Brand header */}
      <div className="px-4 pt-4 pb-3">
        <AppSwitcher basePath={basePath} />
      </div>

      {/* New conversation */}
      <div className="px-4 pb-3">
        <Button
          onClick={createConversation}
          hideArrow
          className="w-full gap-2 rounded-full px-4 py-2.5 h-auto text-[13px]"
        >
          <Plus className="w-4 h-4" weight="bold" />
          {t('beta.sidebar.newConversation')}
        </Button>
      </div>

      {/* Compact icon tab bar — Cadence SegmentedControl (fullWidth, icon+badge labels) */}
      <div className="px-4 pb-2">
        <SegmentedControl<BetaTab>
          fullWidth
          size="md"
          aria-label={t('beta.a11y.sidebarNav')}
          value={activeTab}
          onChange={handleTabChange}
          // ≥44px touch target on coarse pointers (desktop visual unchanged)
          className="w-full [&>button]:[@media(pointer:coarse)]:min-h-11"
          options={NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const hasBadge = tab.id === 'decisions' && pendingDecisionsCount > 0;
            const hasDot = tab.id === 'briefing' && hasNewBriefing;

            return {
              value: tab.id,
              ariaLabel: t(tab.labelKey),
              label: (
                <span className="relative flex items-center justify-center">
                  <Icon className="w-[17px] h-[17px]" weight={isActive ? 'fill' : 'regular'} />
                  {hasBadge && (
                    <span className="absolute -top-2 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white tabular-nums font-mono text-[10px] font-semibold flex items-center justify-center leading-none">
                      {pendingDecisionsCount}
                    </span>
                  )}
                  {hasDot && (
                    <span className="absolute -top-1 -right-0.5 w-[5px] h-[5px] rounded-full bg-warning" />
                  )}
                </span>
              ),
            };
          })}
        />
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden px-3 pt-1 pb-2" role="tabpanel">
        {activeTab === 'conversations' && <ConversationList />}
        {activeTab === 'agents' && <AgentActivityLog />}
        {activeTab === 'decisions' && <DecisionHistory />}
        {activeTab === 'briefing' && <BriefingHistory />}
      </div>

      {/* Bottom: settings + badge */}
      <div className="px-3 pb-3 pt-1 border-t border-border-faint">
        <Button
          variant="ghost"
          onClick={() => handleTabChange('settings')}
          className={cn(
            'w-full justify-start gap-2.5 px-3 py-2 h-auto rounded-full text-[13px]',
            '[@media(pointer:coarse)]:min-h-11',
            activeTab === 'settings'
              ? 'text-primary font-medium bg-accent-soft hover:bg-accent-soft'
              : 'text-fg-muted hover:text-fg hover:bg-surface-muted'
          )}
        >
          <GearSix className="w-4 h-4" weight={activeTab === 'settings' ? 'fill' : 'regular'} />
          {t('beta.sidebar.settings')}
        </Button>

        <div className="flex items-center justify-center mt-2">
          <Badge variant="secondary" className="gap-1 text-[11px] font-medium">
            <Sparkle className="w-3 h-3" weight="fill" />
            {t('beta.badge')}
          </Badge>
        </div>
      </div>
    </aside>
  );
}
